import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * §5.4 on raw workerd: /node requires the nodejs_compat flag. With the flag, scope() works;
 * without it, the import fails loudly while core keeps working. Dist files (including hashed
 * shared chunks) are fed to workerd verbatim.
 */
const distDir = fileURLToPath(new URL('../../packages/modern-debug/dist/', import.meta.url))
const distModules = readdirSync(distDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({
    type: 'ESModule' as const,
    path: f,
    contents: readFileSync(`${distDir}${f}`, 'utf8'),
  }))

const WORKER = `
import { configure, createDebug, enable, disable } from './index.js'
export default {
  async fetch() {
    const out = { core: '', node: '' }
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
    } catch (e) {
      out.node = 'rejected'
    }
    return new Response(JSON.stringify(out))
  }
}
`

const boot = (compatFlags: string[]): Miniflare =>
  new Miniflare({
    compatibilityDate: '2026-07-01',
    compatibilityFlags: compatFlags,
    modules: [{ type: 'ESModule', path: 'worker.mjs', contents: WORKER }, ...distModules],
  })

const instances: Miniflare[] = []

afterAll(async () => {
  await Promise.all(instances.map((mf) => mf.dispose()))
})

describe('raw workerd — nodejs_compat presence and absence (§5.4)', () => {
  it('with nodejs_compat: core works and /node resolves', async () => {
    const mf = boot(['nodejs_compat'])
    instances.push(mf)
    const res = await mf.dispatchFetch('http://x/')
    const body = (await res.json()) as { core: string; node: string }
    expect(body.core).toBe('ok')
    expect(body.node).toBe('resolved:function')
  })

  it('without nodejs_compat: core still works, /node import rejects', async () => {
    const mf = boot([])
    instances.push(mf)
    const res = await mf.dispatchFetch('http://x/')
    const body = (await res.json()) as { core: string; node: string }
    expect(body.core).toBe('ok')
    expect(body.node).toBe('rejected')
  })
})
