import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'
import { scope, scopeFields } from '../src/node.ts'

/** §5.4: AsyncLocalStorage request scoping. Precedence: scope < fields() base < call fields. */
const sunk: string[] = []
const sink = (line: string): void => {
  sunk.push(line)
}

beforeEach(() => {
  sunk.length = 0
  configure({ sink, format: 'ndjson' })
  enable('als')
})

afterEach(() => {
  configure({})
  disable()
})

const parsed = (i = 0): Record<string, unknown> => JSON.parse(sunk[i] as string)

describe('/node scope (§5.4)', () => {
  it('scope fields appear on every record emitted inside the scope', () => {
    const d = createDebug('als')
    scope({ req: 'r1' }, () => {
      d('one')
      d('two')
    })
    expect(parsed(0).req).toBe('r1')
    expect(parsed(1).req).toBe('r1')
  })

  it('records outside any scope carry no scope fields', () => {
    createDebug('als')('m')
    expect('req' in parsed()).toBe(false)
  })

  it('scope() returns the callback result', () => {
    expect(scope({ x: 1 }, () => 42)).toBe(42)
  })

  it('scopeFields() reflects the active scope and is undefined outside', () => {
    expect(scopeFields()).toBeUndefined()
    scope({ req: 'r1' }, () => {
      expect(scopeFields()).toEqual({ req: 'r1' })
    })
    expect(scopeFields()).toBeUndefined()
  })

  it('nested scopes merge with inner precedence', () => {
    scope({ a: 1, b: 1 }, () => {
      scope({ b: 2 }, () => {
        createDebug('als')('m')
      })
    })
    expect(parsed()).toMatchObject({ a: 1, b: 2 })
  })

  it('call fields beat fields() base fields beat scope fields', () => {
    scope({ p: 'scope', q: 'scope', r: 'scope' }, () => {
      const d = createDebug('als').fields({ q: 'base', r: 'base' })
      d('m', { r: 'call' })
    })
    expect(parsed()).toMatchObject({ p: 'scope', q: 'base', r: 'call' })
  })

  it('fields survive async continuations', async () => {
    const d = createDebug('als')
    await scope({ req: 'async' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      d('after await')
    })
    expect(parsed().req).toBe('async')
  })

  it('pretty mode carries scope fields too', () => {
    configure({ sink, format: 'pretty' })
    scope({ req: 'r1' }, () => {
      createDebug('als')('m')
    })
    expect(sunk[0]).toBe('als m {"req":"r1"} +0ms')
  })
})
