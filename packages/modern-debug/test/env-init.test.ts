import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * LD-09 top rung integration + LD-15: the matcher singleton initializes lazily from the
 * env ladder on first use. Fresh module instances via resetModules + dynamic import.
 */
describe('lazy env-ladder initialization', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('picks up process.env.DEBUG on first use', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', 'lazy:*')
    const core = await import('../src/index.ts')
    expect(core.enabled('lazy:x')).toBe(true)
    expect(core.enabled('other')).toBe(false)
  })

  it('is disabled when no env rung is set', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', undefined)
    const core = await import('../src/index.ts')
    expect(core.enabled('anything')).toBe(false)
  })

  it('explicit enable() outranks the env ladder (LD-09)', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', 'env:*')
    const core = await import('../src/index.ts')
    core.enable('manual:*')
    expect(core.enabled('manual:x')).toBe(true)
    expect(core.enabled('env:x')).toBe(false)
  })

  it('falls back to re-check-on-call when WeakRef is unavailable (§6)', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', undefined)
    vi.stubGlobal('WeakRef', undefined)
    const core = await import('../src/index.ts')
    vi.unstubAllGlobals()
    const sunk: string[] = []
    core.configure({
      sink: (line) => {
        sunk.push(line)
      },
      format: 'pretty',
    })
    const d = core.createDebug('wr')
    d('off')
    core.enable('wr')
    d('on')
    expect(sunk).toEqual(['wr on +0ms'])
    core.configure({})
    core.disable()
  })
})
