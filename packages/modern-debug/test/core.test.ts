import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { configure, createDebug, disable, enable, enabled } from '../src/index.ts'

let spy: MockInstance

beforeEach(() => {
  disable()
  // This suite targets core semantics; format resolution has its own suite (configure.test.ts).
  configure({ format: 'pretty' })
  spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
})

afterEach(() => {
  vi.restoreAllMocks()
  configure({})
  disable()
})

const lines = (): string[] => spy.mock.calls.map((call) => String(call[0]))

describe('createDebug core (§5.1)', () => {
  it('is disabled by default and emits nothing', () => {
    const d = createDebug('quiet')
    d('nope')
    expect(spy).not.toHaveBeenCalled()
    expect(d.enabled).toBe(false)
  })

  it('exposes ns', () => {
    expect(createDebug('app:db').ns).toBe('app:db')
  })

  it('enable() re-binds instances created before the call (§6 registry)', () => {
    const d = createDebug('app')
    d('before')
    enable('app')
    d('after')
    expect(lines()).toEqual(['app after +0ms\n'])
  })

  it('enable() with a non-matching pattern deactivates live instances', () => {
    const d = createDebug('app')
    enable('app')
    d('one')
    enable('other')
    d('two')
    expect(lines()).toEqual(['app one +0ms\n'])
  })

  it('.enabled is a live getter against the matcher', () => {
    const d = createDebug('live')
    expect(d.enabled).toBe(false)
    enable('live')
    expect(d.enabled).toBe(true)
    disable()
    expect(d.enabled).toBe(false)
  })

  it('module-level enabled()', () => {
    enable('a:*')
    expect(enabled('a:b')).toBe(true)
    expect(enabled('b')).toBe(false)
  })

  it('disable() returns the previous normalized pattern (debug parity)', () => {
    enable(' a , b ,-c ')
    expect(disable()).toBe('a,b,-c')
    expect(enabled('a')).toBe(false)
  })

  it('extend() appends with ":" by default and children obey the matcher', () => {
    const child = createDebug('app').extend('db')
    expect(child.ns).toBe('app:db')
    enable('app:*')
    expect(child.enabled).toBe(true)
  })

  it('extend() honors a custom delimiter', () => {
    expect(createDebug('app').extend('db', '/').ns).toBe('app/db')
  })

  it('extend() inherits base fields from a prior fields() call', () => {
    enable('app:sub')
    const child = createDebug('app').fields({ req: '1' }).extend('sub')
    child('hello')
    expect(lines()).toEqual(['app:sub hello {"req":"1"} +0ms\n'])
  })

  it('fields() returns a child carrying merged base fields', () => {
    enable('app')
    const d = createDebug('app').fields({ req: '1' })
    d('hi', { x: 2 })
    expect(lines()).toEqual(['app hi {"req":"1","x":2} +0ms\n'])
  })

  it('call-site fields override base fields on key conflict', () => {
    enable('app')
    const d = createDebug('app').fields({ req: '1' })
    d('hi', { req: '2' })
    expect(lines()).toEqual(['app hi {"req":"2"} +0ms\n'])
  })

  it('hostile field getters never crash the caller (last-resort emit guard)', () => {
    enable('app')
    const d = createDebug('app').fields({ base: 1 })
    const hostile = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        throw new Error('boom')
      },
    })
    expect(() => d('hi', hostile as never)).not.toThrow()
  })

  it('null fields from JS callers render like absent fields (pretty path)', () => {
    enable('app')
    createDebug('app')('hi', null as never)
    expect(lines()).toEqual(['app hi +0ms\n'])
  })

  it('unserializable fields never crash the caller (pretty path)', () => {
    enable('app')
    const d = createDebug('app')
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => d('hi', { id: 10n, circular })).not.toThrow()
    expect(lines()).toEqual(['app hi {"$fields":"unserializable"} +0ms\n'])
  })

  it('fractional diffs round to integer ms', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1004.6)
    enable('t')
    const d = createDebug('t')
    d('one')
    d('two')
    expect(lines()[1]).toBe('t two +5ms\n')
  })

  it('first call is +0ms, later calls carry the performance.now diff (LD-17)', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1005.4)
    enable('t')
    const d = createDebug('t')
    d('one')
    d('two')
    expect(lines()).toEqual(['t one +0ms\n', 't two +5ms\n'])
  })
})
