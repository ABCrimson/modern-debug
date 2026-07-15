# Divergence notes

Parity with `debug` 4.4.3 is defined by the golden differential suite — these are the places
behavior deliberately differs, each recorded in the repo's `DECISIONS.md`.

## Grammar & matching

- **Identical grammar, different engine.** The matcher is `debug` 4.4.3's linear template
  walk. Like 4.4.x (and unlike 4.3.x), there is no trailing-`*` shortcut in `enabled()`.

## Compat surface (`modern-debug/compat`)

- **Colors**: the 256-color palette is always used (same hash → same color as `debug` on a
  256-color terminal). `debug` degrades to 6 colors via `supports-color` on dumb terminals;
  we don't ship that dependency.
- **`destroy()`** warns with a shorter message; it is a no-op in `debug` 4.4.3 too.
- **`humanize()` is the inlined `ms` short formatter only** — no `{long: true}` option, no
  string parsing (`humanize('2 days')` does not become `172800000`). Real `debug`'s
  `humanize` is the full `ms` package; ours is a byte-budget inline of `ms`'s `fmtShort`.
- **Non-Node runtimes**: printf's second pass and `%o`/`%O` use `node:util` where
  `process.getBuiltinModule` exists (Node, Bun, Deno 2). Elsewhere compat hands args to the
  console like `debug`'s own browser build.
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

- On workerd with `nodejs_compat`, the default sink selects `process.stderr.write` (LD-11),
  but workerd routes it through the runtime's *labeled log stream* (visible in
  `wrangler dev` / `wrangler tail`), not as raw stderr bytes from the process. Deployments
  that ship logs by piping real stderr should set an explicit `configure({ sink })`.
  Without `nodejs_compat` there is no `process` global and output goes to `console.error`.
  Both paths are proven on real workerd in the test suite.

## v1.0 review round three

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
