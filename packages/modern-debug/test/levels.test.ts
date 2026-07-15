import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'

/** LD-16 levels: .warn / .error sugar setting sev 40 / 50 in NDJSON records. */
const sunk: string[] = []
const sink = (line: string): void => {
  sunk.push(line)
}

beforeEach(() => {
  sunk.length = 0
  configure({ sink, format: 'ndjson' })
  enable('lvl')
})

afterEach(() => {
  configure({})
  disable()
})

const parsed = (): Record<string, unknown> => JSON.parse(sunk[0] as string)

describe('levels (LD-16)', () => {
  it('warn() sets sev 40', () => {
    createDebug('lvl').warn('careful')
    expect(parsed().sev).toBe(40)
    expect(parsed().msg).toBe('careful')
  })

  it('error() sets sev 50', () => {
    createDebug('lvl').error('boom')
    expect(parsed().sev).toBe(50)
  })

  it('the base call carries no sev key', () => {
    createDebug('lvl')('plain')
    expect('sev' in parsed()).toBe(false)
  })

  it('levels respect enablement (shared noop path)', () => {
    disable()
    createDebug('lvl').warn('silent')
    expect(sunk).toHaveLength(0)
  })

  it('levels flow through fields merging', () => {
    createDebug('lvl').fields({ a: 1 }).warn('m', { b: 2 })
    expect(parsed()).toMatchObject({ sev: 40, a: 1, b: 2 })
  })

  it('pretty mode renders warn like the base call (sev is NDJSON-only)', () => {
    configure({ sink, format: 'pretty' })
    createDebug('lvl').warn('m')
    expect(sunk[0]).toBe('lvl m +0ms')
  })
})
