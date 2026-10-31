# Divergence notes

Parity with `debug` 4.4.3 is defined by the golden differential suite — these are the places
behavior deliberately differs, each recorded in the repo's `DECISIONS.md`.

## Grammar & matching

- **Identical grammar, same algorithm.** The matcher ports `debug` 4.4.3's linear-time
  template walk. Like 4.4.x (and unlike 4.3.x), there is no trailing-`*` shortcut in `enabled()`.

## Compat surface (`modern-debug/compat`)

- **Colors**: the 256-color palette is always used. `debug` 4.4.3 starts from a 6-color
  palette and switches to the same 256-color palette only when the optional peer
  `supports-color` is installed and reports level ≥ 2 (debug 4.4.3 `src/node.js:27-35`).
  With it a namespace gets the same color as in `debug`; without it `debug` picks from 6
  colors and compat does not. We don't ship that dependency.
- **`destroy()`** is a no-op in `debug` 4.4.3 too, but `debug` warns once (Node: one
  `DeprecationWarning` via `util.deprecate`, silenced by `--no-deprecation`; browser: one
  `console.warn`). Compat calls `console.warn` with a shorter message on every call.
- **`humanize()` is the inlined `ms` short formatter only** — no `{long: true}` option, no
  string parsing (`humanize('2 days')` does not become `172800000`). Real `debug`'s
  `humanize` is the full `ms` package; ours is a byte-budget inline of `ms`'s `fmtShort`.
- **Non-Node runtimes**: printf's second pass and `%o`/`%O` use `node:util` where
  `process.getBuiltinModule` exists (Node, Bun, Deno 2). Elsewhere compat does not mimic
  `debug`'s browser build. It writes `<ISO date> ns msg` lines (no `+Nms`, no `%c` colors) to
  `console.error` (`debug` uses `console.debug`). `%o`/`%O` become JSON. The pattern is read
  only from `localStorage.debug`, with no `DEBUG` fallback.
- **Not provided on the compat factory**: `createDebug.init`, a public `createDebug.namespaces`
  field and a static `createDebug.destroy` (the per-instance `destroy()` exists). Adding them is
  estimated at +14 B against 47 B of `./compat` headroom (DECISIONS G-17).
- **Alias + ESM**: `import debug from 'debug'` under the override is not supported in v1;
  the alias serves the CJS `require` path (which is how the debug ecosystem consumes it).

## Core output

- **NDJSON envelope keys win** over same-named user fields (dropped, not overwritten).
- **Unserializable fields degrade** to `{"$fields":"unserializable"}` instead of throwing;
  pathological field getters drop the line. Logging never crashes the caller.
- **Lone surrogates** are escaped to well-formed JSON (ES2019 `JSON.stringify` semantics).
- **`configure()` replaces** the entire configuration on every call; `configure({})` resets.

## Timing

- Pretty diffs use `performance.now()`. On Cloudflare Workers, timers only advance on I/O
  (Spectre mitigation), so `+Nms` may read `+0ms` inside a request — the NDJSON `t` field
  (epoch ms) is the machine-trustworthy timestamp there.

## Workers default sink

- Under Node.js compatibility (on by default from compatibility date 2026-08-04;
  nodejs_compat before that), the default sink selects `process.stderr.write` (LD-11).
  workerd reports each line as one structured log entry at level `log` whose message starts
  with `stderr: `; no level `error` entry carries it, and it is not raw stderr bytes from a
  process. That prefix is the only trace of the stream. Deployments that route logs by level or
  by real stderr should set an explicit `configure({ sink })`.
- With Node.js compatibility opted out (`no_nodejs_compat` and `no_nodejs_compat_v2`) there
  is no `process` global and output goes to `console.error`.
- Both paths run on raw workerd 1.20261023.1 (miniflare 5.20261023.3-beta, 2026-10-30) in
  `tests-workers/test-miniflare/default-sink.test.ts`.

## Environment detection & typings

- **Storage-rung scoping.** The `localStorage` rung of the `DEBUG` ladder (LD-09) is
  browser-scoped — it is never consulted where `process.env` exists. On Node ≥26 this avoids
  a `debug`-divergent `ExperimentalWarning` at startup (real `debug` 4.4.3's Node build reads
  only `process.env.DEBUG`, never `localStorage`). Caveat: browser bundles that polyfill
  `process.env` will suppress the `localStorage` rung too — use `globalThis.DEBUG` or
  `configure()` there instead.
- **Typed alias consumers.** `require('debug')`-style TypeScript consumers of the `.` require
  condition get accurate callable types on TypeScript ≥5.3 (gated in CI against TS 5.8); TS
  <5.3 cannot parse the shipped `.d.cts` — a type-checking-only limitation, runtime behavior
  is unaffected.
