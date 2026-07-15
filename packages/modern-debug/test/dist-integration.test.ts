import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The hooks module must land in ONE shared chunk of the built dist — if rolldown inlined a
 * copy per entry, /node's registration would never reach core's emit path. This exercises
 * the real published artifacts (turbo orders build before test).
 */
describe('built dist wiring', () => {
  it('dist entries share hook state through the common chunk', async () => {
    const core = await import('../dist/index.js')
    const node = await import('../dist/node.js')
    const sunk: string[] = []
    core.configure({
      sink: (line: string) => {
        sunk.push(line)
      },
      format: 'ndjson',
    })
    core.enable('dist')
    node.scope({ req: 'x' }, () => {
      core.createDebug('dist')('m')
    })
    core.configure({})
    core.disable()
    expect((JSON.parse(sunk[0] as string) as Record<string, unknown>).req).toBe('x')
  })

  it('compat and compat-cjs share one implementation chunk (G-14: alias twin of the hooks guard)', async () => {
    // Static: both entries must import the same ./compat-*.js chunk — a per-entry copy
    // would give require('debug') and import('modern-debug/compat') divergent state.
    const dir = fileURLToPath(new URL('../dist/', import.meta.url))
    const chunkOf = (file: string): string | undefined =>
      readFileSync(`${dir}${file}`, 'utf8').match(/from\s*["'](\.\/compat-[^"']+\.js)["']/)?.[1]
    const viaCompat = chunkOf('compat.js')
    const viaCjs = chunkOf('compat-cjs.js')
    expect(viaCompat).toBeDefined()
    expect(viaCjs).toBe(viaCompat)

    // Behavioral: the "." require condition and the /compat import see one instance.
    // Must run under Node's native loader — in-process, vitest's Vite pipeline would load
    // the chunk a second time and mask a real split.
    const probe = [
      "const viaRequire = require('modern-debug')",
      "import('./dist/compat.js').then((m) => {",
      '  const viaImport = m.default',
      "  viaRequire.enable('twin:*')",
      "  if (viaImport.enabled('twin:x') !== true) throw new Error('require->import split')",
      '  viaImport.disable()',
      "  if (viaRequire.enabled('twin:x') !== false) throw new Error('import->require split')",
      '})',
    ].join('\n')
    const child = spawnSync(process.execPath, ['-e', probe], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      encoding: 'utf8',
    })
    expect(child.stderr).toBe('')
    expect(child.status).toBe(0)
  })
})
