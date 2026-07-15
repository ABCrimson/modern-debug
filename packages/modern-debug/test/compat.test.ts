import { beforeAll, describe, expect, it, vi } from 'vitest'

/** §5.2 compat API surface — everything debug 4.4.3 exposes that isn't format output. */
interface CompatModule {
  default: ((ns: string) => CompatFn) & {
    debug: unknown
    default: unknown
    enable(pattern: string): void
    disable(): string
    enabled(ns: string): boolean
    names: string[]
    skips: string[]
    humanize(ms: number): string
    coerce(v: unknown): unknown
    selectColor(ns: string): number | string
    colors: number[]
    formatters: Record<string, (this: CompatFn, v: unknown) => string>
    load(): string | undefined
  }
}
interface CompatFn {
  (...args: unknown[]): void
  namespace: string
  enabled: boolean
  color: number | string
  log?: (...args: unknown[]) => unknown
  extend(ns: string, delimiter?: string): CompatFn
  destroy(): boolean
}

let compat: CompatModule['default']

beforeAll(async () => {
  vi.stubEnv('DEBUG', undefined)
  vi.stubEnv('DEBUG_HIDE_DATE', 'true')
  vi.stubEnv('DEBUG_COLORS', 'false')
  vi.resetModules()
  compat = ((await import('../src/compat.ts')) as unknown as CompatModule).default
})

describe('compat module surface', () => {
  it('default export is the factory with debug/default self-references', () => {
    expect(typeof compat).toBe('function')
    expect(compat.debug).toBe(compat)
    expect(compat.default).toBe(compat)
  })

  it('enable() populates names/skips as template arrays; disable() reconstructs', () => {
    compat.enable('a,b,-c')
    expect(compat.names).toEqual(['a', 'b'])
    expect(compat.skips).toEqual(['c'])
    expect(compat.enabled('a')).toBe(true)
    expect(compat.enabled('c')).toBe(false)
    expect(compat.disable()).toBe('a,b,-c')
    expect(compat.enabled('a')).toBe(false)
  })

  it('save/load persist through process.env.DEBUG (debug parity)', () => {
    compat.enable('persist:*')
    expect(process.env.DEBUG).toBe('persist:*')
    compat.disable()
    expect(process.env.DEBUG).toBeUndefined()
  })

  it('load() never touches localStorage while process.env exists (G-14: Node ≥26 warns)', async () => {
    const getItem = vi.fn((): string => 'ls:*')
    vi.stubEnv('DEBUG', undefined)
    vi.stubGlobal('localStorage', { getItem })
    vi.resetModules()
    try {
      // Module init runs enable(load() ?? '') — with DEBUG unset the storage rung must
      // stay untouched on env-bearing runtimes, exactly like debug 4.4.3's node build.
      const fresh = ((await import('../src/compat.ts')) as unknown as CompatModule).default
      expect(getItem).not.toHaveBeenCalled()
      expect(fresh.load()).toBeUndefined()
      expect(getItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  it('humanize is ms fmtShort-compatible', () => {
    const table: [number, string][] = [
      [0, '0ms'],
      [999, '999ms'],
      [1000, '1s'],
      [1500, '2s'],
      [60000, '1m'],
      [90000, '2m'],
      [3600000, '1h'],
      [86400000, '1d'],
    ]
    for (const [ms, expected] of table) {
      expect(compat.humanize(ms), String(ms)).toBe(expected)
    }
  })

  it('coerce turns Errors into their stack', () => {
    const err = new Error('x')
    err.stack = 'STACK'
    expect(compat.coerce(err)).toBe('STACK')
    expect(compat.coerce('plain')).toBe('plain')
  })

  it('selectColor implements the LD-06 hash over the live colors array', () => {
    const d = compat('app:db')
    expect(d.color).toBe(compat.selectColor('app:db'))
    expect(compat.colors).toContain(d.color)
  })
})

describe('compat instance surface', () => {
  it('exposes namespace and a live cached enabled getter', () => {
    const d = compat('inst')
    expect(d.namespace).toBe('inst')
    expect(d.enabled).toBe(false)
    compat.enable('inst')
    expect(d.enabled).toBe(true)
    compat.enable('other')
    expect(d.enabled).toBe(false)
    compat.disable()
  })

  it('enabled setter overrides the matcher until reset to null', () => {
    const d = compat('override')
    d.enabled = true
    expect(d.enabled).toBe(true)
    compat.enable('override')
    d.enabled = false
    expect(d.enabled).toBe(false)
    // Reads are typed boolean (@types/debug parity, G-14); the null-clearing write is the
    // same cast it is under @types/debug.
    ;(d as { enabled: boolean | null }).enabled = null
    expect(d.enabled).toBe(true)
    compat.disable()
  })

  it('extend() joins with ":" by default and inherits the log override', () => {
    const logs: unknown[][] = []
    const parent = compat('p')
    parent.log = (...args: unknown[]) => {
      logs.push(args)
    }
    const child = parent.extend('c')
    expect(child.namespace).toBe('p:c')
    expect(child.log).toBe(parent.log)
    expect(parent.extend('c', '/').namespace).toBe('p/c')
  })

  it('log override intercepts output (formatArgs-processed args)', () => {
    const logs: unknown[][] = []
    compat.enable('cap')
    const d = compat('cap')
    d.log = (...args: unknown[]) => {
      logs.push(args)
    }
    d('%s message', 'my')
    compat.disable()
    expect(logs).toHaveLength(1)
    expect(String(logs[0]?.[0])).toContain('cap')
    expect(String(logs[0]?.[0])).toContain('%s message')
  })

  it('custom formatters are applied and consume their argument', () => {
    const logs: unknown[][] = []
    compat.formatters.x = (v: unknown) => `X:${String(v)}`
    compat.enable('fmt')
    const d = compat('fmt')
    d.log = (...args: unknown[]) => {
      logs.push(args)
    }
    d('%x end', 7)
    compat.disable()
    expect(String(logs[0]?.[0])).toContain('X:7 end')
    expect(logs[0]).toHaveLength(1)
  })

  it('disabled instances do nothing (no throw, no output)', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    compat('silent')('nope %s', 'x')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('destroy() exists for API compatibility', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(typeof compat('d').destroy).toBe('function')
    compat('d').destroy()
    warn.mockRestore()
  })
})
