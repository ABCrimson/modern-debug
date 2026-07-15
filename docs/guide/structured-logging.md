# Structured logging

Off a TTY, every enabled line is one flat NDJSON record with a fixed envelope key order:

```json
{"t":1752170000000,"ns":"app:db","msg":"query ok","sev":40,"trace_id":"…","span_id":"…","rows":3}
```

| Key | Presence | Meaning |
| --- | --- | --- |
| `t` | always | epoch milliseconds (`Date.now()`) |
| `ns` | always | namespace |
| `msg` | always | message string |
| `sev` | `.warn()` / `.error()` | 40 / 50 — pino-compatible severity numbers |
| `trace_id`, `span_id` | with [OTel](./otel) wired | active span correlation |
| …your fields | when passed | flat, after the envelope |

Rules the serializer enforces:

- **The envelope always wins.** User fields named `t`, `ns`, `msg`, `sev`, `trace_id`,
  `span_id` are dropped, so a parsed record's envelope is always trustworthy.
- **One line per record, always parseable.** Strings are escaped with a fast-path scan;
  lone surrogates are escaped to well-formed JSON.
- **Logging never throws.** BigInt fields, circular references, throwing `toJSON`/getters —
  the record degrades to `{"$fields":"unserializable"}` or, in the pathological worst case,
  the line is dropped. Your code never crashes because of what it logged.

## Levels

```ts
log('routine') // no sev key
log.warn('careful') // sev: 40
log.error('broken') // sev: 50
```

Levels are core (they measured 9 bytes). In pretty mode they render like the base call —
severity is a machine concern.

## Sinks

One sink function receives each finished line (no trailing newline). Transports, rotation,
shipping — deliberately out of scope; compose with whatever you run:

```ts
configure({ format: 'ndjson', sink: (line) => queue.push(line) })
```
