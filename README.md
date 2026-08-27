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
  <a href="./packages/modern-debug/LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-dc2626?style=flat-square&labelColor=0a0e27"/></a>
</p>

<p align="center">
  <a href="https://abcrimson.github.io/modern-debug/">Documentation</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/quickstart">Quickstart</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/migration">Migrate from debug</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/api/">API Reference</a>
</p>

```ts
import { createDebug } from 'modern-debug'

const log = createDebug('app:db')
log('connected', { host: 'db-1', pool: 8 })
log.warn('slow query', { ms: 240 })
```

```sh
DEBUG=app:*,-app:secrets node server.js
```

On a TTY you get `debug`'s classic colored output — same per-namespace color, `+Nms` diffs. Everywhere else, each line is one flat NDJSON record with a fixed envelope:

```json
{"t":1752170000000,"ns":"app:db","msg":"slow query","sev":40,"ms":240}
```

---

## Why modern-debug?

`debug` won the ecosystem on two things: its namespace grammar and a near-free disabled path. `modern-debug` keeps both — byte-for-byte the `debug` 4.4.3 grammar and matcher — and rebuilds everything the 2014 architecture never had: JSON output, levels, trace correlation, async-context fields, and a tree-shakeable ESM build.

| | `debug` 4.4.3 | modern-debug |
|---|---|---|
| **`DEBUG=` namespace grammar** | Wildcards + negation | Byte-compatible (differential-tested against the real package) |
| **Matcher** | Linear-time template walk | Same linear-time walk — no ReDoS |
| **Colored TTY output** | Yes | Yes (identical color hash + `+Nms` diffs) |
| **Structured output** | None | Flat NDJSON record per line, off-TTY by default |
| **Log levels** | None | `.warn` / `.error` → `sev` 40 / 50 in the envelope |
| **Trace correlation** | None | `trace_id` / `span_id` from the active OpenTelemetry span (`/otel`) |
| **Async request fields** | None | `AsyncLocalStorage` scoping (`/node`) |
| **Module format** | CommonJS | ESM-only (`require(esm)` interop for the compat surface) |
| **Tree-shakeable** | No | Yes — `sideEffects: false` |
| **Runtime dependencies** | `ms` | Zero (`@opentelemetry/api` is an optional peer) |
| **TypeScript types** | `@types/debug` (DefinitelyTyped) | Bundled first-class `.d.ts` |
| **Drop-in `debug` replacement** | — | `modern-debug/compat` + a one-line install alias |

---

## Features

- **The grammar that won** — `app:db`-style namespaces, `DEBUG` env patterns, wildcards and negation, byte-for-byte the `debug` 4.4.3 grammar, verified by a golden differential suite that runs the real `debug` next to this module.
- **Structured where it matters** — a TTY gets classic colored lines; everything else gets one flat NDJSON record per line, with pino-style numeric severities (`warn` = 40, `error` = 50).
- **Observability-native, outside the core budget** — `trace_id`/`span_id` from the active OpenTelemetry span, and per-request fields via `AsyncLocalStorage`. Both are opt-in subpath imports.
- **Logging never throws** — BigInt, circular refs, and hostile getters degrade to a marker or drop the line; your code never crashes over what it logged.
- **Near-free when disabled** — a disabled namespace dispatches to one shared no-op, re-evaluated only when `enable()`/`configure()` runs.
- **Universal** — Node, Bun, Deno 2, Cloudflare `workerd`, and evergreen browsers, each exercised as its own CI job.
- **Drop-in compatible** — `modern-debug/compat` implements the full `debug` 4.4.3 surface (printf formatters, `.enabled`, `.extend()`, `.log` overrides, `debug.formatters`), so an install-time alias reroutes your whole dependency tree with zero code changes.
- **ESM-only & tree-shakeable** — `type: module`, `sideEffects: false`, first-class TypeScript declarations.

---

## Install

```sh
npm add modern-debug     # or: pnpm add modern-debug  ·  bun add modern-debug
```

> [!NOTE]
> **Pre-release.** The `1.0.0` changeset is staged in-repo but has **not yet been published to npm**. The public API below is frozen under semver as of that release; until it ships, install from the Git repo.

The core has no runtime dependencies. `@opentelemetry/api` is an **optional** peer, needed only if you import `modern-debug/otel`.

---

## Usage

### Namespaces and levels

```ts
import { createDebug } from 'modern-debug'

const log = createDebug('app:http')
log('request', { method: 'GET', path: '/users' })
log.warn('retrying upstream', { attempt: 2 })
log.error('gateway timeout', { ms: 30_000 })

// Derive a child namespace or pin base fields
const dbLog = log.extend('db')            // → 'app:http:db'
const reqLog = log.fields({ reqId: 'abc' }) // every line carries reqId
```

### Turning namespaces on

```sh
DEBUG=app:*,-app:secrets node server.js   # env var (Node / Bun / Deno)
```

The pattern is resolved from `process.env.DEBUG`, then `globalThis.DEBUG` (a Workers escape hatch), then `localStorage.debug` (browsers). You can also drive it from code:

```ts
import { enable, disable, enabled } from 'modern-debug'

enable('app:*,-app:secrets')
enabled('app:db')   // → true
const previous = disable() // turns everything off, returns the prior pattern
```

### Output format

```ts
import { configure } from 'modern-debug'

configure({
  format: 'ndjson',                     // 'pretty' | 'ndjson' | 'auto' (default: auto → TTY ⇒ pretty)
  sink: (line) => transport.push(line), // default: stderr (console.error where stderr is absent)
  time: 'diff',                         // pretty only: 'diff' | 'epoch' | 'none'
  colors: true,                         // pretty only: default TTY-detect
})
```

`configure()` has **replace semantics** — each call sets the whole config, and `configure({})` restores defaults. `MODERN_DEBUG_FORMAT=pretty|ndjson` overrides auto-detection at the env level.

### OpenTelemetry correlation — `modern-debug/otel`

```ts
import { withTraceContext } from 'modern-debug/otel' // optional peer: @opentelemetry/api

withTraceContext() // every NDJSON record now reads the active span's trace_id/span_id
```

### Request scoping — `modern-debug/node`

```ts
import { scope } from 'modern-debug/node'

scope({ requestId }, () => handle(req, res)) // every record inside carries requestId
```

### Migrate your whole dependency tree — `modern-debug/compat`

Reroute every `require('debug')` in your tree through the compat surface with one install alias:

```jsonc
// package.json
{ "pnpm": { "overrides": { "debug": "npm:modern-debug@^1" } } }
// npm & bun (>=1.1): use top-level "overrides"; bun also honors yarn-style "resolutions"
```

`modern-debug/compat` is API-compatible with `debug` 4.4.3 — printf formatters, custom `debug.formatters`, `.enabled`, `.extend()`, `.log` overrides, and the same color hash — enforced by a golden differential suite that byte-compares against the real package and exercised in CI against express 5, send, and socket.io.

---

## Subpaths & size

Each entry is size-gated in CI. Sizes below are **measured, min+brotli** (via `size-limit`).

| Import | What it adds | Size (min+brotli) |
|---|---|---|
| `modern-debug` | core: `createDebug` / `enable` / `disable` / `enabled` / `configure` | **1.52 kB** |
| `modern-debug/compat` | the full `debug` 4.4.3 surface | **1.79 kB** |
| `modern-debug/otel` | `trace_id`/`span_id` from the active OTel span | **240 B** |
| `modern-debug/node` | `scope(fields, fn)` via `AsyncLocalStorage` | **148 B** |

> `require('modern-debug')` (and the aliased `require('debug')`) resolves to the `debug`-compatible compat factory on Node ≥20.19 via `require(esm)`. The core named-export API and `/otel` are ESM-`import` only — `require('modern-debug/otel')` throws `ERR_REQUIRE_ASYNC_MODULE`.

---

## API summary

### Core — `modern-debug`

| Symbol | Signature | Purpose |
|---|---|---|
| `createDebug` | `(ns: string) => DebugFn` | Create a logger bound to a namespace. |
| `enable` | `(pattern: string) => void` | Set the active `DEBUG`-grammar pattern at runtime. |
| `disable` | `() => string` | Turn all namespaces off; returns the previous pattern. |
| `enabled` | `(ns: string) => boolean` | Test whether a namespace matches the active pattern. |
| `configure` | `(opts: Configure) => void` | Set format / sink / time / colors (replace semantics). |

**`DebugFn`** (the value returned by `createDebug`):

| Member | Signature | Purpose |
|---|---|---|
| _call_ | `(msg: string, fields?: DebugFields) => void` | Emit a record at default severity. |
| `.warn` / `.error` | `(msg: string, fields?: DebugFields) => void` | Emit at `sev` 40 / 50. |
| `.extend` | `(suffix: string, delimiter?: string) => DebugFn` | Derive a child namespace (default delimiter `:`). |
| `.fields` | `(base: DebugFields) => DebugFn` | Return a logger with base fields merged into every record. |
| `.ns` | `string` (readonly) | The namespace string. |
| `.enabled` | `boolean` (readonly) | Whether this namespace currently matches. |

**`Configure`**: `{ format?: 'pretty' | 'ndjson' | 'auto'; sink?: (line: string) => void; time?: 'diff' | 'epoch' | 'none'; colors?: boolean }`
**`DebugFields`**: `{ readonly [k: string]: unknown }`

### `modern-debug/otel`

| Symbol | Signature | Purpose |
|---|---|---|
| `withTraceContext` | `() => void` | Install a decorator that adds `trace_id`/`span_id` to every record. |
| `traceFields` | `() => { trace_id?: string; span_id?: string }` | One-off read of the active span's ids. |

### `modern-debug/node`

| Symbol | Signature | Purpose |
|---|---|---|
| `scope` | `<T>(fields: DebugFields, fn: () => T) => T` | Run `fn` with `fields` attached to every record inside (nested scopes merge, inner wins). |
| `scopeFields` | `() => DebugFields \| undefined` | Read the current scope's fields. |

### `modern-debug/compat`

Default export: a factory implementing the full `debug` 4.4.3 surface — `enable`/`disable`/`enabled`, `humanize`, `formatters` (`%o`/`%O`/`%j`), `selectColor`/`colors`, `save`/`load`, `coerce`, and per-instance `.namespace` / `.enabled` / `.color` / `.extend()` / `.log`.

---

## Benchmarks

From the repo's own CI-gated benchmark suite ([`bench/RESULTS.md`](./bench/RESULTS.md), mitata, Node 26.5.0 medians; each gate must hold on the **worst** of 5 runs and is also enforced on Node 24.18.0):

| Path | modern-debug | baseline | Gate |
|---|---|---|---|
| disabled call | 1.1 ns | `debug`: 6.2 ns | ≤ 1.05× `debug` |
| enabled pretty line | 77.6 ns | `debug`: 852.7 ns | ≥ 1.5× `debug` throughput |
| NDJSON record | 163.2 ns | `pino`: 337.0 ns | ≥ 0.8× `pino` throughput |

The pretty comparison runs both sides through their colored TTY path. These are the project's own measurements, reproducible via `node bench/run-benches.mjs`.

---

## Runtime matrix

Every target below runs as its own CI job — proven, not claimed:

| Runtime | How it's exercised in CI |
|---|---|
| Node 24.18.0 LTS & 26.5.0 Current | full `verify` matrix on Linux, Windows, macOS |
| Bun | runtime smoke test |
| Deno 2 | runtime smoke test |
| Cloudflare `workerd` | Miniflare test island (needs the `nodejs_compat` flag for `/node`) |
| Evergreen browsers | Playwright (Chromium) browser test suite |

Engines floor is **Node ≥ 20.19.0** — the `require(esm)` interop floor.

---

## Documentation

Full guides and API reference live at **[abcrimson.github.io/modern-debug](https://abcrimson.github.io/modern-debug/)** — [Quickstart](https://abcrimson.github.io/modern-debug/guide/quickstart) · [Migration from debug](https://abcrimson.github.io/modern-debug/guide/migration) · [Structured logging](https://abcrimson.github.io/modern-debug/guide/structured-logging) · [OpenTelemetry](https://abcrimson.github.io/modern-debug/guide/otel) · [Request scoping](https://abcrimson.github.io/modern-debug/guide/scoping) · [Runtime matrix](https://abcrimson.github.io/modern-debug/guide/runtimes) · [Divergence notes](https://abcrimson.github.io/modern-debug/guide/divergence).

---

## Development

```sh
git clone https://github.com/ABCrimson/modern-debug.git && cd modern-debug
pnpm install
pnpm build
pnpm test
```

| Command | Description |
|---|---|
| `pnpm build` | Build all packages (Turbo + tsdown) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm verify` | typecheck · lint · knip · test · size · publint · attw |
| `pnpm -C packages/modern-debug size` | Bundle-size gates (`size-limit`, min+brotli) |
| `node bench/run-benches.mjs` | Benchmarks (mitata) |

---

## Repository guide

| Where | What |
|---|---|
| [`packages/modern-debug/README.md`](./packages/modern-debug/README.md) | The published package's own README |
| [abcrimson.github.io/modern-debug](https://abcrimson.github.io/modern-debug/) | Full documentation site (guides + API reference) |
| [`DECISIONS.md`](./DECISIONS.md) | Append-only engineering decision log |
| [`01-modern-debug-CLAUDE.md`](./01-modern-debug-CLAUDE.md) | The project spec (authoritative; see `CLAUDE.md` for the distilled executor notes) |

---

## License

[MIT](./packages/modern-debug/LICENSE) © 2026 crimson_dev
