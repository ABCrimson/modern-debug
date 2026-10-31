import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'
import { safeJson } from '../src/json.ts'

const MARKER = '{"$fields":"unserializable"}'

// An own toJSON can make JSON.stringify return a non-object (or undefined); the fields
// envelope must stay an object so NDJSON lines parse and pretty lines never print 'undefined'.
const hostileToJson = [
  ['a string', 'abc'],
  ['an array', [1, 2]],
  ['undefined', undefined],
] as const

describe('safeJson (LD-07 fields envelope guard)', () => {
  it('serializes plain objects unchanged', () => {
    expect(safeJson({ rows: 3, ok: true })).toBe('{"rows":3,"ok":true}')
    expect(safeJson({})).toBe('{}')
  })

  it.for(hostileToJson)('an own toJSON returning %s degrades to the marker', ([, out]) => {
    expect(safeJson({ toJSON: () => out })).toBe(MARKER)
  })

  it('BigInt and circular refs degrade to the marker', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(safeJson({ id: 10n })).toBe(MARKER)
    expect(safeJson(circular)).toBe(MARKER)
  })
})

describe('pretty path prints the marker for a non-object toJSON', () => {
  let spy: MockInstance

  beforeEach(() => {
    disable()
    configure({ format: 'pretty', colors: false, time: 'none' })
    spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    configure({})
    disable()
  })

  it.for(hostileToJson)('toJSON returning %s', ([, out]) => {
    enable('app')
    createDebug('app')('hi', { toJSON: () => out })
    expect(spy.mock.calls.map((call) => String(call[0]))).toEqual([`app hi ${MARKER}\n`])
  })
})
