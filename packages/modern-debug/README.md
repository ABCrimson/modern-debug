<h1 align="center">modern-debug</h1>

<p align="center">
  <strong>The <code>debug</code> you know, rebuilt for 2026.</strong><br/>
  A sub-2KB, ESM-only, universal diagnostic logger — identical <code>DEBUG</code> grammar, plus structured NDJSON, OpenTelemetry trace correlation, and AsyncLocalStorage request scoping.
</p>

<p align="center">
  <a href="https://github.com/ABCrimson/modern-debug/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/ABCrimson/modern-debug/ci.yml?branch=main&style=flat-square&label=CI&color=dc2626&labelColor=0a0e27"/></a>
  <a href="https://github.com/ABCrimson/modern-debug/actions/workflows/docs.yml"><img alt="Docs" src="https://img.shields.io/github/actions/workflow/status/ABCrimson/modern-debug/docs.yml?branch=main&style=flat-square&label=Docs&color=dc2626&labelColor=0a0e27"/></a>
  <img alt="core size 1460 B, size-limit 14.3.0, rolldown, min+brotli, 2026-10-30" src="https://img.shields.io/badge/core-1460_B_min%2Bbrotli-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="types included" src="https://img.shields.io/badge/types-included-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="zero dependencies" src="https://img.shields.io/badge/dependencies-0-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="ESM only" src="https://img.shields.io/badge/module-ESM_only-dc2626?style=flat-square&labelColor=0a0e27"/>
  <img alt="Node engine" src="https://img.shields.io/badge/node-%E2%89%A522.13-dc2626?style=flat-square&labelColor=0a0e27"/>
  <a href="https://github.com/ABCrimson/modern-debug/blob/main/packages/modern-debug/LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-dc2626?style=flat-square&labelColor=0a0e27"/></a>
</p>

<p align="center">
  <a href="https://abcrimson.github.io/modern-debug/">Documentation</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/quickstart">Quickstart</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/guide/migration">Migrate from debug</a> &middot;
  <a href="https://abcrimson.github.io/modern-debug/api/">API Reference</a> &middot;
  <a href="https://github.com/ABCrimson/modern-debug">GitHub</a>
</p>

Engines floor: Node ≥ 22.13.0, the first 22.x where `require(esm)` is unflagged and warning-free (Node.js modules docs, read 2026-10-30; DECISIONS G-17). Runtimes (CI, 2026-10-30): Node 24.22.2 maintenance LTS and 26.13.0 Active LTS on Ubuntu, Windows and macOS (blocking), Node 27.0.0-alpha.0.0.0 (non-blocking), a Node 22.13.0 floor job, Bun, Deno 2, Cloudflare workerd 1.20261023.1 and Chromium (Playwright). On Cloudflare Workers, use Node.js compatibility (on by default from compatibility date 2026-08-04; nodejs_compat before that) or the nodejs_als flag alone for modern-debug/node.

## Install

modern-debug is not on npm yet (checked 2026-10-30). Until 1.0.0 ships, build and pack it locally.

```sh
git clone https://github.com/ABCrimson/modern-debug && cd modern-debug && pnpm install && pnpm -C packages/modern-debug build && pnpm -C packages/modern-debug pack
```

Building the repo needs Node ≥ 24.22.2 and pnpm 12.17.0 (packageManager pin; pnpm self-switches); consumers need Node ≥ 22.13.0. The pack step writes packages/modern-debug/modern-debug-0.0.1.tgz; install it in your project with `pnpm add <path-to-clone>/packages/modern-debug/modern-debug-0.0.1.tgz`.

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

```ndjson
{"t":1752170000000,"ns":"app:db","msg":"slow query","sev":40,"ms":240}
```

## Migrate your whole dependency tree

```yaml
# pnpm-workspace.yaml (pnpm)
overrides:
  debug: npm:modern-debug@^1.0.0
```

pnpm 12 reads overrides from pnpm-workspace.yaml and ignores package.json#pnpm (pnpm 12 changelog). npm and Bun use top-level `overrides` in package.json; Bun also honors yarn-style `resolutions` (Bun docs, read 2026-10-30).

The alias resolves once 1.0.0 is published.

`modern-debug/compat` is API-compatible with `debug` 4.4.3 — printf formatters, custom
`debug.formatters`, `.enabled`, `.extend()`, `.log` overrides, same color hash — enforced by
a golden differential suite that byte-compares against the real package, and validated
against express 5, send, and socket.io.

## Subpaths

| Import                | What it adds                                       | Size budget (min+brotli) |
| --------------------- | -------------------------------------------------- | ------------------------ |
| `modern-debug`        | core: createDebug/enable/disable/enabled/configure | ≤1536 B                  |
| `modern-debug/compat` | the full debug 4.4.3 surface                       | ≤1800 B                  |
| `modern-debug/otel`   | `trace_id`/`span_id` from the active OTel span     | ≤512 B                   |
| `modern-debug/node`   | `scope(fields, fn)` via AsyncLocalStorage          | ≤448 B                   |

Measured: core 1460 B, compat 1753 B, otel 249 B, node 132 B (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30).

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
  sink: (line) => transport.push(line), // default: stderr (console.error where stderr is absent)
  time: 'diff', // pretty only: 'diff' | 'epoch' | 'none'
  colors: true, // pretty only: default TTY-detect
})
```

Replace semantics: each call sets the whole config; `configure({})` restores defaults.
`MODERN_DEBUG_FORMAT=pretty|ndjson` overrides auto-detection.

## Guarantees

- **Disabled namespaces are near-free** — one shared-noop dispatch. A disabled call costs 0.188× (Node 26 line) and 0.229× (Node 24 line) of `debug`'s disabled call (mitata, worst of 5 runs, measured 2026-07-14 on Node 26.5.0 and 24.18.0; see
  [bench/RESULTS.md](https://github.com/ABCrimson/modern-debug/blob/main/bench/RESULTS.md)). CI re-measures on Node 26.13.0 and 24.22.2.
- **Logging never throws** — BigInt, circular refs, hostile getters degrade to a marker or
  drop the line; your code never crashes because of what it logged.
- **The matcher is linear-time** — adversarial multi-wildcard `DEBUG` patterns cannot freeze
  your process.
- **Zero runtime dependencies.** ESM-only. `require('modern-debug')` (and the aliased
  `require('debug')`) yields the `debug`-compatible compat factory on Node ≥ 22.13.0 via
  `require(esm)`; the core named-export API and `/otel` are ESM-`import` only —
  `require('modern-debug/otel')` throws `ERR_REQUIRE_ASYNC_MODULE`.

MIT © 2026 Albert Badalov. [License](https://github.com/ABCrimson/modern-debug/blob/main/packages/modern-debug/LICENSE). Full documentation: https://abcrimson.github.io/modern-debug/
