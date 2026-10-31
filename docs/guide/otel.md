# OpenTelemetry correlation

`modern-debug/otel` injects `trace_id`/`span_id` from the active span into every NDJSON
record. `@opentelemetry/api` is an **optional peer** (`^1.9.1`): the core stays
zero-dependency. If the peer is missing, importing `modern-debug/otel` fails immediately with
an install hint, and the original load error rides along as the error's `cause`.

```ts
import { withTraceContext } from 'modern-debug/otel'

withTraceContext() // installs the record decorator once, at startup
```

From then on, any record emitted while a valid span is active carries the correlation ids in
the envelope (after `sev`, before your fields):

```jsonl
{"t":…,"ns":"app:db","msg":"query ok","trace_id":"0af7651916cd43dd8448eb211c80319c","span_id":"b7ad6b7169203331","rows":3}
```

## Manual escape hatch

```ts
import { traceFields } from 'modern-debug/otel'

traceFields() // { trace_id, span_id } or {} when no valid span is active
```

## Notes

- Ids are emitted only when `trace.isSpanContextValid()` accepts the active span context. In
  `@opentelemetry/api` 1.10.0 that means hex ids of 32 and 16 characters that are not all
  zeros. The all-zero context a no-op tracer makes active, and any non-hex context, emit no ids.
- Records emitted with no valid span simply omit the keys — no empty strings, no zeros.
- Pretty mode ignores trace ids; they are a machine concern (LD-07 envelope fields).
- The subpath costs 249 B (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30) against a
  512 B budget, and imports the peer only inside itself.
