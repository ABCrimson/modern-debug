# Comparison

How modern-debug sits next to `debug` and the loggers people reach for instead. Every number
on this page is measured; the method and date sit beside each table.

## Bundle size

Method: size-limit 14.3.0, rolldown, platform node, named factory import, min+brotli, measured
2026-10-30 in one scratch project with the same config for every row.

| Logger                 | Import                | Bytes | What it is                                                    |
| ---------------------- | --------------------- | ----- | ------------------------------------------------------------- |
| diary 0.4.5            | `{ diary }`           | 454   | different, tiny API; `DEBUG` wildcards, no `-` negation       |
| obug/plain 3.0.0       | `{ createDebug }`     | 874   | obug without colors                                           |
| loglevel 1.9.2         | default               | 1399  | level-based console wrapper; no namespaces                    |
| obug 3.0.0             | `{ createDebug }`     | 1416  | debug-compatible ESM rewrite; ANSI colors, no NDJSON or hooks |
| modern-debug           | `{ createDebug }`     | 1464  | colors, NDJSON, OTel hook, ALS scoping; zero deps             |
| modern-debug/compat    | default `createDebug` | 1736  | debug 4.4.3 API and format parity (golden fixtures)           |
| debug 4.4.3            | default               | 3081  | the incumbent; CJS, frozen since 2025-09-13                   |
| @logtape/logtape 2.4.2 | `{ getLogger }`       | 5058  | structured logging framework with sinks                       |
| roarr 7.21.7           | `{ Roarr }`           | 5140  | JSON logger with context                                      |
| pino 10.4.0            | default               | 17705 | full logging framework: transports, redaction, levels         |
| consola 3.4.2          | `{ createConsola }`   | 18829 | console framework with reporters and prompts                  |
| tslog 5.4.0            | `{ Logger }`          | 19880 | TypeScript logger with pretty/JSON transports                 |

This table bundles every row with platform node, so the modern-debug rows differ by a few bytes
from the package's own size gate (1460 B and 1753 B), which bundles core and compat with the
neutral platform. Both measure the same dist. `modern-debug/otel` (249 B) and
`modern-debug/node` (132 B) add on top of the core when imported.

## Downloads

Source: npm API (`api.npmjs.org/downloads/point/last-week/<pkg>`), week ending 2026-10-29.

| Package  | Downloads/week |
| -------- | -------------- |
| debug    | ≈939M          |
| obug     | ≈148.7M        |
| pino     | ≈76M           |
| consola  | ≈65.8M         |
| loglevel | ≈32.7M         |
| tslog    | ≈1.54M         |
| logtape  | ≈907k          |

`debug` is one of the most-downloaded packages on npm (semver had ≈1,136.8M the same week).
modern-debug has no download count: it is not on npm yet (checked 2026-10-30).

## Where each fits

`debug` and obug suit code that wants namespace toggles and colored terminal lines; obug is the
smaller debug-compatible ESM option (1416 B, or 874 B without colors). diary and loglevel are
smaller still, with their own APIs: diary reads `DEBUG` as a comma list with `*` wildcards but
no `-` negation (diary 0.4.5 `node.mjs`, read 2026-10-30), and loglevel has named loggers with
no pattern grammar. modern-debug fits libraries and services that want `debug`'s grammar and
near-zero disabled path, plus one flat NDJSON record per line off a TTY, trace ids from the
active span and request-scoped fields, at 48 B more than obug for the core.
`modern-debug/compat` is the drop-in for a tree that calls `require('debug')`. pino, consola,
tslog, LogTape and roarr are application logging frameworks; choose one of them when you need
what the next section lists.

## What modern-debug does not do

| Capability                     | modern-debug                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Transports, rotation, shipping | No. One `sink` function receives each finished line; compose your own transport.                                              |
| Redaction                      | No. Fields are serialized as given.                                                                                           |
| Levels                         | Only the envelope's `sev`: 40 for `.warn()`, 50 for `.error()`, absent otherwise. Enablement is per namespace, not per level. |
| OTLP export                    | No. `modern-debug/otel` adds `trace_id`/`span_id` to records; it does not export logs to a collector.                         |
