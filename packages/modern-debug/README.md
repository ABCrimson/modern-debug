<h1 align="center">modern-debug</h1>

<p align="center">
  <strong>The <code>debug</code> you know, rebuilt for 2026.</strong><br/>
  A sub-2KB, ESM-only, universal diagnostic logger — identical <code>DEBUG</code> grammar, plus structured NDJSON, OpenTelemetry trace correlation, and AsyncLocalStorage request scoping.
</p>

<p align="center">
  <a href="https://github.com/ABCrimson/modern-debug/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ABCrimson/modern-debug/ci.yml?branch=main&style=flat-square&label=CI&color=dc2626&labelColor=0a0e27"/></a>
  <img alt="core size" src="https://img.shields.io/badge/core-1.52_kB_min%2Bbrotli-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="types included" src="https://img.shields.io/badge/types-included-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="ESM only" src="https://img.shields.io/badge/module-ESM_only-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="Node engine" src="https://img.shields.io/badge/node-%E2%89%A520.19-dc2626?style=flat-square&labelColor=0a0e27"/>
  <a href="https://github.com/ABCrimson/modern-debug/blob/main/packages/modern-debug/LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-dc2626?style=flat-square&labelColor=0a0e27"/></a>
</p>

<p align="center">
  <a href="https://abcrimson.github.io/modern-debug/">Documentation</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/quickstart">Quickstart</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/migration">Migrate from debug</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/api/">API Reference</a> &middot;
  <a href="https://github.com/ABCrimson/modern-debug">GitHub</a>
</p>

Engines floor is Node ≥20.19.0 (the `require(esm)` interop floor); the tested matrix
is Node 24.18.0 LTS + 26.5.0 Current, plus Bun, Deno 2, Cloudflare workerd, and evergreen
browsers — proven in CI, not claimed.

```ts
import { createDebug } from 'modern-debug'

const log = createDebug('app:db')
log('connected', { host: 'db-1', pool: 8 })
log.warn('slow query', { ms: 240 })
```

```sh
DEBUG=app:*,-app:secrets node server.js
```

On a TTY you get `debug`'s classic colored output (same color per namespace, `+Nms` diffs).
Everywhere else, each line is one flat NDJSON record with a fixed envelope:

```json
{"t":1752170000000,"ns":"app:db","msg":"slow query","sev":40,"ms":240}
```

## Migrate your whole dependency tree

```jsonc
// package.json — routes every require('debug') in your tree through modern-debug/compat
{ "pnpm": { "overrides": { "debug": "npm:modern-debug@^1" } } }
// npm & bun (>=1.1): use "overrides" at the top level — bun also honors yarn-style "resolutions"
```

`modern-debug/compat` is API-compatible with `debug` 4.4.3 — printf formatters, custom
`debug.formatters`, `.enabled`, `.extend()`, `.log` overrides, same color hash — enforced by
a golden differential suite that byte-compares against the real package, and validated
against express 5, send, and socket.io.

## Subpaths

| Import | What it adds | Size (min+brotli) |
| --- | --- | --- |
| `modern-debug` | core: createDebug/enable/disable/enabled/configure | ≤1536 B |
| `modern-debug/compat` | the full debug 4.4.3 surface | ≤1800 B |
| `modern-debug/otel` | `trace_id`/`span_id` from the active OTel span | ≤512 B |
| `modern-debug/node` | `scope(fields, fn)` via AsyncLocalStorage | ≤448 B |

```ts
import { withTraceContext } from 'modern-debug/otel' // optional peer: @opentelemetry/api
withTraceContext()

import { scope } from 'modern-debug/node'
scope({ requestId }, () => handle(req, res)) // every record inside carries requestId
```

## configure()

```ts
import { configure } from 'modern-debug'

configure({
  format: 'ndjson', // 'pretty' | 'ndjson' | 'auto' (default: auto — TTY ⇒ pretty)
  sink: (line) => transport.push(line), // default: stderr
  time: 'diff', // pretty only: 'diff' | 'epoch' | 'none'
  colors: true, // pretty only: default TTY-detect
})
```

Replace semantics: each call sets the whole config; `configure({})` restores defaults.
`MODERN_DEBUG_FORMAT=pretty|ndjson` overrides auto-detection.

## Guarantees

- **Disabled namespaces are near-free** — one shared-noop dispatch, ~1 ns, 4–6× cheaper than
  `debug`'s disabled call (worst-of-5 gated on Node 26.5.0 and 24.18.0; see
  [bench/RESULTS.md](https://github.com/ABCrimson/modern-debug/blob/main/bench/RESULTS.md)).
- **Logging never throws** — BigInt, circular refs, hostile getters degrade to a marker or
  drop the line; your code never crashes because of what it logged.
- **The matcher is linear-time** — adversarial multi-wildcard `DEBUG` patterns cannot freeze
  your process.
- **Zero runtime dependencies.** ESM-only. `require('modern-debug')` (and the aliased
  `require('debug')`) yields the `debug`-compatible compat factory on Node ≥20.19 via
  `require(esm)`; the core named-export API and `/otel` are ESM-`import` only —
  `require('modern-debug/otel')` throws `ERR_REQUIRE_ASYNC_MODULE`.

MIT
