import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Discriminating regressions for the G-08 hardening (round three, G-14): each test fails
 * if its fix is reverted — round three found all three were previously untested (deleting
 * the code left the whole suite green). Fresh module instances via resetModules + import.
 */

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('amortized registry sweep (G-08)', () => {
  it('evicts dead WeakRefs on the 256th createDebug without enable()', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', undefined)
    const refs: { dead: boolean; derefs: number }[] = []
    class FakeWeakRef<T extends object> {
      readonly #target: T
      dead = false
      derefs = 0
      constructor(target: T) {
        this.#target = target
        refs.push(this)
      }
      deref(): T | undefined {
        this.derefs++
        return this.dead ? undefined : this.#target
      }
    }
    vi.stubGlobal('WeakRef', FakeWeakRef)
    const core = await import('../src/index.ts')
    // Keep the stub active: makeFn news up the *global* WeakRef per createDebug call.

    core.createDebug('sweep:0')
    const [dead] = refs
    if (!dead) throw new Error('registry recorded no WeakRef')
    dead.dead = true // simulate GC collecting the first fn
    for (let i = 1; i < 256; i++) core.createDebug(`sweep:${i}`) // sweep fires at size 256

    const derefsAfterSweep = dead.derefs
    core.enable('sweep:none') // rebind pass walks the registry
    // Swept entries are gone — enable() never touches the dead ref again. With the sweep
    // deleted, the dead ref stays registered and this deref count rises.
    expect(dead.derefs).toBe(derefsAfterSweep)
    core.disable()
    vi.unstubAllGlobals()
  })
})

describe('WeakRef-absent fallback (§6 / G-08)', () => {
  it('holds no strong refs — instances stay collectible', async () => {
    vi.resetModules()
    vi.stubEnv('DEBUG', undefined)
    vi.stubGlobal('WeakRef', undefined)
    const core = await import('../src/index.ts')
    vi.unstubAllGlobals()

    // --expose-gc is wired via poolOptions.forks.execArgv in vitest.config.ts.
    expect(typeof globalThis.gc).toBe('function')
    let collected = false
    const watcher = new FinalizationRegistry(() => {
      collected = true
    })
    ;(() => {
      const d = core.createDebug('gc:probe')
      d('exercises the re-check-on-call path while disabled')
      watcher.register(d, 'gc:probe')
    })()
    for (let i = 0; i < 50 && !collected; i++) {
      globalThis.gc?.()
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    // The pre-G-08 fallback kept a permanent strong ref — never collected, test red.
    expect(collected).toBe(true)
  })
})

describe('LD-11 default sink detect (G-08)', () => {
  it('non-callable process.stderr.write falls back to console.error at module load', async () => {
    vi.resetModules()
    const env = { ...process.env }
    delete env.DEBUG
    delete env.MODERN_DEBUG_FORMAT
    const fakeProcess = { ...process, env, stderr: { write: 'not-a-function', isTTY: false } }
    vi.stubGlobal('process', fakeProcess)
    const core = await import('../src/index.ts')
    vi.unstubAllGlobals()

    const lines: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      lines.push(args[0])
    })
    try {
      core.enable('sink:probe')
      core.createDebug('sink:probe')('hello')
    } finally {
      spy.mockRestore()
      core.configure({})
      core.disable()
    }
    // A reverted truthiness detect picks the stderr branch (writes to the real stderr at
    // call time) and console.error never fires.
    expect(lines).toHaveLength(1)
    expect(String(lines[0])).toContain('sink:probe')
    expect(String(lines[0])).toContain('hello')
  })
})
