import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'

/**
 * configure() (§5.1) uses REPLACE semantics: each call sets the whole config; configure({})
 * restores defaults (format auto, default sink, TTY colors, diff time). Format resolution:
 * configure({format}) > MODERN_DEBUG_FORMAT > auto (TTY → pretty, else NDJSON, LD-10).
 */
const sunk: string[] = []
const sink = (line: string): void => {
  sunk.push(line)
}

beforeEach(() => {
  disable()
  sunk.length = 0
  configure({ sink })
})

afterEach(() => {
  configure({})
  disable()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('configure(): sinks and format resolution', () => {
  it('auto resolves to NDJSON when stderr is not a TTY (LD-10)', () => {
    enable('app')
    createDebug('app')('hello')
    const parsed = JSON.parse(sunk[0] as string) as Record<string, unknown>
    expect(parsed.ns).toBe('app')
    expect(parsed.msg).toBe('hello')
    expect(typeof parsed.t).toBe('number')
  })

  it('sink receives raw lines without trailing newline', () => {
    enable('app')
    createDebug('app')('hello')
    expect(sunk[0]?.endsWith('\n')).toBe(false)
  })

  it('explicit pretty format', () => {
    configure({ sink, format: 'pretty' })
    enable('app')
    createDebug('app')('hi')
    expect(sunk[0]).toBe('app hi +0ms')
  })

  it('MODERN_DEBUG_FORMAT overrides auto (LD-10)', () => {
    vi.stubEnv('MODERN_DEBUG_FORMAT', 'pretty')
    configure({ sink })
    enable('app')
    createDebug('app')('hi')
    expect(sunk[0]).toBe('app hi +0ms')
  })

  it('invalid MODERN_DEBUG_FORMAT is ignored', () => {
    vi.stubEnv('MODERN_DEBUG_FORMAT', 'yaml')
    configure({ sink })
    enable('app')
    createDebug('app')('hi')
    expect(() => JSON.parse(sunk[0] as string)).not.toThrow()
  })

  it('configure({format}) beats MODERN_DEBUG_FORMAT', () => {
    vi.stubEnv('MODERN_DEBUG_FORMAT', 'pretty')
    configure({ sink, format: 'ndjson' })
    enable('app')
    createDebug('app')('hi')
    expect(() => JSON.parse(sunk[0] as string)).not.toThrow()
  })

  it('colors:true forces ANSI in pretty mode without a TTY', () => {
    configure({ sink, format: 'pretty', colors: true })
    enable('app')
    createDebug('app')('hi')
    expect(sunk[0]?.startsWith('[38;5;')).toBe(true)
  })

  it("time:'none' omits the diff suffix", () => {
    configure({ sink, format: 'pretty', time: 'none' })
    enable('app')
    createDebug('app')('hi')
    expect(sunk[0]).toBe('app hi')
  })

  it("time:'epoch' renders @epoch-ms instead of the diff", () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456)
    configure({ sink, format: 'pretty', time: 'epoch' })
    enable('app')
    createDebug('app')('hi')
    expect(sunk[0]).toBe('app hi @123456')
  })

  it('colored pretty line has the exact LD-06 shape (bold ns prefix, colored +Nms)', () => {
    configure({ sink, format: 'pretty', colors: true })
    enable('app:db')
    createDebug('app:db')('hello')
    expect(sunk[0]).toBe('[38;5;199;1mapp:db[0m hello [38;5;199m+0ms[0m')
  })

  it('configure() re-binds instances created earlier', () => {
    configure({ sink, format: 'pretty' })
    enable('app')
    const d = createDebug('app')
    d('one')
    const late: string[] = []
    configure({
      sink: (line) => {
        late.push(line)
      },
      format: 'pretty',
    })
    d('two')
    expect(sunk).toEqual(['app one +0ms'])
    expect(late).toEqual(['app two +0ms'])
  })

  it('configure({}) restores the default stderr sink with trailing newline (LD-11)', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    configure({})
    enable('app')
    createDebug('app')('hi')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(String(spy.mock.calls[0]?.[0]).endsWith('\n')).toBe(true)
  })
})
