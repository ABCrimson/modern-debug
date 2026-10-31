---
layout: home
hero:
  name: modern-debug
  text: The debug you know, rebuilt for 2026
  tagline: Sub-2KB core · NDJSON by default off a TTY · OpenTelemetry correlation · AsyncLocalStorage scoping · identical DEBUG grammar
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/quickstart
    - theme: alt
      text: Migrate from debug
      link: /guide/migration
features:
  - title: The grammar that won
    details: app:db-style namespaces, DEBUG env patterns, wildcards and negation. The grammar is debug 4.4.3's, checked by a differential suite against the real package.
  - title: Structured where it matters
    details: A TTY gets classic colored output. Everything else gets one flat NDJSON record per line, with pino-compatible severity numbers.
  - title: Observability-native
    details: trace_id/span_id from the active OpenTelemetry span, and per-request fields via AsyncLocalStorage. Both are opt-in subpaths outside the core budget.
  - title: Tested on every runtime it claims
    details: 'CI: Node 24.22.2 and 26.13.0 on Ubuntu, Windows and macOS (blocking), Node 27.0.0-alpha.0.0.0 (non-blocking), a Node 22.13.0 floor job, Bun, Deno 2, Cloudflare workerd 1.20261023.1 and Chromium (Playwright) (ci.yml, read 2026-10-30).'
---

::: warning Pre-release
modern-debug is not on npm yet (checked 2026-10-30). Until 1.0.0 ships, build and pack it
locally: see the [Quickstart](./guide/quickstart).
:::

## Why replace `debug`?

`debug` has ≈939M downloads/week (npm API, week ending 2026-10-29), one of the most-downloaded
packages on npm. Its last release is 4.4.3 (2025-09-13, npm registry, read 2026-10-30). It is CommonJS only. It has no JSON
mode, no levels, no trace correlation and no async-context awareness.

`modern-debug` keeps the two things that made `debug` win: the namespace grammar and a
near-zero disabled path. It rebuilds the rest as ESM with zero runtime dependencies.

## Measured, not claimed

Bench (mitata 1.0.34, worst of 5 runs, `bench/RESULTS.md` generated 2026-07-14 on Node 26.5.0
and 24.18.0; not regenerated since). A gate passes only if the
worst of 5 runs clears it. Each ratio pairs both sides inside one child process.

| Path                | gate                    | Node 26 line | Node 24 line |
| ------------------- | ----------------------- | ------------ | ------------ |
| disabled call       | cost ≤ 1.05× debug      | 0.188× debug | 0.229× debug |
| enabled pretty line | throughput ≥ 1.5× debug | 10.41× debug | 7.02× debug  |
| NDJSON record       | throughput ≥ 0.8× pino  | 1.91× pino   | 1.42× pino   |

CI re-measures on Node 26.13.0 and 24.22.2 on every push and uploads `RESULTS.md` as the
`bench-results` artifact. Both sides of the pretty comparison run their colored TTY-style
path. Reproduction commands are in `bench/RESULTS.md`.

The disabled path is the product. A disabled namespace dispatches to one shared noop: no
allocation and no format work. It is re-evaluated only when `enable()` or `configure()` runs.

Tests: 358 (vitest 5.1.0-beta.1, 2026-10-30): 342 in the package suite, 6 in Chromium, 4 in the
workerd pool and 6 on raw miniflare.

## Size

Measured with size-limit 14.3.0, rolldown, min+brotli, 2026-10-30. The `modern-debug` row is the
cost of `import { createDebug }`; the subpath rows measure the whole entry file.

| Entry                 | budget | measured | headroom |
| --------------------- | ------ | -------- | -------- |
| `modern-debug`        | 1536 B | 1460 B   | 76 B     |
| `modern-debug/compat` | 1800 B | 1753 B   | 47 B     |
| `modern-debug/otel`   | 512 B  | 249 B    | 263 B    |
| `modern-debug/node`   | 448 B  | 132 B    | 316 B    |

For other loggers measured the same way, see the [Comparison](./guide/comparison).
