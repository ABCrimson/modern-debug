---
layout: home
hero:
  name: modern-debug
  text: The debug you know, rebuilt for 2026
  tagline: Sub-2KB core · NDJSON by default in production · OpenTelemetry correlation · AsyncLocalStorage scoping · identical DEBUG grammar
  actions:
    - theme: brand
      text: Quickstart
      link: /guide/quickstart
    - theme: alt
      text: Migrate from debug
      link: /guide/migration
features:
  - title: The grammar that won
    details: app:db-style namespaces, DEBUG env patterns, wildcards and negation — byte-for-byte the debug 4.4.3 grammar, verified by a differential suite against the real thing.
  - title: Structured where it matters
    details: TTY gets classic colored output; everything else gets one flat NDJSON record per line, pino-compatible severities included.
  - title: Observability-native
    details: trace_id/span_id from the active OpenTelemetry span; per-request fields via AsyncLocalStorage. Both opt-in, both outside the core budget.
  - title: Universal, proven
    details: Node 24/26, Bun, Deno 2, Cloudflare workerd and evergreen browsers — exercised in CI, not claimed.
---

## Why replace `debug`?

`debug` is the most-installed utility on npm (~300M weekly downloads) and its architecture froze
in 2014. It has no JSON mode, no levels, no trace correlation, no async-context awareness, and no
tree-shakeable ESM build. `modern-debug` keeps the two things that made it win — the namespace
grammar and a near-zero disabled path — and rebuilds everything else.

## Measured, not claimed

Numbers from `bench/RESULTS.md` (mitata, Node 26.5.0 medians; gates hold on the *worst* of
5 runs and are also enforced on Node 24.18.0 — reproduction commands in the repo):

| Path | modern-debug | baseline | gate |
| --- | --- | --- | --- |
| disabled call | 1.1 ns | debug: 6.2 ns | ≤1.05× debug — **5.6× faster** |
| enabled pretty line | 78 ns | debug: 853 ns | ≥1.5× debug — **10.6× faster** |
| NDJSON record | 163 ns | pino: 337 ns | ≥0.8× pino — **2.0×** |

Both sides of the pretty comparison run their colored TTY-style path — the honest
apples-to-apples after review round three retired an unfair non-TTY baseline.

The disabled path is the product: a disabled namespace dispatches to one shared noop —
no allocation, no format work, re-evaluated only when `enable()`/`configure()` run.

## Size

| Entry | budget (min+brotli) | measured |
| --- | --- | --- |
| `modern-debug` | 1536 B | 1524 B |
| `modern-debug/compat` | 1800 B | 1790 B |
| `modern-debug/otel` | 512 B | 240 B |
| `modern-debug/node` | 448 B | 148 B |
