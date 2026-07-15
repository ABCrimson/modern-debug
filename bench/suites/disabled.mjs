// LD-05 disabled path: both libraries loaded, namespace not enabled anywhere.
import { createRequire } from 'node:module'
import { bench, do_not_optimize, run } from 'mitata'
import { createDebug, disable } from '../../packages/modern-debug/dist/index.js'

const debugOracle = createRequire(import.meta.url)('debug')

disable()
debugOracle.disable()
const ours = createDebug('bench:disabled')
const theirs = debugOracle('bench:disabled')

// Rotating args + do_not_optimize defeat dead-code elimination — a disabled call must be
// measured as a real call, not erased by the JIT.
const msgs = Array.from({ length: 8 }, (_, i) => `msg ${i}`)
let a = 0
let b = 0

bench('modern-debug', () => {
  do_not_optimize(ours(msgs[a++ & 7]))
})
bench('debug', () => {
  do_not_optimize(theirs(msgs[b++ & 7]))
})

const report = await run()
console.log(
  `##JSON##${JSON.stringify(report.benchmarks.map((b) => ({ alias: b.alias, avg: b.runs[0].stats.avg })))}`,
)
