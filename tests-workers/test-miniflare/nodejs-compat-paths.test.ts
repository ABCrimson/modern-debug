import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'
import { afterAll, describe, expect, it } from 'vitest'
import { COMPATIBILITY_DATE } from '../workerd-compat.ts'

/**
 * §5.4 on raw workerd: /node imports only AsyncLocalStorage from node:async_hooks, so it
 * needs Node.js compatibility OR the narrower nodejs_als flag. With either, scope() works
 * and its fields survive an await; with neither, the import fails loudly while core keeps
 * working. Dist files (including hashed shared chunks) are fed to workerd verbatim.
 *
 * Measured 2026-10-30 (miniflare 5.20261023.3-beta, workerd 1.20261023.1): from compat date
 * 2026-08-04 workerd turns Node.js compatibility on by default, so omitting flags no longer
 * gives the absence path. It now needs both opt-outs, no_nodejs_compat and
 * no_nodejs_compat_v2; no_nodejs_compat alone still leaves process and node:async_hooks.
 */
const distDir = fileURLToPath(new URL('../../packages/modern-debug/dist/', import.meta.url))
const distModules = Object.fromEntries(
  readdirSync(distDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => [f, { type: 'esm' as const, contents: readFileSync(`${distDir}${f}`, 'utf8') }]),
)

const WORKER = `
import { configure, createDebug, enable, disable } from './index.js'
export default {
  async fetch() {
    const out = { core: '', node: '', scoped: null }
    const sunk = []
    configure({ sink: (l) => sunk.push(l), format: 'ndjson' })
    enable('mf')
    createDebug('mf')('hello')
    configure({})
    disable()
    out.core = JSON.parse(sunk[0]).ns === 'mf' ? 'ok' : 'broken'
    try {
      const mod = await import('./node.js')
      out.node = 'resolved:' + typeof mod.scope
      out.scoped = await mod.scope({ req: 'r1' }, async () => {
        await new Promise((r) => setTimeout(r, 1))
        return mod.scopeFields()
      })
    } catch (e) {
      out.node = 'rejected'
    }
    return new Response(JSON.stringify(out))
  }
}
`

interface WorkerReport {
  core: string
  node: string
  scoped: Record<string, unknown> | null
}

const boot = (compatFlags: string[]): Miniflare =>
  new Miniflare({
    workers: [
      {
        config: {
          name: 'nodejs-compat-paths',
          compatibilityDate: COMPATIBILITY_DATE,
          compatibilityFlags: compatFlags,
          manifest: {
            mainModule: 'worker.mjs',
            modules: { 'worker.mjs': { type: 'esm', contents: WORKER }, ...distModules },
          },
        },
      },
    ],
  })

const NO_NODE = ['no_nodejs_compat', 'no_nodejs_compat_v2']

const instances: Miniflare[] = []

afterAll(async () => {
  await Promise.all(instances.map((mf) => mf.dispose()))
})

const run = async (compatFlags: string[]): Promise<WorkerReport> => {
  const mf = boot(compatFlags)
  instances.push(mf)
  const res = await mf.dispatchFetch('http://x/')
  return (await res.json()) as WorkerReport
}

describe('raw workerd — nodejs_compat / nodejs_als presence and absence (§5.4)', () => {
  it('with nodejs_compat: core works, /node resolves, scope fields cross an await', async () => {
    const body = await run(['nodejs_compat'])
    expect(body.core).toBe('ok')
    expect(body.node).toBe('resolved:function')
    expect(body.scoped).toEqual({ req: 'r1' })
  })

  it('with no flags at this compat date: Node.js compatibility is on by default', async () => {
    const body = await run([])
    expect(body.core).toBe('ok')
    expect(body.node).toBe('resolved:function')
    expect(body.scoped).toEqual({ req: 'r1' })
  })

  it('with nodejs_als only: core works, /node resolves, scope fields cross an await', async () => {
    const body = await run([...NO_NODE, 'nodejs_als'])
    expect(body.core).toBe('ok')
    expect(body.node).toBe('resolved:function')
    expect(body.scoped).toEqual({ req: 'r1' })
  })

  it('with Node.js compatibility opted out and no nodejs_als: core works, /node rejects', async () => {
    const body = await run(NO_NODE)
    expect(body.core).toBe('ok')
    expect(body.node).toBe('rejected')
    expect(body.scoped).toBeNull()
  })
})
