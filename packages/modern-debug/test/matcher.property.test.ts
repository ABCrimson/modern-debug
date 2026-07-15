import createDebug from 'debug'
import fc from 'fast-check'
import { afterAll, describe, expect, it } from 'vitest'
import { compile, matches } from '../src/matcher.ts'

/**
 * Differential property suite (spec §8.2a): for random pattern/namespace pairs, our
 * compiled matcher decision must equal debug 4.4.3's `enabled()`. The alphabet is
 * deliberately tiny and wildcard/separator/metachar-heavy to force collisions.
 */
const unit = fc.constantFrom(
  'a',
  'b',
  'c',
  'X',
  '1',
  ':',
  '*',
  '-',
  ',',
  ' ',
  '\t',
  '\n',
  '.',
  '\\',
  '?',
  '+',
  '(',
  '[',
  '$',
  '^',
  '|',
  '🔥',
)

const pattern = fc.string({ unit, maxLength: 24 })
const namespace = fc.string({ unit, maxLength: 12 })

afterAll(() => {
  createDebug.enable('')
})

// MATCHER_FUZZ_RUNS=1000000 for the §9 0.9.x fuzz gate; 5000 in the regular suite.
const numRuns = Number(process.env.MATCHER_FUZZ_RUNS ?? 5000)

describe('matcher ≡ debug 4.4.3 enabled()', () => {
  it(`agrees on ${numRuns} random pattern/namespace pairs`, () => {
    fc.assert(
      fc.property(pattern, namespace, (p, ns) => {
        createDebug.enable(p)
        const expected = createDebug.enabled(ns)
        const actual = matches(compile(p), ns)
        expect(actual, `pattern=${JSON.stringify(p)} ns=${JSON.stringify(ns)}`).toBe(expected)
      }),
      { numRuns },
    )
  }, 600000)
})
