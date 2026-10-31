// §5.3: OpenTelemetry trace correlation. LD-08: '@opentelemetry/api' is an optional peer,
// imported only here. Import-time TLA so an absent peer fails immediately with a hint;
// the original load failure rides along as the cause (a present but broken peer stays visible).
import { setTraceIds } from './hooks.ts'

let api: typeof import('@opentelemetry/api')
try {
  api = await import('@opentelemetry/api')
} catch (cause) {
  throw new Error(
    "modern-debug/otel requires the optional peer '@opentelemetry/api' — install it: npm i @opentelemetry/api",
    { cause },
  )
}
const { trace } = api

// isSpanContextValid rejects the all-zero context a NoopTracer makes active and any id that
// is not hex of the right length (32/16), so the ids interpolate into NDJSON safely.
const activeIds = (): readonly [string, string] | undefined => {
  const ctx = trace.getActiveSpan()?.spanContext()
  return ctx && trace.isSpanContextValid(ctx) ? [ctx.traceId, ctx.spanId] : undefined
}

/** Installs a record decorator: every NDJSON record reads the active span (LD-07 envelope). */
export function withTraceContext(): void {
  setTraceIds(activeIds)
}

/** Manual escape hatch for one-off correlation. */
export function traceFields(): { trace_id?: string; span_id?: string } {
  const ids = activeIds()
  return ids ? { trace_id: ids[0], span_id: ids[1] } : {}
}
