// LD-07 NDJSON path vs pino single-record throughput, both writing to a noop destination.
import { createRequire } from 'node:module'
import { bench, run } from 'mitata'
import { configure, createDebug, enable } from '../../packages/modern-debug/dist/index.js'

const pino = createRequire(import.meta.url)('pino')

const noop = () => {}

configure({ format: 'ndjson', sink: noop })
enable('bench:ndjson')
const ours = createDebug('bench:ndjson')
const pinoLogger = pino({ base: undefined }, { write: noop })

if (!ours.enabled) {
  console.error('setup error: instance not enabled')
  process.exit(2)
}

bench('modern-debug', () => {
  ours('query done', { rows: 3, ok: true })
})
bench('pino', () => {
  pinoLogger.info({ rows: 3, ok: true }, 'query done')
})

const report = await run()
console.log(
  `##JSON##${JSON.stringify(report.benchmarks.map((b) => ({ alias: b.alias, avg: b.runs[0].stats.avg })))}`,
)
