# OpenTelemetry correlation

`modern-debug/otel` injects `trace_id`/`span_id` from the active span into every NDJSON
record. `@opentelemetry/api` is an **optional peer** — core stays zero-dependency; if the
peer is missing, importing `modern-debug/otel` fails immediately with an install hint.

```ts
import { withTraceContext } from 'modern-debug/otel'

withTraceContext() // installs the record decorator once, at startup
```

From then on, any record emitted while a span is active carries the correlation ids in the
envelope (after `sev`, before your fields):

```json
{"t":…,"ns":"app:db","msg":"query ok","trace_id":"0af7651916cd43dd8448eb211c80319c","span_id":"b7ad6b7169203331","rows":3}
```

## Manual escape hatch

```ts
import { traceFields } from 'modern-debug/otel'

traceFields() // { trace_id, span_id } or {} when no span is active
```

## Notes

- Records emitted with no active span simply omit the keys — no empty strings, no zeros.
- Pretty mode ignores trace ids; they are a machine concern (LD-07 envelope fields).
- The subpath costs 240 B min+brotli and imports the peer only inside itself.
