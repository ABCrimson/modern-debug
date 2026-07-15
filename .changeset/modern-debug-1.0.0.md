---
"modern-debug": major
---

Ship modern-debug 1.0.0: a sub-2KB ESM-only universal diagnostic logger providing byte-exact
`debug` 4.4.3 namespace/matcher/color-hash grammar parity (LD-04/06), structured NDJSON output
(LD-07), OpenTelemetry trace/span correlation via the `./otel` subpath (LD-08), and Node
`AsyncLocalStorage` request scoping via the `./node` subpath. Includes the `./compat` drop-in
`debug`-compatible factory and the `.`-entry `require` alias recipe (§7) that lets legacy CJS
consumers install this package under the `debug` name with zero code changes.

This is the first stable release: all §12 Definition of Done gates are green (size, golden
differential, bench thresholds, coverage, publint/attw/knip), so the public API surface —
`createDebug`, `enable`/`disable`/`enabled`, `configure`, `.warn`/`.error` levels, `.extend`,
`.fields`, and the four subpath exports (`.`, `./compat`, `./otel`, `./node`) — is now frozen
under semver. Breaking changes from the 0.x line going forward require a major bump.
