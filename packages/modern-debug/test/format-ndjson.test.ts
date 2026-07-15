import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatNdjson } from '../src/format-ndjson.ts'

const T = 1752170000000

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(T)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LD-07 NDJSON record', () => {
  it('envelope shape and fixed key order', () => {
    expect(formatNdjson('app:db', 'query ok', undefined, undefined, undefined, undefined)).toBe(
      `{"t":${T},"ns":"app:db","msg":"query ok"}`,
    )
  })

  it('sev serializes after msg', () => {
    expect(formatNdjson('a', 'm', 40, undefined, undefined, undefined)).toBe(
      `{"t":${T},"ns":"a","msg":"m","sev":40}`,
    )
  })

  it('trace correlation ids serialize after sev', () => {
    expect(formatNdjson('a', 'm', 50, 'abc123', 'def456', undefined)).toBe(
      `{"t":${T},"ns":"a","msg":"m","sev":50,"trace_id":"abc123","span_id":"def456"}`,
    )
  })

  it('trace ids serialize without sev', () => {
    expect(formatNdjson('a', 'm', undefined, 'abc', 'def', undefined)).toBe(
      `{"t":${T},"ns":"a","msg":"m","trace_id":"abc","span_id":"def"}`,
    )
  })

  it('user fields spread flat after the envelope', () => {
    expect(formatNdjson('a', 'm', undefined, undefined, undefined, { rows: 3, ok: true })).toBe(
      `{"t":${T},"ns":"a","msg":"m","rows":3,"ok":true}`,
    )
  })

  it('empty fields object adds nothing', () => {
    expect(formatNdjson('a', 'm', undefined, undefined, undefined, {})).toBe(
      `{"t":${T},"ns":"a","msg":"m"}`,
    )
  })

  it('reserved envelope keys in user fields are dropped (envelope wins)', () => {
    const line = formatNdjson('a', 'm', undefined, undefined, undefined, {
      t: 1,
      ns: 'x',
      msg: 'y',
      sev: 2,
      trace_id: 'z',
      span_id: 'w',
      keep: 'v',
    })
    expect(JSON.parse(line)).toEqual({ t: T, ns: 'a', msg: 'm', keep: 'v' })
  })

  it('escapes quotes, backslashes and control chars in ns and msg', () => {
    const line = formatNdjson('a"b\\c', 'line1\nline2\ttab', undefined, undefined, undefined, {
      note: 'quote " here',
    })
    expect(line.includes('\n')).toBe(false)
    expect(JSON.parse(line)).toEqual({
      t: T,
      ns: 'a"b\\c',
      msg: 'line1\nline2\ttab',
      note: 'quote " here',
    })
  })

  it('lone surrogates escape to well-formed JSON (ES2019 stringify parity)', () => {
    const line = formatNdjson('a', 'ok\uD800end', undefined, undefined, undefined, undefined)
    expect(line).toBe(`{"t":${T},"ns":"a","msg":"ok\\ud800end"}`)
    expect(JSON.parse(line)).toEqual({ t: T, ns: 'a', msg: 'ok\uD800end' })
  })

  it('null fields (JS callers) behave like absent fields instead of throwing', () => {
    expect(formatNdjson('a', 'm', undefined, undefined, undefined, null as never)).toBe(
      `{"t":${T},"ns":"a","msg":"m"}`,
    )
  })

  it('a throwing field getter degrades to the marker instead of crashing the caller', () => {
    const hostile = Object.defineProperty({}, 'trace_id', {
      enumerable: true,
      get() {
        throw new Error('hostile getter')
      },
    }) as Record<string, unknown>
    expect(JSON.parse(formatNdjson('a', 'm', undefined, undefined, undefined, hostile))).toEqual({
      t: T,
      ns: 'a',
      msg: 'm',
      $fields: 'unserializable',
    })
  })

  it('unserializable fields never throw — record degrades to a marker', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    for (const fields of [{ id: 10n }, { circular }]) {
      const line = formatNdjson('a', 'm', undefined, undefined, undefined, fields)
      expect(JSON.parse(line)).toEqual({ t: T, ns: 'a', msg: 'm', $fields: 'unserializable' })
    }
  })

  it('round-trips arbitrary fields and never emits raw newlines (§8.2b)', () => {
    const reserved = ['t', 'ns', 'msg', 'sev', 'trace_id', 'span_id']
    const key = fc.string({ minLength: 1, maxLength: 8 }).filter((k) => !reserved.includes(k))
    fc.assert(
      fc.property(
        fc.string({ maxLength: 20 }),
        fc.string({ maxLength: 40 }),
        fc.dictionary(key, fc.jsonValue({ maxDepth: 2 }), { maxKeys: 6 }),
        (ns, msg, fields) => {
          const line = formatNdjson(ns, msg, undefined, undefined, undefined, fields)
          expect(line.includes('\n')).toBe(false)
          const parsed = JSON.parse(line) as Record<string, unknown>
          expect(parsed.ns).toBe(ns)
          expect(parsed.msg).toBe(msg)
          expect(parsed.t).toBe(T)
          const expected = JSON.parse(JSON.stringify(fields)) as Record<string, unknown>
          for (const [k, v] of Object.entries(expected)) {
            expect(parsed[k]).toEqual(v)
          }
        },
      ),
      { numRuns: 1500 },
    )
  })
})
