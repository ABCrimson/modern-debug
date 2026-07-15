import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CASES, COLOR_CASE_IDS } from '../../../fixtures/debug-golden/format-cases.ts'

/**
 * §8.3 golden differential: /compat output must byte-match debug 4.4.3. The oracle runs
 * LIVE in-process under identical conditions (DEBUG_HIDE_DATE, fresh instance per case so
 * the diff is always +0ms) — stronger than stored bytes and immune to util.inspect drift.
 * The committed fixtures/debug-golden/format-golden.json is the reviewable artifact.
 */
type DebugLike = ((ns: string) => (...args: unknown[]) => void) & {
  colors: unknown[]
  inspectOpts: Record<string, unknown>
}

const PALETTE_256 = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68, 69, 74, 75, 76, 77,
  78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134, 135, 148, 149, 160, 161, 162, 163, 164,
  165, 166, 167, 168, 169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201,
  202, 203, 204, 205, 206, 207, 208, 209, 214, 215, 220, 221,
]

let oracle: DebugLike
let ours: DebugLike

beforeAll(async () => {
  vi.stubEnv('DEBUG_HIDE_DATE', 'true')
  vi.stubEnv('DEBUG_COLORS', 'false')
  vi.stubEnv('DEBUG', '*')
  vi.resetModules()
  oracle = ((await import('debug')) as { default: unknown }).default as DebugLike
  ours = ((await import('../src/compat.ts')) as { default: unknown }).default as DebugLike
})

const capture = (factory: DebugLike, ns: string, args: unknown[]): string => {
  let out = ''
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    out += String(chunk)
    return true
  })
  try {
    factory(ns)(...args)
  } finally {
    spy.mockRestore()
  }
  return out
}

describe('golden differential — plain mode (DEBUG_HIDE_DATE, colors off)', () => {
  for (const c of CASES) {
    it(`byte-matches debug 4.4.3: ${c.id}`, () => {
      const expected = capture(oracle, c.ns, c.make())
      const actual = capture(ours, c.ns, c.make())
      expect(actual).toBe(expected)
    })
  }
})

describe('golden differential — colored mode (256 palette forced)', () => {
  beforeAll(() => {
    oracle.inspectOpts.colors = true
    oracle.colors = PALETTE_256
    ours.inspectOpts.colors = true
  })

  for (const c of CASES.filter((c) => COLOR_CASE_IDS.includes(c.id))) {
    it(`byte-matches debug 4.4.3 (colored): ${c.id}`, () => {
      const expected = capture(oracle, c.ns, c.make())
      const actual = capture(ours, c.ns, c.make())
      expect(actual).toBe(expected)
    })
  }
})
