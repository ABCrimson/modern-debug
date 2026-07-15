// Captures the §8.3 golden formatter fixture from real debug 4.4.3 (documentation artifact;
// the gating differential test compares against the LIVE oracle in-process, so these bytes
// are for review/divergence-diffing, not the gate itself).
// Deterministic by construction: DEBUG_HIDE_DATE (no timestamps in non-color mode), fresh
// instance per case (diff always +0ms in color mode), pinned Error stacks.
// Run: node capture-format.ts   (Node 26 strips types natively)
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { CASES, COLOR_CASE_IDS } from './format-cases.ts'

process.env.DEBUG_HIDE_DATE = 'true'
process.env.DEBUG_COLORS = 'false'
process.env.DEBUG = '*'

const require = createRequire(new URL('../../packages/modern-debug/package.json', import.meta.url))
const debug = require('debug')

const PALETTE_256 = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68, 69, 74, 75, 76, 77,
  78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134, 135, 148, 149, 160, 161, 162, 163, 164,
  165, 166, 167, 168, 169, 170, 171, 172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201,
  202, 203, 204, 205, 206, 207, 208, 209, 214, 215, 220, 221,
]

const captureLine = (ns: string, args: unknown[]): string => {
  let captured = ''
  const original = process.stderr.write
  // @ts-expect-error deliberate stub of the write signature for capture
  process.stderr.write = (chunk: unknown) => {
    captured += String(chunk)
    return true
  }
  try {
    const instance = debug(ns)
    instance(...args)
  } finally {
    process.stderr.write = original
  }
  return captured
}

const plain: Record<string, string> = {}
for (const c of CASES) {
  plain[c.id] = captureLine(c.ns, c.make())
}

// Colored pass: flip the module-level inspectOpts (init() copies it per new instance) and
// force the 256 palette the way a level>=2 terminal would resolve.
debug.inspectOpts.colors = true
debug.colors = PALETTE_256
const colored: Record<string, string> = {}
for (const c of CASES.filter((c) => COLOR_CASE_IDS.includes(c.id))) {
  colored[c.id] = captureLine(c.ns, c.make())
}

writeFileSync(
  new URL('./format-golden.json', import.meta.url),
  `${JSON.stringify(
    {
      source: 'debug@4.4.3, DEBUG_HIDE_DATE=true, fresh instance per case (+0ms), node',
      node: process.version,
      plain,
      colored,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `captured ${Object.keys(plain).length} plain + ${Object.keys(colored).length} colored lines`,
)
