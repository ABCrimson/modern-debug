<h1 align="center">modern-debug</h1>

<p align="center">
  <strong>The <code>debug</code> you know, rebuilt for 2026.</strong><br/>
  An ESM-only, universal diagnostic logger under 2 KB per entry (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30) — identical <code>DEBUG</code> grammar, plus structured NDJSON, OpenTelemetry trace correlation, and AsyncLocalStorage request scoping.
</p>

<p align="center">
  <a href="https://github.com/ABCrimson/modern-debug/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ABCrimson/modern-debug/ci.yml?branch=main&style=flat-square&label=CI&color=dc2626&labelColor=0a0e27"/></a>
  <a href="https://github.com/ABCrimson/modern-debug/actions/workflows/docs.yml"><img alt="Docs" src="https://img.shields.io/github/actions/workflow/status/ABCrimson/modern-debug/docs.yml?branch=main&style=flat-square&label=docs&color=dc2626&labelColor=0a0e27"/></a>
  <img alt="core size: 1460 B min+brotli" src="https://img.shields.io/badge/core-1460_B_min%2Bbrotli-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="Node engine" src="https://img.shields.io/badge/node-%E2%89%A522.13-dc2626?style=flat-square&labelColor=0a0e27"/>
  <a href="./packages/modern-debug/LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-dc2626?style=flat-square&labelColor=0a0e27"/></a>
</p>

<p align="center">
  <sub>Core size is the cost of <code>import { createDebug }</code> (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30).</sub>
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

```text
{"t":1752170000000,"ns":"app:db","msg":"slow query","sev":40,"ms":240}
```

---

## Why modern-debug?

`debug` won the ecosystem on two things: its namespace grammar and a near-free disabled path. `modern-debug` keeps both — byte-for-byte the `debug` 4.4.3 grammar and matcher — and rebuilds everything the 2014 architecture never had: JSON output, levels, trace correlation, async-context fields, and a tree-shakeable ESM build.

|                                 | `debug` 4.4.3                    | modern-debug                                                        |
| ------------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| **`DEBUG=` namespace grammar**  | Wildcards + negation             | Byte-compatible (differential-tested against the real package)      |
| **Matcher**                     | Linear-time template walk        | Same linear-time walk — no ReDoS                                    |
| **Colored TTY output**          | Yes                              | Yes (identical color hash + `+Nms` diffs)                           |
| **Structured output**           | None                             | Flat NDJSON record per line, off-TTY by default                     |
| **Log levels**                  | None                             | `.warn` / `.error` → `sev` 40 / 50 in the envelope                  |
| **Trace correlation**           | None                             | `trace_id` / `span_id` from the active OpenTelemetry span (`/otel`) |
| **Async request fields**        | None                             | `AsyncLocalStorage` scoping (`/node`)                               |
| **Module format**               | CommonJS                         | ESM-only (`require(esm)` interop for the compat surface)            |
| **Tree-shakeable**              | No                               | Yes — `sideEffects: false`                                          |
| **Runtime dependencies**        | `ms`                             | Zero (`@opentelemetry/api` is an optional peer)                     |
| **TypeScript types**            | `@types/debug` (DefinitelyTyped) | Bundled first-class `.d.ts`                                         |
| **Drop-in `debug` replacement** | —                                | `modern-debug/compat` + a one-line install override                 |

---

## Features

- **The grammar that won** — `app:db`-style namespaces, `DEBUG` env patterns, wildcards and negation, byte-for-byte the `debug` 4.4.3 grammar, verified by a golden differential suite that runs the real `debug` next to this module.
- **Structured where it matters** — a TTY gets classic colored lines; everything else gets one flat NDJSON record per line, with pino-style numeric severities (`warn` = 40, `error` = 50).
- **Observability-native, outside the core budget** — `trace_id`/`span_id` from the active OpenTelemetry span, and per-request fields via `AsyncLocalStorage`. Both are opt-in subpath imports.
- **Logging never throws** — BigInt, circular refs, and hostile getters degrade to a marker or drop the line; your code never crashes over what it logged.
- **Near-free when disabled** — a disabled namespace dispatches to one shared no-op, re-evaluated only when `enable()`/`configure()` runs.
- **Universal** — Node, Bun, Deno 2, Cloudflare `workerd`, and evergreen browsers (Chromium via Playwright in CI), each exercised as its own CI job.
- **Drop-in compatible** — `modern-debug/compat` implements the `debug` 4.4.3 surface (printf formatters, `.enabled`, `.extend()`, `.log` overrides, `debug.formatters`, `formatArgs`), so an install-time override reroutes your whole dependency tree with zero code changes.
- **ESM-only & tree-shakeable** — `type: module`, `sideEffects: false`, first-class TypeScript declarations.

---

## Install

### Not on npm yet

> [!IMPORTANT]
> modern-debug is not on npm yet (checked 2026-10-30). Until 1.0.0 ships, build and pack it locally. The `1.0.0` changeset is staged in the repo; the first publish waits on the owner.

Build and pack a tarball. The repo needs Node ≥ 24.22.2 and pnpm 12.17.0 (packageManager pin; pnpm self-switches):

```sh
git clone https://github.com/ABCrimson/modern-debug && cd modern-debug
pnpm install
pnpm -C packages/modern-debug build
pnpm -C packages/modern-debug pack   # writes packages/modern-debug/modern-debug-<version>.tgz
```

Then add the tarball from your own project (`<version>` is `0.0.1` in the tree today):

```sh
npm add /abs/path/to/modern-debug/packages/modern-debug/modern-debug-<version>.tgz
```

### After 1.0.0 ships

```sh
npm add modern-debug     # or: pnpm add modern-debug  ·  bun add modern-debug
```

The core has no runtime dependencies. `@opentelemetry/api` is an **optional** peer (`^1.9.1`), needed only if you import `modern-debug/otel`. Consumers need Node ≥ 22.13.0 (`engines`).

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
const dbLog = log.extend('db') // → 'app:http:db'
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
enabled('app:db') // → true
const previous = disable() // turns everything off, returns the prior pattern
```

### Output format

```ts
import { configure } from 'modern-debug'

configure({
  format: 'ndjson', // 'pretty' | 'ndjson' | 'auto' (default: auto → TTY ⇒ pretty)
  sink: (line) => transport.push(line), // default: stderr (console.error where stderr is absent)
  time: 'diff', // pretty only: 'diff' | 'epoch' | 'none'
  colors: true, // pretty only: default TTY-detect
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

Reroute every `require('debug')` in your tree through the compat surface with one install override. pnpm 12 reads overrides from pnpm-workspace.yaml and ignores package.json#pnpm (pnpm 12 changelog):

```yaml
# pnpm-workspace.yaml
overrides:
  debug: npm:modern-debug@^1.0.0
```

npm and bun use a top-level `overrides` field in package.json:

```json
{ "overrides": { "debug": "npm:modern-debug@^1.0.0" } }
```

Yarn `resolutions` with the same value is untested.

Until 1.0.0 ships, the override value is the local tarball instead: `file:/abs/path/to/modern-debug/packages/modern-debug/modern-debug-<version>.tgz`.

`modern-debug/compat` is API-compatible with `debug` 4.4.3 — printf formatters, custom `debug.formatters`, `.enabled`, `.extend()`, `.log` overrides, and the same color hash — enforced by a golden differential suite that byte-compares against the real package and exercised in CI against express 5, send, and socket.io.

---

## Subpaths & size

Each entry is size-gated in CI (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30). The `.` entry is measured as `import { createDebug }`; `./compat`, `./otel` and `./node` are measured as whole entry files, and `./node` is bundled for the node platform (DECISIONS G-17).

| Import                | What it adds                                                         | Size (min+brotli) | Budget |
| --------------------- | -------------------------------------------------------------------- | ----------------- | ------ |
| `modern-debug`        | core: `createDebug` / `enable` / `disable` / `enabled` / `configure` | **1460 B**        | 1536 B |
| `modern-debug/compat` | the `debug` 4.4.3 surface                                            | **1753 B**        | 1800 B |
| `modern-debug/otel`   | `trace_id`/`span_id` from the active OTel span                       | **249 B**         | 512 B  |
| `modern-debug/node`   | `scope(fields, fn)` via `AsyncLocalStorage`                          | **132 B**         | 448 B  |

> `require('modern-debug')` (and the aliased `require('debug')`) resolves to the `debug`-compatible compat factory on Node ≥ 22.13.0 via `require(esm)` (the engines floor; DECISIONS G-17). The core named-export API and `/otel` are ESM-`import` only — `require('modern-debug/otel')` throws `ERR_REQUIRE_ASYNC_MODULE`.

---

## Comparison

Bundle cost of each logger's factory import (size-limit 14.3.0, rolldown, platform node, named factory import, min+brotli, 2026-10-30). Every row was measured in one scratch project with the same config. This config bundles the modern-debug rows for the node platform, so they differ by a few bytes from the package gate above (1460 B / 1753 B); both measure the same dist.

| Logger                 | Import              | Bytes | What it is                                                                                        |
| ---------------------- | ------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| modern-debug           | `{ createDebug }`   | 1464  | Colors and NDJSON in the core, plus the hook slots that `/otel` and `/node` fill; zero deps.      |
| modern-debug/compat    | default             | 1736  | The `debug` 4.4.3 API with format parity, held by golden fixtures.                                |
| debug 4.4.3            | default             | 3081  | The incumbent: CommonJS, with no release since 4.4.3 (2025-09-13, npm).                           |
| obug 3.0.0             | `{ createDebug }`   | 1416  | A debug-compatible ESM rewrite with ANSI colors; it is smaller because it has no NDJSON or hooks. |
| obug/plain 3.0.0       | `{ createDebug }`   | 874   | obug without colors; it is smaller again because it also drops colors.                            |
| diary 0.4.5            | `{ diary }`         | 454   | A different, tiny API without the `DEBUG` namespace grammar.                                      |
| loglevel 1.9.2         | default             | 1399  | A level-based console wrapper without namespaces.                                                 |
| @logtape/logtape 2.4.2 | `{ getLogger }`     | 5058  | A full structured-logging framework with sinks.                                                   |
| roarr 7.21.7           | `{ Roarr }`         | 5140  | A JSON logger with context.                                                                       |
| pino 10.4.0            | default             | 17705 | A full logging framework: transports, redaction, levels.                                          |
| consola 3.4.2          | `{ createConsola }` | 18829 | A full console framework with reporters and prompts.                                              |
| tslog 5.4.0            | `{ Logger }`        | 19880 | A full TypeScript logging framework with pretty and JSON transports.                              |

---

## API summary

### Core — `modern-debug`

| Symbol        | Signature                   | Purpose                                                |
| ------------- | --------------------------- | ------------------------------------------------------ |
| `createDebug` | `(ns: string) => DebugFn`   | Create a logger bound to a namespace.                  |
| `enable`      | `(pattern: string) => void` | Set the active `DEBUG`-grammar pattern at runtime.     |
| `disable`     | `() => string`              | Turn all namespaces off; returns the previous pattern. |
| `enabled`     | `(ns: string) => boolean`   | Test whether a namespace matches the active pattern.   |
| `configure`   | `(opts: Configure) => void` | Set format / sink / time / colors (replace semantics). |

**`DebugFn`** (the value returned by `createDebug`):

| Member             | Signature                                         | Purpose                                                    |
| ------------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| _call_             | `(msg: string, fields?: DebugFields) => void`     | Emit a record at default severity.                         |
| `.warn` / `.error` | `(msg: string, fields?: DebugFields) => void`     | Emit at `sev` 40 / 50.                                     |
| `.extend`          | `(suffix: string, delimiter?: string) => DebugFn` | Derive a child namespace (default delimiter `:`).          |
| `.fields`          | `(base: DebugFields) => DebugFn`                  | Return a logger with base fields merged into every record. |
| `.ns`              | `string` (readonly)                               | The namespace string.                                      |
| `.enabled`         | `boolean` (readonly)                              | Whether this namespace currently matches.                  |

**`Configure`**: `{ format?: 'pretty' | 'ndjson' | 'auto'; sink?: (line: string) => void; time?: 'diff' | 'epoch' | 'none'; colors?: boolean }`
**`DebugFields`**: `{ readonly [k: string]: unknown }`

### `modern-debug/otel`

| Symbol             | Signature                                       | Purpose                                                             |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| `withTraceContext` | `() => void`                                    | Install a decorator that adds `trace_id`/`span_id` to every record. |
| `traceFields`      | `() => { trace_id?: string; span_id?: string }` | One-off read of the active span's ids.                              |

### `modern-debug/node`

| Symbol        | Signature                                    | Purpose                                                                                   |
| ------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `scope`       | `<T>(fields: DebugFields, fn: () => T) => T` | Run `fn` with `fields` attached to every record inside (nested scopes merge, inner wins). |
| `scopeFields` | `() => DebugFields \| undefined`             | Read the current scope's fields.                                                          |

### `modern-debug/compat`

Default export: a factory implementing the `debug` 4.4.3 surface — `enable`/`disable`/`enabled`, `humanize`, `formatters` (`%o`/`%O`; `%j` too where `node:util` is absent, as in `debug`'s browser build), `formatArgs`, `selectColor`/`colors`, `save`/`load`, `coerce`, and per-instance `.namespace` / `.enabled` / `.color` / `.extend()` / `.log`. The known gaps are listed in the [divergence notes](https://abcrimson.github.io/modern-debug/guide/divergence).

---

## Benchmarks

The repo's own benchmark suite ([`bench/RESULTS.md`](./bench/RESULTS.md), mitata 1.0.34, worst of 5 runs, generated 2026-07-14 on win32-x64 with Node 26.5.0 and 24.18.0; not regenerated since):

| Path                | Node 26                    | Node 24                    | Gate                      |
| ------------------- | -------------------------- | -------------------------- | ------------------------- |
| disabled call       | 0.188× the cost of `debug` | 0.229× the cost of `debug` | ≤ 1.05× `debug`           |
| enabled pretty line | 10.41× `debug` throughput  | 7.02× `debug` throughput   | ≥ 1.5× `debug` throughput |
| NDJSON record       | 1.91× `pino` throughput    | 1.42× `pino` throughput    | ≥ 0.8× `pino` throughput  |

The pretty comparison runs both sides through their colored TTY path. CI's `bench` job re-measures on Node 26.13.0 and 24.22.2 (`BENCH_EXTRA_NODE`) on every push to main and every pull request, and uploads `RESULTS.md` as the `bench-results` artifact. Reproduce with `node bench/run-benches.mjs`.

---

## Runtime matrix

CI: Node 24.22.2 and 26.13.0 on Ubuntu, Windows and macOS (blocking), Node 27.0.0-alpha.0.0.0 (non-blocking), a Node 22.13.0 floor job, Bun, Deno 2, Cloudflare workerd 1.20261023.1 and Chromium (Playwright) (.github/workflows/ci.yml, 2026-10-30). Node channels are from nodejs.org/dist/index.json (read 2026-10-30).

| Runtime                                               | CI job                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Node 24.22.2 (maintenance LTS) & 26.13.0 (Active LTS) | `verify` on Ubuntu, Windows, macOS: `pnpm verify`, runtime smoke, coverage (blocking)      |
| Node 27.0.0-alpha.0.0.0                               | the same `verify` legs, non-blocking (`continue-on-error`)                                 |
| Node 22.13.0 (engines floor)                          | `floor`: builds on 26.13.0, then runs the smoke and the alias fixture on 22.13.0           |
| Bun                                                   | runtime smoke test                                                                         |
| Deno 2                                                | runtime smoke test                                                                         |
| Cloudflare `workerd` 1.20261023.1                     | `tests-workers`: @cloudflare/vitest-plugin 1.4.11 pool and raw miniflare 5.20261023.3-beta |
| Evergreen browsers                                    | Playwright (Chromium) browser test suite                                                   |

On Cloudflare Workers, use Node.js compatibility (on by default from compatibility date 2026-08-04; nodejs_compat before that) or the nodejs_als flag alone for modern-debug/node (workerd 1.20261023.1 probes, DECISIONS G-17). Without Node.js compatibility the core's default sink writes through `console.error` (LD-11).

The published engines floor is **Node ≥ 22.13.0**: the first 22.x with `require(esm)` unflagged and warning-free (DECISIONS G-17).

---

## Documentation

Full guides and API reference live at **[abcrimson.github.io/modern-debug](https://abcrimson.github.io/modern-debug/)** — [Quickstart](https://abcrimson.github.io/modern-debug/guide/quickstart) · [Migration from debug](https://abcrimson.github.io/modern-debug/guide/migration) · [Structured logging](https://abcrimson.github.io/modern-debug/guide/structured-logging) · [OpenTelemetry](https://abcrimson.github.io/modern-debug/guide/otel) · [Request scoping](https://abcrimson.github.io/modern-debug/guide/scoping) · [Runtime matrix](https://abcrimson.github.io/modern-debug/guide/runtimes) · [Divergence notes](https://abcrimson.github.io/modern-debug/guide/divergence).

---

## Development

Node ≥ 24.22.2 and pnpm 12.17.0 (packageManager pin; pnpm self-switches) to work on the repo; consumers need Node ≥ 22.13.0.

```sh
git clone https://github.com/ABCrimson/modern-debug.git && cd modern-debug
pnpm install
pnpm build
pnpm test
```

| Command                                      | Description                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm build`                                 | Build all packages (Turbo + tsdown)                                                      |
| `pnpm test`                                  | Unit tests (Vitest)                                                                      |
| `pnpm verify`                                | typecheck · lint · knip · test · size · publint · attw                                   |
| `pnpm -C packages/modern-debug size`         | Bundle-size gates (`size-limit`, min+brotli)                                             |
| `pnpm -C packages/modern-debug test:browser` | Chromium suite (first: `pnpm -C packages/modern-debug exec playwright install chromium`) |
| `pnpm -C tests-workers test`                 | Cloudflare workerd island (@cloudflare/vitest-plugin pool + raw miniflare)               |
| `node bench/run-benches.mjs`                 | Benchmarks (mitata; build first)                                                         |

The suite holds 358 tests (vitest 5.1.0-beta.1, 2026-10-30): 342 package tests in 20 files, 6 browser tests in 2 files, 4 workers-pool tests in 2 files and 6 raw-miniflare tests in 2 files.

Publishing is parked on the owner: the first publish is a manual bootstrap, then `release.yml` publishes through an npm trusted publisher (OIDC) with "npm publish" enabled. A GitHub App token for CI checks on the version PR is optional.

See [ROADMAP.md](./ROADMAP.md) for the 1.0.0 completion runbook and the 1.1.0 → 1.10.0 plan.

---

## Repository guide

| Where                                                                         | What                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md)                                        | Contributor guide — the verify gate, the testing layers, the hard constraints      |
| [`packages/modern-debug/README.md`](./packages/modern-debug/README.md)        | The published package's own README                                                 |
| [abcrimson.github.io/modern-debug](https://abcrimson.github.io/modern-debug/) | Full documentation site (guides + API reference)                                   |
| [`DECISIONS.md`](./DECISIONS.md)                                              | Append-only engineering decision log                                               |
| [`01-modern-debug-CLAUDE.md`](./01-modern-debug-CLAUDE.md)                    | The project spec (authoritative; see `AGENTS.md` for the distilled executor notes) |

---

## License

[MIT](./packages/modern-debug/LICENSE) © 2026 Albert Badalov. LICENSE also carries the third-party MIT notices for the code ported from `debug` 4.4.3 and `ms` 2.1.3.
