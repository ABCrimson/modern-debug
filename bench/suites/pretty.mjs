// §6 enabled pretty path. I/O excluded on both sides; debug's util.formatWithOptions cost
// (its default log's format pass) is kept so the comparison is end-to-end minus the write.
// G-14 fairness: both sides pinned to their colored TTY-style path (prefix + diff suffix).
// Unpinned, debug's non-TTY branch prepends new Date().toISOString() per call — that
// inflated our published multiplier ~26% and left the baseline sensitive to
// DEBUG_COLORS/DEBUG_HIDE_DATE in the ambient environment.
delete process.env.DEBUG_COLORS
delete process.env.DEBUG_HIDE_DATE

const { createRequire } = await import('node:module')
const { bench, run } = await import('mitata')
const { configure, createDebug, enable } = await import('../../packages/modern-debug/dist/index.js')

const require = createRequire(import.meta.url)
const debugOracle = require('debug')
const util = require('node:util')

const noop = () => {}

configure({ format: 'pretty', sink: noop, colors: true })
enable('bench:pretty')
debugOracle.enable('bench:pretty')

const ours = createDebug('bench:pretty')
const theirs = debugOracle('bench:pretty')
theirs.useColors = true
theirs.log = (...args) => {
  util.formatWithOptions(debugOracle.inspectOpts, ...args)
}

if (!ours.enabled || !theirs.enabled) {
  console.error('setup error: instances not enabled')
  process.exit(2)
}

bench('modern-debug', () => {
  ours('query done', { rows: 3 })
})
bench('debug', () => {
  theirs('query done, rows %d', 3)
})

const report = await run()
console.log(
  `##JSON##${JSON.stringify(report.benchmarks.map((b) => ({ alias: b.alias, avg: b.runs[0].stats.avg })))}`,
)
