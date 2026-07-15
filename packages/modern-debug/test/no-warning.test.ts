import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Round-three regression (DECISIONS G-14): with DEBUG unset — the default state of every
 * production process — importing any entry (or requiring the alias) must write nothing to
 * stderr. Node ≥26 emits ExperimentalWarning on bare globalThis.localStorage access, and
 * real debug 4.4.3 is silent at load; a diagnostic library must not announce itself.
 * Exercises the built dist end-to-end in child processes (turbo orders build before test).
 */
const pkgRoot = fileURLToPath(new URL('..', import.meta.url))

function run(args: string[]): { status: number | null; stderr: string } {
  const env = { ...process.env }
  delete env.DEBUG
  delete env.MODERN_DEBUG_FORMAT
  const { status, stderr } = spawnSync(process.execPath, args, {
    cwd: pkgRoot,
    env,
    encoding: 'utf8',
  })
  return { status, stderr }
}

describe('DEBUG-unset startup is warning-free (debug 4.4.3 parity)', () => {
  it('core: import + createDebug + disabled call emits nothing', () => {
    const r = run([
      '--input-type=module',
      '-e',
      "const m = await import('./dist/index.js'); m.createDebug('probe')('off')",
    ])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })

  it('compat entry loads silently', () => {
    const r = run(['--input-type=module', '-e', "await import('./dist/compat.js')"])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })

  it('the "." require alias loads silently', () => {
    const r = run(['-e', "require('modern-debug')('probe:x')('off')"])
    expect(r.stderr).toBe('')
    expect(r.status).toBe(0)
  })
})
