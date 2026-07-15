import createDebug from 'debug'
import { describe, expect, it } from 'vitest'
import { compile, matches } from '../src/matcher.ts'

/**
 * Grammar table (spec §8.1, LD-04). Each row is [pattern, namespace, enabled].
 * Two suites consume it: one validates the table itself against the real debug 4.4.3
 * oracle, one asserts our matcher implements it. Behavior documented here is
 * debug 4.4.3's template matching — regex metachars are LITERAL, only `*` is a wildcard,
 * skips are checked before names.
 */
type Row = readonly [pattern: string, ns: string, enabled: boolean]

const TABLE: readonly Row[] = [
  // literals
  ['app', 'app', true],
  ['app', 'apps', false],
  ['app', 'ap', false],
  ['app', 'app:db', false],
  ['app:db', 'app:db', true],
  ['app:db', 'app', false],
  ['', 'app', false],
  ['   ', 'app', false],
  ['app', 'App', false],
  ['App', 'App', true],
  ['', '', false],
  ['a:', 'a:', true],
  ['a:', 'a', false],
  [':', ':', true],
  ['a-b', 'a-b', true],

  // wildcards
  ['*', 'app', true],
  ['*', '', true],
  ['*', 'a:b:c', true],
  ['*', '🔥', true],
  ['app:*', 'app:db', true],
  ['app:*', 'app:', true],
  ['app:*', 'app', false],
  ['app*', 'app', true],
  ['app*', 'application', true],
  ['*:db', 'app:db', true],
  ['*:db', 'db', false],
  ['*:db', 'x:db', true],
  ['a*b', 'ab', true],
  ['a*b', 'axxb', true],
  ['a*b', 'axxbx', false],
  ['a*b*c', 'abc', true],
  ['a*b*c', 'aXbYc', true],
  ['a*b*c', 'acb', false],
  ['a**b', 'aXb', true],
  ['*a*', 'bab', true],
  ['*a*', 'bb', false],
  ['*', '*', true],
  ['a*', 'a*', true],
  ['*-x', 'a-x', true],

  // regex metachars are literal in the debug 4.4.3 grammar
  ['a.b', 'a.b', true],
  ['a.b', 'axb', false],
  ['a.c', 'abc', false],
  ['a+b', 'a+b', true],
  ['a+b', 'aab', false],
  ['(a)', '(a)', true],
  ['[ab]', '[ab]', true],
  ['[ab]', 'a', false],
  ['a?', 'a?', true],
  ['a?', 'a', false],
  ['a$', 'a$', true],
  ['^a', '^a', true],
  ['a{2}', 'a{2}', true],
  ['a|b', 'a|b', true],
  ['a|b', 'a', false],
  ['a\\b', 'a\\b', true],
  ['a\\b', 'ab', false],

  // negation ('-' prefix), skips evaluated before names
  ['*,-app', 'app', false],
  ['*,-app', 'apple', true],
  ['*,-app:*', 'app:db', false],
  ['*,-app:*', 'app', true],
  ['-app', 'app', false],
  ['-app', 'other', false],
  ['a,-a', 'a', false],
  ['-a,a', 'a', false],
  ['*,-*', 'x', false],
  ['a:*,-a:b', 'a:b', false],
  ['a:*,-a:b', 'a:c', true],
  ['a:*,-a:b:*', 'a:b:c', false],
  ['a:*,-a:b:*', 'a:bc', true],
  ['x,-', 'x', true],
  ['x,-', '', false],

  // separators: commas and whitespace runs, empty segments dropped
  ['a,b', 'b', true],
  ['a b', 'b', true],
  ['a\tb', 'b', true],
  ['a\nb', 'b', true],
  ['a, b', 'b', true],
  ['a,,b', 'b', true],
  [',a,', 'a', true],
  ['  a  ', 'a', true],

  // unicode
  ['ünï:*', 'ünï:код', true],
  ['🔥:*', '🔥:x', true],
] as const

describe('grammar table sanity: rows agree with the debug 4.4.3 oracle', () => {
  it('every row matches real debug behavior', () => {
    for (const [pattern, ns, expected] of TABLE) {
      createDebug.enable(pattern)
      expect(
        createDebug.enabled(ns),
        `oracle: pattern=${JSON.stringify(pattern)} ns=${JSON.stringify(ns)}`,
      ).toBe(expected)
    }
    createDebug.enable('')
  })
})

describe('matcher implements the LD-04 grammar', () => {
  it('every table row', () => {
    for (const [pattern, ns, expected] of TABLE) {
      expect(
        matches(compile(pattern), ns),
        `matcher: pattern=${JSON.stringify(pattern)} ns=${JSON.stringify(ns)}`,
      ).toBe(expected)
    }
  })

  it('allow/deny arrays reconstruct the pattern the way debug disable() does', () => {
    const patterns = ['a', ' a , b ,-c ', 'a\tb  c', '', '  ', '-x', 'a,,b', '*,-a:*', '-a,b,-c']
    for (const pattern of patterns) {
      createDebug.enable(pattern)
      const expected = createDebug.disable()
      const m = compile(pattern)
      const normalized = [...m.allow, ...m.deny.map((t) => `-${t}`)].join(',')
      expect(normalized, JSON.stringify(pattern)).toBe(expected)
    }
  })

  it('compiles once into an allow/deny template pair (LD-04 as amended by G-08)', () => {
    const m = compile('a:*, -a:b, c')
    expect(m.allow).toEqual(['a:*', 'c'])
    expect(m.deny).toEqual(['a:b'])
    expect(m.source).toBe('a:*, -a:b, c')
  })

  it('is linear-time on adversarial multi-wildcard patterns (no ReDoS)', () => {
    const hostile = compile('a*a*a*a*a*a*a*a*a*a*a*a*b')
    const start = performance.now()
    expect(matches(hostile, 'a'.repeat(28))).toBe(false)
    expect(matches(hostile, `${'a'.repeat(28)}b`)).toBe(true)
    expect(performance.now() - start).toBeLessThan(250)
  })
})
