# DECISIONS.md — append-only

Locked Decisions LD-01…LD-18 are defined in `01-modern-debug-CLAUDE.md` §2 and are restated here
by ID as the seed of this log. Nothing below may contradict them without a superseding entry
explicitly marked as such.

## Seed (2026-07-10)

- **LD-01** ESM-only; exports map `"."`, `"./compat"`, `"./otel"`, `"./node"`; no `main`, no CJS.
- **LD-02** Zero runtime dependencies in all four subpaths.
- **LD-03** No WASM.
- **LD-04** Matcher compiles pattern set once to `{allow, deny}` RegExp pair; exact `debug` 4.4.3 grammar.
- **LD-05** Disabled namespaces return a shared noop; re-evaluation only on `enable()`/`configure()`.
- **LD-06** Pretty colors use `debug` 4.4.3's exact hash and ANSI-256 palette.
- **LD-07** NDJSON shape `{"t","ns","msg","sev"?,"trace_id"?,"span_id"?,...fields}`, flat, fixed key order.
- **LD-08** `@opentelemetry/api` optional peer `^1.9.1`, imported only in `/otel`.
- **LD-09** Env ladder: `enable()` > `process.env.DEBUG` > `globalThis.DEBUG` > `localStorage.debug` > off.
- **LD-10** Format auto-detect: TTY → pretty, else NDJSON; override via `configure({format})` / `MODERN_DEBUG_FORMAT`.
- **LD-11** Default sink `process.stderr.write`, else `console.error`.
- **LD-12** TypeScript 7.0.2 (native), tsdown 0.22.4 (rolldown 1.1.5), d.ts via isolatedDeclarations.
- **LD-13** vitest 5.0.0-beta.6 everywhere except `tests-workers/` (vitest 4.1.10 + pool-workers island).
- **LD-14** mitata 1.0.34 benches; fast-check 4.9.0 property tests.
- **LD-15** `sideEffects: false`; no top-level mutable state except the lazy matcher singleton.
- **LD-16** Levels (`.warn`/`.error`) live in core iff they cost ≤48 B; else move to `/levels`.
- **LD-17** Pretty time = `+Nms` via `performance.now()`; NDJSON = `Date.now()` epoch-ms.
- **LD-18** changesets 2.31.0 (GA); upgrade trigger: changesets 3 GA.

## Genesis log

### G-01 · 2026-07-10 · Phase 0 re-verify (§3.6) — drift adopted
Ran the re-verify block against registry.npmjs.org, nodejs.org, and api.github.com. Deltas
(all same-channel, adopted per §0.2):

| Package | Spec pin | Adopted | Note |
|---|---|---|---|
| @cloudflare/vitest-pool-workers | 0.18.2 | **0.18.4** | peers still `vitest ^4.1.0` → island stays vitest 4.1.10 (LD-13 intact); transitives now miniflare 4.20260708.1 / wrangler 4.110.0 |
| @arethetypeswrong/cli | 0.18.4 | **0.18.5** | |
| knip | 6.25.0 | **6.26.0** | |
| pnpm | 11.10.0 | **11.11.0** | `packageManager` pins exact; pnpm self-switches |

All other §3 pins verified unchanged (typescript 7.0.2, tsdown 0.22.4, rolldown 1.1.5,
biome 2.5.3, vitest 5.0.0-beta.6 line, playwright 1.61.1, happy-dom 20.10.6, fast-check 4.9.0,
mitata 1.0.34, size-limit 12.1.0, publint 0.3.21, lefthook 2.1.10, changesets 2.31.0,
turbo 2.10.4, vitepress 2.0.0-alpha.18, shiki 4.3.1, @types/node 26.1.1, otel-api 1.9.1,
debug 4.4.3, pino 10.3.1). Node 26.5.0 Current / 24.18.0 LTS confirmed newest on nodejs.org.
§3.7 action pins all confirmed still-latest (checkout v7.0.0, setup-node v6.4.0,
pnpm/action-setup v6.0.9, setup-bun v2.2.0, setup-deno v2.0.5, changesets/action v1.9.0).

### G-02 · 2026-07-10 · Standing directive: Rust channel
User directive: if Rust enters this project at any point, use **Rust beta 1.98**. Currently no
Rust anywhere — LD-03 forbids WASM, and the Rust-built tools we consume (rolldown, biome) ship
as prebuilt npm binaries requiring no local toolchain.

### G-03 · 2026-07-10 · Repo initialized at genesis
`git init -b main` run as part of Phase 0 (lefthook hooks and the CI/release workflows require a
repo). Commits deferred until the user asks.

### G-04 · 2026-07-10 · Docs island scaffolded, build deferred
`docs/` carries the pinned vitepress 2.0.0-alpha.18 + shiki 4.3.1 deps so they lock into the
lockfile now, but has no `build` script until the 0.9.0 docs phase — an alpha docs build must not
be able to redden `pnpm verify` before docs exist.

### G-05 · 2026-07-10 · `repository` field deferred
No GitHub remote exists yet. npm provenance (mandatory from 0.1.0 publishes) requires a
`repository` field matching the CI origin — add it the moment the remote is created, before any
publish.

### G-06 · 2026-07-10 · Phase 0 gate green; three tool API shapes newer than spec prose
`pnpm verify` = 8/8 tasks green on the empty lib (0.0.1 gate met). Three current API shapes
differ from what the spec's tooling notes implied; all conform to the LDs:
- tsdown 0.22.4: d.ts oxc path is selected via `dts: { generator: 'oxc' }` (there is no
  `isolatedDeclarations` dts option anymore); `external` is deprecated → `deps.neverBundle`.
- @cloudflare/vitest-pool-workers 0.18.4 (vitest 4 line): `defineWorkersConfig` is gone; the
  island wires the pool via the `cloudflareTest({ miniflare: {...} })` Vite plugin.
- biome 2.5.3: `linter.rules.recommended` deprecated → `rules.preset`, folder ignores without
  trailing `/**` (applied via `biome migrate`).
- typecheck is two programs: `tsc --noEmit` (src+test+configs) plus `tsc -p tsconfig.src.json`
  (src-only, `isolatedDeclarations: true`) because config-file default exports can't satisfy
  isolatedDeclarations inference (TS9037).
- tsdown 0.22.4 peers `typescript ^5||^6`; we run 7.0.2 (LD-12) → pnpm
  `peerDependencyRules.allowedVersions` override, safe because dts never goes through tsc here.

### G-07 · 2026-07-10 · 0.2.0 gate green — LD-05 interpretation, GC anchor, size golf
- **LD-05 "shared noop" interpretation:** literally returning one shared frozen noop from
  `createDebug` is incompatible with §5.1 (per-fn `ns`/`extend`/`fields`) and §6 (re-binding
  registry). Implemented as: every DebugFn is per-namespace, and its call body dispatches
  through a swapped internal ref that points at ONE module-shared noop while disabled —
  zero allocation, monomorphic dispatch target, re-evaluated only on `enable()`. The
  ≤1.05×-debug disabled-path gate at 0.7.0 validates the cost.
- **Registry GC anchor:** the §6 WeakRef registry targets the DebugFn itself, with the rebind
  closure anchored on the fn as non-enumerable `_r`. First draft WeakRef'd a side object
  nothing else referenced — collectible, so `enable()` would silently stop re-binding live
  instances after a GC pass.
- **debug 4.4.3 oracle facts encoded in tests:** 4.4.x has NO trailing-`*` shortcut in
  `enabled()` (4.3.x did); split is `trim().replace(/\s+/g,',').split(',').filter(Boolean)`;
  skips are checked before names; templates are literal globs (regex metachars inert).
- **Size:** core = 1014 B brotli vs 1024 limit after: palette delta-encoding (76-number array →
  75-char delta string over alphabet [1,5,11,13,15] + decoder), tuple pretty-bindings, merged
  ternaries. **0.3.0 risk flagged:** NDJSON + configure() + levels must fit the same 1024 B.
  LD-16's `/levels` escape hatch stands ready; if the budget still cannot hold, the honesty
  rule applies (measure, record, surface — never weaken the gate).

### G-08 · 2026-07-10 · Adversarial review round (0.1–0.2 code) — findings and fixes
36-agent review workflow (4 lenses → 2 refuters per finding). 19 verifier agents died on a
session limit, so unrefuted correctness/portability findings were **hand-verified by
reproduction** before any fix landed. Confirmed and fixed:
- **LD-04 AMENDED — ReDoS.** Compiling `*` to regex `.*` chains is catastrophically
  backtracking: measured 545 ms for a 12-wildcard segment vs a 28-char non-matching
  namespace, effectively hung at 34 chars. This is the same reason debug itself dropped
  regex matching in 4.4.0. The matcher now compiles to an allow/deny **template pair**
  matched with debug 4.4.3's linear `matchesTemplate` walk (O(n·m) worst case). Grammar
  parity unchanged — same oracle table + 5000-pair differential property gate. A regression
  test asserts the hostile pattern completes in <250 ms.
- **Unguarded `JSON.stringify(fields)`** crashed the *caller* on BigInt / circular refs /
  throwing `toJSON` (all reproduced). Both formatters now degrade to
  `{"$fields":"unserializable"}` via `safeJson` — a logger must never throw over data shape.
- **`extend()` dropped `.fields()` base fields** — now inherits them (`.fields({x}).extend('s')`
  keeps x). Test added.
- **WeakRef-absent fallback** was a permanent strong ref; now implements §6's actual
  re-check-on-call strategy (no registry entry; every call re-resolves). Tested via fresh
  module import with WeakRef stubbed out.
- **globalThis.DEBUG rung** now exception-guarded like its ladder neighbors.
- **Registry eviction:** dead WeakRefs are swept amortized (every 256th createDebug) so warm
  workerd isolates that never call enable()/configure() cannot grow the Set unboundedly.
- **Default sink** feature-detect hoisted to module load and requires a callable
  `process.stderr.write` (LD-11 refined).
Refuted / deferred with rationale: `.enabled` live-getter cost (spec-mandated by §5.1),
per-call base-merge branch and rebind rebuild cost (bench gate at 0.7.0 arbitrates),
workerd `process.stderr` fidelity (empirical island test due at 0.6.0 — OPEN),
`performance.now()` frozen between I/O on workerd (docs divergence note due 0.9.0 — OPEN).
LD-15 restated: sanctioned global-config module state = matcher singleton + configure()
snapshot + WeakRef registry (+ `send`-level constants). Nothing per-request lives at
module level.

### G-09 · 2026-07-10 · LD-16 measured (levels stay); §8.5 core size gate CANNOT BE MET — honesty rule invoked
- **LD-16 decision by measurement:** `.warn`/`.error` cost **9 B brotli** (whole-file with:
  1545 B, without: 1536 B) — well under the 48 B ceiling ⇒ **levels stay in core**.
- **Size gate status (measured 2026-07-10):**
  - `.` gate measures the §1 pillar definition — tree-shaken cost of
    `import { createDebug }` (size-limit `import` spec, esbuild + brotli): **1439 B vs
    1024 B limit (+415 B)**.
  - Whole-file `dist/index.js`: 3276 B raw / 1545 B brotli.
  - For reference, the 0.2.0-scope core (pretty only, no configure/NDJSON/levels) measured
    **1014 B — under the gate**.
- **Blocking cause:** the 0.3.0 feature set the spec itself mandates in core — LD-07 NDJSON
  envelope (with reserved-key protection and escape fast path), §5.1 `configure()` (sink,
  format, time diff/epoch/none, colors), the LD-10 resolution ladder incl.
  `MODERN_DEBUG_FORMAT`, LD-16 levels, plus the G-08 safety hardening — has a compressed
  floor around ~1.4 KB. Golf already applied: palette delta-encoding, specialized emit
  closures (no formatter indirection), merged env readers, `normalized` reconstruction moved
  into `disable()` (tree-shakes out of the pillar bundle), rest-destructure reserved-key
  guard, tuple elimination, amortized sweep sharing. Remaining reachable golf is single-digit
  bytes against a 415 B gap.
- **Action per §0.2/§0.5:** the gate is NOT weakened and NOT waived; `modern-debug#size`
  stays red; per §0.3 phases 0.4.0+ are NOT started. Surfaced to the project owner with
  options: (a) amend §8.5 core budget to 1536 B (recommended — compat's 1800 B budget shows
  ~1.5 KB was considered acceptable for a rich surface), (b) descope §5.1 Configure
  (`time`/`colors`) for an estimated −80–120 B (still over), (c) move NDJSON out of core
  (contradicts pillar 3 and LD-10 defaults), or (d) hold 0.3.0 as the budget-true scope and
  re-plan. Awaiting owner decision.

### G-10 · 2026-07-10 · Owner decision: §8.5 core budget amended 1024 B → 1536 B
Owner approved option (a) ("I agree with everything you recommend") — the `.` gate becomes
**1536 B min+brotli**, measured as the §1 pillar defines (tree-shaken cost of
`import { createDebug }`). Subpath budgets unchanged (compat 1800 / otel 512 / node 448).
The spec file's §1, §8.5 and §12 lines are edited with an explicit "amended per G-10" marker
so future re-reads don't resurrect the stale number. Phase progression resumes at 0.4.0.

### G-11 · 2026-07-10 · 0.4.0 + 0.5.0 gates green
**0.4.0 (/node + /otel):**
- Cross-entry wiring lives in a dedicated `src/hooks.ts` (mutable provider slots) so subpath
  bundles never pull core: rolldown splits it into one shared chunk (a dist-integration test
  guards against per-entry copies, which would silently break scope/trace injection).
- Measured: otel 240/512 B, node 148/448 B, core 1476/1536 B after ctx+trace emit wiring.
- /otel uses top-level await so an absent peer fails at import with an install hint (tested
  via a throwing module mock). /node nested scopes merge with inner-wins; field precedence is
  scope < fields() base < call fields. Workers island proves the ALS presence path on real
  workerd; the nodejs_compat-absent path is a 0.6.0 item.
**0.5.0 (/compat):**
- Golden differential is 100%: 41 plain + 4 colored cases byte-match debug 4.4.3, with the
  oracle run LIVE in-process under identical env (DEBUG_HIDE_DATE, fresh instance ⇒ +0ms) —
  immune to util.inspect drift across Node majors; `format-golden.json` is committed as the
  reviewable artifact, not the gate.
- printf second pass and %o/%O go through node:util obtained via `process.getBuiltinModule`
  (present on the Node ≥20.19 floor; guarded elsewhere). Non-Node fallback: console passthrough
  + JSON formatters — documented divergence mirroring debug's own browser split.
- Divergences (documented): default colors are always the LD-06 256-color palette (no
  supports-color tiering); destroy() warns a shorter message; humanize inlines ms fmtShort.
- compat measured 1796/1800 B. size-limit config moved to `.size-limit.mjs` for per-entry
  esbuild settings (ESM output for /otel's TLA, node platform for node:async_hooks).

### G-12 · 2026-07-10 · 0.6.0 + 0.7.0 + 0.8.0 gates green; review round two resolved
**Review round two (0.3–0.5 code):** 28/28 agents, zero verifier losses (votes now counted —
a zero-vote finding reads UNVERIFIED). Outcome: 0 confirmed, 2 contested, both fixed after
hand-verification: (a) the reserved-key rest-destructure could crash the caller on a throwing
getter or a runtime `null` fields value — now null-guarded + try/caught, plus a last-resort
try/catch in the emit dispatcher because merge()'s spreads also invoke user getters (G-08 rule:
a logger never crashes over data shape; pathological throws drop the line); (b) esc()'s fast
path let lone surrogates through raw where the JSON.stringify slow path escapes them (ES2019
well-formed) — the scan now routes any surrogate to the slow path, keeping output well-formed
at the cost of the fast path for emoji-bearing strings. All other findings refuted with
recorded rationale (configure() replace semantics documented; otel TLA behavior intended;
regex literals are not per-call recompiled; Bun runs the util path — proven by smoke).
**0.6.0 runtime matrix, proven locally:** Node 26.5.0 (148 tests + smoke) · Bun 1.3.14 (smoke,
util path) · Deno 2.9.2 (smoke, util path) · chromium via @vitest/browser 5.0.0-beta.6 +
@vitest/browser-playwright (6/6; provider API is now a factory import) · workerd via the pool
island AND raw miniflare booting the real dist with nodejs_compat on/off (§5.4 both paths —
note: vitest-pool-workers masks compat flags for its own runner, so the absence path is only
testable via raw miniflare). Portable bun/deno binaries used locally; CI runs the same smoke
via setup-bun/setup-deno. Bun/Deno legs deviate from §10's "vitest bridge" sketch — a native
smoke against the built dist is sturdier than runner shims; recorded as intended.
**0.7.0 bench gates (ENFORCED, bench/RESULTS.md):** disabled 0.087× debug (≤1.05×) ·
pretty 21.85× debug throughput (≥1.5×) · ndjson 1.34–4.8× pino across runs (≥0.8×). Method
notes: suites run in separate processes (enable/configure are global state and mitata defers
execution to run() — co-hosted suites cross-contaminate and produced a bogus 13843× before
isolation); the disabled suite uses rotating args + do_not_optimize (0.1 ns = DCE artifact).
**0.8.0 alias (LD-01 nuance):** "." gained a `require` condition mapping to dist/compat-cjs.js —
an ESM file whose literal 'module.exports' export Node ≥20.19 unwraps, so `require('debug')`
under the override yields the compat factory. No CJS artifact is shipped; LD-01's "no CJS"
stands, its "no require condition" letter is amended (without this the §7 alias recipe cannot
serve the CJS install base — i.e. all of it). ESM `import debug from 'debug'` under the alias
is NOT supported in v1 (documented divergence). Fixture locked: express 5.2.1, send 1.2.1,
socket.io(-client) 4.8.3 — all log through the override (express 5's router logs under the
standalone `router:*` namespaces, not `express:router`). Fixture installs with
`--ignore-workspace` (it must resolve standalone).

### G-13 · 2026-07-10 · 0.9.0 + 0.9.x complete — §12 Definition of Done status
**0.9.0 docs:** VitePress 2.0.0-alpha.18 + shiki 4.3.1, OKLCH dark-glass theme,
Fraunces/Geist/JetBrains Mono via fontsource (the `geist` npm package is Next-only — it
imports next/font and cannot build outside Next; @fontsource-variable/geist used instead).
All §11 pages present incl. the live bench table and divergence notes; API reference embeds
the shipped d.ts via snippet includes; build + dead-link check green in 1.45 s. Docs build is
part of `turbo run build` (docs depends on modern-debug so ^build orders the d.ts).
**0.9.x hardening:** matcher fuzz at 10⁶ random pattern/namespace pairs vs the live debug
4.4.3 oracle — PASSED in 13.4 s (MATCHER_FUZZ_RUNS knob on the property suite). npm pack
audit clean: tarball = LICENSE + README + dist (5 entries, 3 hashed chunks, d.ts) +
package.json, nothing else. README (API freeze) + LICENSE added. Coverage gate (§8.7)
measured and now threshold-enforced in vitest config + CI: matcher/env/format-pretty/
format-ndjson at 100% lines, package-wide 92.7% (compat's uncovered branch is its non-Node
fallback, exercised by the browser suite).
**§12 checklist status:**
- [x] §8 gates enforced and green (locally; the CI matrix needs a GitHub remote to run)
- [x] Size: 1536(G-10)/1800/512/448 hold — measured 1472/1796/240/148
- [x] Golden differential vs debug 4.4.3: 100% (45/45 live byte-matches)
- [x] bench/RESULTS.md committed with reproduction commands
- [x] publint + attw + knip-config clean; DECISIONS reconciled
- [ ] **External, cannot be done from this machine:** GitHub remote (then add `repository`
  field per G-05), npm publish with provenance under OIDC, docs deployment, and the 0.9.x
  "zero P1s for 7 days" calendar soak. These are the only items between HEAD and 1.0.0.

### G-14 · 2026-07-11 · Review round three (0.6–0.9.x surface) — 29 findings resolved; soak day 1
Rounds one (G-08) and two (G-12) covered 0.1–0.5; this round adversarially reviewed the
never-reviewed 0.6–0.9.x surface: 96 agents (8 lenses → dedup → 3 refuters per finding →
completeness critic). 35 raw → 29 unique; **27 CONFIRMED (4 P1), 2 contested, 0 refuted** —
every finding survived verification. All confirmed findings fixed same-day; every fix landed
test-first where a runtime surface exists.

**P1s (all fixed):**
- ci.yml workers job had no build step — failed on every fresh runner. Added (mirrors bun/deno).
- release.yml published without building dist → would ship an empty package once G-05's
  repository field lands. Now: G-05 preflight guard (fails if `repository` missing) →
  install → build → full `pnpm verify` → 10⁶ matcher fuzz → changesets/action whose publish
  command self-builds (`file:`/action git churn cannot leave publish dist-less).
- **knip gate was RED at HEAD while G-13 recorded it clean** — honesty correction: the bench
  entry glob (`*.bench.ts`) matched nothing. Fixed entries (tsdown/vitepress plugins make
  manual entries redundant); every remaining item root-caused, not blanket-ignored (GH-Actions
  plugin is root-only and cannot see `pnpm -C` scoping → 3 binaries + @playwright/test ignored
  with that recorded reason; `pino` used via inline createRequire knip cannot see; `shiki`
  exact-pin satellite of vitepress; `modern-debug` in bench/docs is a build-order edge only;
  tests-workers' second vitest config registered). `pnpm knip` now clean under EVERY issue
  category and wired into verify as `//#knip` — the §8.8 gate can no longer rot silently.
- package.json 0.0.1 with zero changesets → first push would auto-publish 0.0.1. A major
  changeset now stages **0.0.1 → 1.0.0** (verified via getReleasePlan(); `changeset status`
  itself cannot run in a zero-commit repo — known, per G-03).

**Drop-in parity (P2) — LD-09 interpretation refined:** with DEBUG unset, core and compat
touched `globalThis.localStorage` on load → Node ≥26 emits ExperimentalWarning at startup of
every consumer; real debug 4.4.3's node build is env-only and silent (reproduced both).
The storage rung is now **browser-scoped** (consulted only where `process.env` is absent) in
env.ts and compat load() — LD-09's own "browser localStorage.debug" wording, now enforced;
mirrors compat save()'s existing split. Gated by discriminating unit tests (getItem spies)
plus child-process dist tests asserting **empty stderr** for core import, compat import, and
the require alias with DEBUG unset. Caveat documented: bundler-polyfilled process.env
suppresses the rung (globalThis.DEBUG is the escape hatch). Bonus: compat shrank 6 B.

**Typed alias consumers (P2):** tsdown's compat-cjs.d.ts arbitrary-string export name parses
only on TS ≥5.9 (hard error ≤5.5, non-callable namespace on 5.8) — the exact legacy-TS
audience §7 targets. Now ship hand-authored `dist/compat-cjs.d.cts` (`export =` +
`resolution-mode` attribute; works on TS ≥5.3), copied by tsdown, pointed at by the "."
require types condition, and **gated by a real TS 5.8 compile** (new devDep
`typescript-legacy` = npm:typescript@5.8.3, exact-pinned — an oracle pin like debug 4.4.3,
not a channel pin). attw gained `--ignore-rules false-cjs`: attw cannot model Node's
'module.exports' unwrap (it flags CJS-types-over-ESM-impl categorically); the failure class
it would catch is gated harder by alias-require.test.ts (runtime) + alias-types.test.ts
(types). Also `CompatDebugger.enabled` is now `boolean` (@types/debug read parity; null
remains a runtime-accepted override-clearing write).

**G-08 fix inventory now discriminating-tested (P2/P3):** round three proved the amortized
registry sweep, the callable-stderr.write detect, and the WeakRef-absent fallback could all
be reverted with the suite staying green. New test/registry.test.ts: FakeWeakRef deref-count
sweep test, non-callable stderr → console.error fallback test, and a FinalizationRegistry
retention test under `--expose-gc` (vitest: `pool: 'forks'` + top-level `execArgv` — the
vitest 5 line moved execArgv out of poolOptions). Sweep and sink tests **mutation-verified**
(reverting each fix flips exactly its test red). Plus the alias twin of G-11's chunk guard:
compat.js and compat-cjs.js must share one implementation chunk, asserted statically and
behaviorally under Node's NATIVE loader in a child process — in-process vitest would load
the chunk through Vite a second time and mask a real split.

**G-08 OPEN item CLOSED — workerd stderr fidelity:** new raw-miniflare island test proves the
LD-11 detect empirically on both flag settings. With nodejs_compat, process.stderr.write is
selected and bytes surface — as workerd's **labeled log stream** (runtime stdout,
`stderr:`-prefixed; what wrangler dev/tail show), not raw stderr fd bytes. Without the flag,
console.error. Divergence note added to docs. No src change needed; LD-11 stands.

**Size honesty (critic gap):** G-13's recorded core 1472 B was a stale-dist measurement; the
round-start truth was 1516 B. After this round: **core 1524/1536 · compat 1790/1800 ·
otel 240/512 · node 148/448** (min+brotli; storage-rung guard +8 B core, load() split −6 B
compat). Docs/README size claims synced to measured. Also from the critic: mid-round
node_modules corruption was masked by turbo cache replay — the final gate below is
cache-busted (`--force`) on principle, and the golden-fixture blind spot is closed by adding
`$TURBO_ROOT$/fixtures/debug-golden/**` to the test task's inputs (cache-miss-on-touch
proven by experiment).

**Bench regime (P2/P3 + critic):** pretty suite's baseline unfairly measured debug's non-TTY
toISOString path and was env-sensitive — both sides now pinned to their colored TTY-style
path (DEBUG_COLORS/HIDE_DATE stripped pre-import). The G-12 single-shot numbers are retired
(21.85× was baseline-inflated). New margin policy in run-benches.mjs: **N=5 runs per suite,
gate passes only if the WORST run clears; ratios pair both sides within one child process**;
optional BENCH_EXTRA_NODE runs a second runtime with gates enforced. Measured 2026-07-11:
Node 26.5.0 worst-of-5 — disabled 0.188× (med 0.179) · pretty 10.41× (med 10.61) · ndjson
1.91× (med 2.04, spread 1.91–2.10 vs the old 1.34–4.8). Node 24.18.0 (first LTS measurement,
§6's dual-runtime gate finally real) — 0.229× · 7.02× · 1.42×. **All six gates PASS.**
CI gained a bench job (separate from the verify matrix; variance policy lives in RESULTS.md)
and an alias-fixture job (build BEFORE fixture install — `file:` deps snapshot at install
time, verified empirically; install-then-build yields a permanently empty package).

**Runtime floor validated for the first time** (fixes applied, same HEAD): Node 20.19.5 —
smoke green, alias fixture exit 0, require('modern-debug') unwrap + .default OK, zero
warnings; Node 24.18.0 — full suite 158/158 + smoke; Node 26.5.0 — 158/158; Bun 1.3.14 and
Deno 2.9.2 (portable) — smokes green; chromium browser suite 6/6; workerd island 2/2 pool +
4/4 miniflare. 10⁶ matcher fuzz re-run at post-fix HEAD: PASS in 11.5 s (and now wired into
release.yml so it cannot decay into an anecdote again).

**Docs/README corrections (P2/P3):** API reference now embeds the REAL declarations via
docs/resolve-dts.mjs (fails loudly unless exactly one chunk d.ts matches per entry) — the
old page showed 2-line mangled barrels; humanize divergence note added; bun alias recipe
added; README's "CJS consumers work" reworded (require('modern-debug') yields the compat
factory; core + /otel are ESM-only; /otel throws ERR_REQUIRE_ASYNC_MODULE under require);
oracle table is 81 rows not 87; two-instance alias/direct-dependency warning added; Node
floor prose separates the 20.19 engines floor from the tested matrix; bench table synced to
the new worst-of-5 numbers; test-browser + its config are now typechecked (single include —
no lib conflict).

**Contested, recorded without code change beyond the above:** (a) "bench gates in CI" had a
live §10-conformance counter-argument (sketch omits bench) — job added anyway, argument
recorded; (b) README floor wording — reworded.

**Final gate (this entry's close):** `pnpm install --frozen-lockfile` (no drift) +
`pnpm verify --force` (10 tasks incl. //#knip, zero cached) + `turbo run build --force`
(docs build + resolve-dts) — all green, sizes as recorded above. Round three cost:
~4.3M subagent tokens for the review workflow + 4 fix agents. Soak clock: day 1 of 7
(2026-07-11); P1 count at close: **0 known**.

### G-15 · 2026-07-14 · GitHub genesis — remote, CI matrix proven in the cloud, 1.0.0 staged
User granted GitHub access (soak day 4). External checklist executed:
- **Remote:** github.com/ABCrimson/modern-debug (public — npm provenance requires the public
  link). Genesis commit = the full Phase 0 → G-14 tree (97 files); per G-03, this is the
  repo's first commit. `repository` field added (with `directory` for the monorepo) — G-05
  CLOSED; publint clean with it.
- **Docs deployed** (§12 item): GitHub Pages via workflow (`.github/workflows/docs.yml`),
  VitePress `base: '/modern-debug/'`, live at https://abcrimson.github.io/modern-debug/ —
  green on every run. Pages action pins verified live 2026-07-14: configure-pages v6.0.0,
  upload-pages-artifact v5.0.0, deploy-pages v5.0.0 (§3.7-class pins, recorded here).
- **First-ever cloud CI: 4 fresh-runner defects found and fixed** (none reachable locally,
  all in harness/test code — product source untouched; the six pre-validated legs bun/deno/
  workers/browser/bench/alias-fixture were green from the genesis run):
  1. alias-types cleanup used `rmdirSync` on the link — POSIX creates a plain symlink
     (`ENOTDIR`); now platform-split rmdir/unlink, absent-link tolerant.
  2. Windows runners checkout with autocrlf → CRLF working copies reddened biome's format
     gate. `.gitattributes` (`* text=auto eol=lf`, png/zip binary) forces LF everywhere.
  3. `typecheck` raced `build` for dist on fresh machines (dist-integration.test.ts imports
     `../dist/*.js`; local dist always existed and masked it). turbo: typecheck now
     dependsOn build.
  4. Cold tsc 5.8 takes ~6 s on shared runners — vitest's 5 s default flaked the legacy-TS
     gate on four verify jobs AND the release pre-push hook. Per-test timeout 120 s.
  Result: **CI 11/11 green** (3 OS × 2 Node verify + all six special jobs) at d26332c.
- **Release workflow green end-to-end:** G-05 guard → install → build → `pnpm verify` →
  10⁶ fuzz → changesets/action. Notable: `pnpm install` on the runner installs lefthook's
  hooks, so the action's push of the version branch re-runs `pnpm verify` runner-side on the
  VERSIONED tree — kept deliberately as defense-in-depth. One repo default flipped via API:
  "Actions can create PRs" (`can_approve_pull_request_reviews=true`), which the action needs
  to open the Version PR.
- **1.0.0 staged:** PR #1 "Version Packages" (changeset-release/main) bumps modern-debug
  0.0.1 → 1.0.0 with changelog. NOT merged — merging triggers
  `pnpm -r publish --access public --provenance`, which needs npm credentials that do not
  exist yet: either an `NPM_TOKEN` repo secret or npm trusted publishing (OIDC) configured
  on npmjs.com for this repo's release.yml. Owner action required; publish stays parked.
- §12 status after this entry: docs deployed ✓ · full CI matrix ✓ · remaining: npm publish
  with provenance (owner credentials) + soak days 5–7 (clock unbroken: zero P1s since
  2026-07-11 — the four fixes above are test/CI-harness defects, not product P1s).

### G-16 · 2026-08-27 · Evergreen modernization pass — registry re-verified, drift adopted; LD-18 trigger FIRED (this entry supersedes LD-18's 2.31.0 pin)

Fleet-wide evergreen pass. Re-ran the registry verify against registry.npmjs.org (dist-tags
+ packuments, 2026-08-27). Deltas adopted:

| Package | Was | Adopted | Note |
|---|---|---|---|
| @changesets/cli | 2.31.0 | **3.0.1** | **LD-18's tracked trigger (changesets 3 GA) fired — superseding entry, explicitly marked as such.** Engines (node ^22.11 ⎮⎮ ^24 ⎮⎮ >=26, pnpm >=10) satisfied locally (node 26.8.1/pnpm 12) and in CI (26.5.0). `changeset status` under 3.0.1 parses the staged changeset (major: modern-debug) — `.changeset/modern-debug-1.0.0.md` untouched, PR #1 stays parked per G-15. config.json `$schema` pointer moved to @changesets/config@4.0.0 (CLI 3.0.1 depends on config ^4.0.0). |
| vitest + @vitest/{browser,browser-playwright,coverage-v8} | 5.0.0-beta.6 | **5.0.0-rc.2** | v5 pre-GA track advanced beta→rc (`rc` dist-tag). LD-13 structure intact — island untouched by this row. |
| vitest island (tests-workers) + @vitest/runner + @vitest/snapshot | 4.1.10 | **4.1.11** | Within the island's own 4.x channel (LD-13). |
| @cloudflare/vitest-pool-workers | 0.18.4 | **0.22.0** | Packument 2026-08-27: peers still `vitest ^4.1.0` → **LD-13 island contract holds**. Carries its own miniflare 5.20260815.0-alpha internally. |
| miniflare (island direct pin) | 4.20260708.1 | **4.20260730.0** | Newest 4.x stable. miniflare's `latest` dist-tag now points at 5.20260826.0-alpha — channel jump refused, see deferred. |
| pnpm (`packageManager`) | 11.11.0 | **12.0.0** | Lockfile regenerated by pnpm 12 (adds `packageManagerDependencies` block). pnpm 12 itself appended `minimumReleaseAgeExclude` entries for @types/node@26.4.0 + happy-dom@20.11.10 during install — same mechanism as the G-01-era excludes. |
| @biomejs/biome | 2.5.3 | **2.5.10** | |
| knip | 6.26.0 | **6.32.3** | |
| turbo | 2.10.4 | **2.10.12** | Stable channel (2.10.13-canary.1 exists; canary refused for a GA-pinned dep). |
| @playwright/test | 1.61.1 | **1.62.1** | Browser leg re-proven locally (out-of-verify per §8.4): chromium-headless-shell v1234 (Chrome 151) installed, 2 files / 6 tests green under vitest 5.0.0-rc.2. |
| size-limit + @size-limit/preset-small-lib | 12.1.0 | **13.0.3** | Major. `.size-limit.mjs` API (incl. `modifyEsbuildConfig`) unchanged; gates enforced and green (core 1.52 kB ≤ 1536 B, compat 1.79 kB ≤ 1.8 kB, otel ≤ 512 B, node ≤ 448 B). |
| @types/node | 26.1.1 | **26.4.0** | |
| happy-dom | 20.10.6 | **20.11.10** | |
| publint | 0.3.21 | **0.3.24** | |
| tsdown | 0.22.4 | **0.22.14** | Stable channel (LD-12 build chain). 0.23.0-rc.0 exists — deferred, see below. |
| vitepress | 2.0.0-alpha.18 | **2.0.0-alpha.19** | Alpha channel (`next` tag). Docs build green (vite 8.2.2). |
| shiki | 4.3.1 | **4.4.3** | |
| @fontsource-variable/fraunces, geist | 5.2.9 | **5.3.0** | |
| @fontsource-variable/jetbrains-mono | 5.2.8 | **5.3.0** | |

Verified UNCHANGED at newest: typescript 7.0.2 (`latest`), @arethetypeswrong/cli 0.18.5,
@opentelemetry/api 1.9.1, fast-check 4.9.0, lefthook 2.1.10, mitata 1.0.34, pino 10.3.1,
@types/debug 4.1.13, debug 4.4.3. Oracle pins untouched by policy regardless of registry:
debug 4.4.3 (LD-04/06 golden oracle) and typescript-legacy = npm:typescript@5.8.3 (G-14
legacy-TS gate oracle — an oracle pin, not a channel pin).

Gate evidence (this machine, Windows 11 / node 26.8.1 / pnpm 12.0.0): `pnpm install` clean;
`pnpm verify` **10/10 turbo tasks green** — modern-debug 20 test files / 158 tests, island
pool run 2 files / 2 tests + raw-miniflare run 2 files / 4 tests, size + publint + attw all
clean. Browser leg 2 files / 6 tests green. `pnpm --filter docs build` green.
`pnpm changeset status` green under CLI 3.0.1.

Deferred (with re-arm conditions):
- **tsdown 0.23.0-rc.0** — LD-12 build chain stays on its stable channel; re-arm: tsdown 0.23.0 GA.
- **miniflare 5.x** (alpha line, now `latest`-tagged upstream) — island direct pin stays on 4.x; re-arm: miniflare 5 stable AND pool-workers dependency alignment.
- **turbo 2.10.13-canary.1** — GA-pinned dep stays on GA channel; re-arm: next stable turbo.

Doc markers per law 5: LD-13 and LD-18 rows in `01-modern-debug-CLAUDE.md` §2 marked
"amended per G-16"; `CLAUDE.md` executor-notes version lines refreshed. The changesets
GitHub action will refresh the parked Version PR with CLI 3.0.1 on this push; that is the
release plumbing doing its job, not a release-state edit.

### G-17 · 2026-10-30 · Registry refresh, newest-channel adoption, code/test/CI modernization pass (this entry supersedes spec §0.2's same-channel rule and G-16's three deferrals; amends LD-01, LD-12, LD-13, LD-14, LD-18, G-12, the G-15 release plumbing and the §8.5 measurement method)

Owner-requested modernization run. An audit produced the findings in
`.claude/run/2026-10-30/findings.md`. The apply workflow wf_7594437e-bcd ran 8 clusters with 26
agents; every cluster ended PASS after at most one fix round (`.claude/run/2026-10-30/apply-B-ledger.md`).
A serial gate then ran on the merged tree. That run directory is gitignored. Every number below
comes from `.claude/run/2026-10-30/measured.json` or from the command quoted beside it. This entry
describes the uncommitted working tree. Nothing has been pushed, so no workflow has run on it.

**17.1 · Honesty correction — G-16 recorded local green only; CI on main has been red since d9ba2cc.**
G-16's gate evidence was local only. Cloud state at and after the G-16 commit, from
`gh run list` / `gh run view --log-failed` (read 2026-10-31 ~04:05Z UTC, 2026-10-30 local):

| Commit | Workflow | Result | Cause |
|---|---|---|---|
| d9ba2cc (G-16) | CI | failure | Only `alias-fixture` failed. pnpm 12 ignores `package.json#pnpm.overrides`, so the fixture's override vanished and its frozen install failed with ERR_PNPM_PACKAGE_MANAGER_NO_IMPORTER (G-17-notes) |
| d9ba2cc | Release | failure | `//#knip` inside `pnpm verify` reported "Unused files (11)" under `docs/.vitepress/.temp/` (VitePress build scratch). knip honours .gitignore, and `.temp/` was not in it; the tree now ignores it (17.10) |
| 1c551fb, 752914d, 258dc90 | CI | failure | `alias-fixture` on all three (same cause as d9ba2cc). Verify legs also failed: the configure.test.ts re-bind flake at 1c551fb (ubuntu 24.18.0 "+1ms", ubuntu 26.5.0 "+2ms") and 258dc90 (macos 24.18.0 "+22ms", ubuntu 26.5.0 "+3ms"); knip "Unused files (11)" at 752914d (windows 24.18.0, ubuntu 26.5.0) and 258dc90 (ubuntu 24.18.0) (`gh run view --log-failed`, 2026-10-30) |
| 96361c8 | CI | failure | Only `alias-fixture` failed (same cause as d9ba2cc) |
| 752914d, 96361c8 | Release | failure | lefthook's pre-push hook re-ran `pnpm verify` on the runner (G-15's deliberate defense-in-depth). `configure.test.ts:117` flaked there: `expected [ 'app two +4ms' ] to deeply equal [ 'app two +0ms' ]` (96361c8 log) |
| 1c551fb, 258dc90 | Release | success | |

The last green CI on main was 0258962 (2026-08-27T08:17Z). G-15's "CI 11/11 green" (d26332c) was
the last cloud status this ledger recorded. PR #1 "Version Packages" (changeset-release/main) has
been open since 2026-07-15T04:14Z. Its `pull_request` CI runs a1b2584, 0e92ba8, 0c1784c and 06f9895
each report failure with **0 jobs** (`gh run view --json jobs`), and each sat for 30 days between
created and updated. These are phantom runs on a branch pushed with the default GITHUB_TOKEN.
Fixes: the alias fixture (17.7, amends G-12), the flake (F058, 17.8) and the pre-push re-verify,
retired by `LEFTHOOK: '0'` (17.7).
The knip "Unused files (11)" failure (Release at d9ba2cc; CI verify legs at 752914d and 258dc90)
has a candidate fix in this tree, the .gitignore line in 17.10. No run has proven it yet (17.11).
Close condition: a green CI run and a green Release run on main for the commit that carries this entry.

**17.2 · Channel policy — superseding entry, explicitly marked as such.** Spec §0.2 (line 14) says
to adopt newer versions "within the same channel (latest→latest, beta→beta)". The owner's standing
order (peak-modern, 2026-09-23, widened 2026-10-10) supersedes that clause: every dependency,
toolchain and action takes its **newest release on any channel**. The only hold is a newest build
that is verifiably broken for this repo, recorded with evidence beside the pin and in
`.peak-modern-holds.json`. No hold exists today (the file is absent). Oracle pins stay exempt, as
G-16 ruled: debug 4.4.3 is the LD-04/06 golden oracle, and typescript-legacy =
npm:typescript@5.8.3 is the G-14 legacy-TS gate. G-16's deferrals close by adoption:

| G-16 deferral | G-16 re-arm | Adopted | Status |
|---|---|---|---|
| tsdown 0.23.0-rc.0 | tsdown 0.23.0 GA | **0.23.4** (`latest`) | The re-arm fired on its own terms (0.23.x is GA). CLOSED |
| miniflare 5.x (alpha) | miniflare 5 stable AND pool-workers alignment | **5.20261023.3-beta** (`beta`; `latest` is still 4.20260730.0) | Moot: any channel is allowed, and pool-workers is retired (LD-13 below). CLOSED by adoption |
| turbo 2.10.13-canary.1 | next stable turbo | **2.11.11-canary.1** (`canary`; `latest` 2.11.10) | Moot under the new policy. CLOSED by adoption |

**17.3 · Bump table.** "Was" is HEAD 96361c8, from `git diff HEAD -- <the six package.json
files> .github/workflows`. Channels are the dist-tags from `npm view <pkg> dist-tags`, read
2026-10-31 ~04:05Z UTC.

| Package / tool | Was | Now | Channel / note |
|---|---|---|---|
| pnpm (`packageManager`) | 12.0.0 | **12.17.0** | `next-12` (`latest` 12.16.1); pnpm self-switches to the pin |
| root `engines.node` | >=24.18.0 | **>=24.22.2** | contributor floor; 24.22.2 is maintenance LTS (Krypton) |
| @biomejs/biome | 2.5.10 | **2.6.4** | `latest`; Markdown/YAML formatters, 17.6 |
| @changesets/cli | 3.0.1 | **3.0.3** | `latest` (LD-18, 17.4) |
| `.changeset/config.json` `$schema` | @changesets/config@4.0.0 | **@4.0.1** | `latest` (F059). `format` is untouched because changesets' auto formatter already skips Biome |
| knip | 6.32.3 | **6.44.0** | `latest` |
| lefthook | 2.1.10 | **2.2.2** | `latest` |
| turbo | 2.10.12 | **2.11.11-canary.1** | `canary` |
| typescript | 7.0.2 | **7.1.0-dev.20261030.1** | `next`, nightly. `beta` 7.1.0-beta is a lower semver; `latest` stays 7.0.2 (LD-12, 17.4) |
| tsdown | 0.22.14 | **0.23.4** | `latest`; brings rolldown **1.2.16** (`latest`) and rolldown-plugin-dts **0.28.8** |
| vitest + @vitest/{browser,browser-playwright,coverage-v8} | 5.0.0-rc.2 | **5.1.0-beta.1** | `beta` (`latest` 5.0.5) |
| @playwright/test | 1.62.1 | **1.65.0-alpha-2026-10-30** | `next` (`latest` 1.64.1) |
| size-limit + @size-limit/preset-small-lib | 13.0.3 | **14.3.0** | `latest`; the bundler changed to rolldown, 17.5 |
| @opentelemetry/api (devDependency) | 1.9.1 | **1.10.0** | `latest`; the peer range `^1.9.1` is unchanged (LD-08) |
| @types/node | 26.4.0 | **26.6.6** | `latest` |
| fast-check | 4.9.0 | **4.10.2** | `latest` (LD-14) |
| publint | 0.3.24 | **0.3.25** | `latest` |
| happy-dom | 20.11.10 | **removed** | F108: no test or config selects a happy-dom environment; knip counted it only as a vitest optional peer |
| published `engines.node` | >=20.19.0 | **>=22.13.0** | LD-01 amendment, 17.4 |
| @cloudflare/vitest-pool-workers | 0.22.0 | **removed** | Renamed upstream: its `latest` 0.23.0 is deprecated |
| @cloudflare/vitest-plugin | — | **1.4.11** | `latest`; the successor (LD-13, 17.4) |
| @vitest/runner, @vitest/snapshot (island) | 4.1.11 | **removed** | These pinned the island's vitest 4 line, which no longer exists |
| vitest (tests-workers) | 4.1.11 | **5.1.0-beta.1** | one vitest line repo-wide |
| miniflare (tests-workers) | 4.20260730.0 | **5.20261023.3-beta** | `beta`; bundles workerd **1.20261023.1** |
| pino (bench oracle) | 10.3.1 | **10.4.0** | `latest` |
| vitepress | 2.0.0-alpha.19 | **2.0.0-alpha.21** | `next` (`latest` is 1.6.4) |
| shiki | 4.4.3 | **4.5.0** | `latest` |
| express (alias fixture) | 5.2.1 | **5.3.0** | `latest` (F090) |
| socket.io + socket.io-client (alias fixture) | 4.8.3 | **4.8.4** | `latest` |
| Node.js, CI | 24.18.0 / 26.5.0 | **24.22.2 / 26.13.0** + 27.0.0-alpha.0.0.0 + a 22.13.0 floor job | 26.13.0 is Active LTS (Lithium, since 2026-10-28); 27.0.0-alpha.0.0.0 is the current alpha (2026-10-29); nodejs.org/dist/index.json |
| Node.js, dev host | 26.8.1 (G-16) | **26.13.0** | |

The following were verified unchanged at newest: @arethetypeswrong/cli 0.18.5, @types/debug 4.1.13,
mitata 1.0.34, send 1.2.1 and @fontsource-variable/{fraunces,geist,jetbrains-mono} 5.3.0. The
oracle pins debug 4.4.3 and typescript-legacy 5.8.3 were left untouched, as policy requires.

| Action | Was | Now (exact tag, `gh release list` 2026-10-30, apply ledger ci) |
|---|---|---|
| actions/checkout | v7 | **v7.0.1** |
| pnpm/action-setup | v6 | **retired**: pnpm/setup **v3.1.2** replaces it, together with setup-node and the explicit install (17.7) |
| actions/setup-node | v6 | **v7.1.0**, kept only where a second Node.js is needed: the floor job (22.13.0) and the bench job (24.22.2) |
| oven-sh/setup-bun | v2 | **v2.2.0** |
| denoland/setup-deno | v2 | **v2.0.5** |
| actions/upload-artifact | — | **v7.0.2** (new: the bench RESULTS.md artifact) |
| changesets/action | v1 | **v2.1.2** sub-actions `select-mode`, `pack`, `version`, `publish` (17.7) |
| actions/configure-pages / upload-pages-artifact / deploy-pages | v6 / v5 / v5 | **v6.0.0 / v5.0.0 / v5.0.1**. F071: the floating `@v5` already resolved to v5.0.1, and G-15 recorded v5.0.0 |

Floating majors became exact tags (F024). F071's "keep floating majors" text is overridden by
that ruling.

`peerDependencyRules.allowedVersions` in pnpm-workspace.yaml:
- `'tsdown>typescript': '7'` is **removed**. tsdown 0.23.4 peers `^5.0.0 ⎮⎮ ^6.0.0 ⎮⎮ ^7.0.0`
  (installed package.json), so the rule was dead. This supersedes G-06's tsdown note; G-06 stays unedited.
- `'rolldown-plugin-dts>typescript': '7'` is **added** (F065). rolldown-plugin-dts 0.28.8 peers
  `^5.0.0 ⎮⎮ ^6.0.0 ⎮⎮ ~7.0.0`, and 7.1.0-dev misses that range. The rule is safe because d.ts goes
  through `dts: { generator: 'oxc' }`, not tsc.
- `'@cloudflare/vitest-plugin>vitest': '5.1.0-beta.1'` is **added**. The plugin peers
  `^4.1.0 ⎮⎮ ^5.0.0`, and a prerelease falls outside `^5.0.0`. The rule silences pnpm's
  install-time report (`pnpm install` exit 0, "No peer dependency issues found", G-17-notes). The
  plugin's own runtime check still prints a `[vpw:warn]` on every island run (apply ledger, island).

`minimumReleaseAgeExclude` lost 5 entries and gained 35 (`git diff HEAD -- pnpm-workspace.yaml`).
Removed: @arethetypeswrong/cli and /core 0.18.5, knip 6.26.0, @types/node 26.4.0 and
happy-dom 20.11.10. Added by pnpm 12.17.0 during install:
- pnpm 12.17.0 plus its 14 `@pnpm/exe.*` platform binaries
- turbo 2.11.11-canary.1 plus 6 `@turbo/*` binaries
- typescript 7.1.0-dev.20261030.1 plus 7 `@typescript/typescript-*` native binaries
- playwright, playwright-core and @playwright/test 1.65.0-alpha-2026-10-30
- knip 6.44.0
- miniflare 5.20261023.3-beta

Why: each of these exact pins was younger than pnpm's built-in 1440-minute `minimumReleaseAge`
when it was installed. That default is non-strict (pnpm 12.15.0 CHANGELOG:2425). The repo sets no
cutoff of its own: `pnpm config get minimumReleaseAge` prints `undefined`.

Gate state under the new toolchain, before the apply phase (G-17-notes):
- typecheck, tests, attw, knip and the docs build were green.
- lint was red only from Biome 2.6's new formatters (16 files, plus 3 warnings); fixed in 17.6.
- size was red on `modifyEsbuildConfig`; fixed in 17.5.
- publint was red on this host only (17.10).

**17.4 · LD amendments.**
- **Amends LD-01 (engines floor).** Published `engines.node` goes from >=20.19.0 to **>=22.13.0**,
  and the root from >=24.18.0 to **>=24.22.2**. Why: Node 20 reached EOL on 2026-04-30, and 22.13.0
  is the first 22.x with require(esm) unflagged and warning-free (measured.json
  `node_channels_2026_10_30`). The G-12 `require`-condition unwrap therefore holds on the floor.
  ESM-only, no CJS artifact and the four-entry exports map all stand.
  Validation: the new CI `floor` job builds on 26.13.0, then switches to Node 22.13.0 and runs
  `tests-runtimes/smoke.mjs`, the alias-fixture install and its test. That job has not run yet
  (nothing pushed), and this host did not run 22.13.0. Re-arm: the first CI run on main. A red
  floor job makes the floor an open item: fix the cause, or raise the floor to the lowest 22.x the
  job passes on, in a new entry.
- **Amends LD-12 (toolchain).** TypeScript 7.0.2 becomes **7.1.0-dev.20261030.1** (`next`
  nightly). tsdown 0.22.4 (0.22.14 in G-16) becomes **0.23.4**. rolldown 1.1.5 becomes **1.2.16**.
  d.ts still comes from isolatedDeclarations through `dts: { generator: 'oxc' }`. The build target
  is ES2024 (17.10).
- **Amends LD-13 (workers island retired).** LD-13 had no explicit trigger. Its premise was
  pool-workers' vitest-4-only peer, and that premise fell when pool-workers was renamed
  `@cloudflare/vitest-plugin`. Plugin 1.4.11 peers `vitest ^4.1.0 ⎮⎮ ^5.0.0`.
  `tests-workers/` now runs vitest 5.1.0-beta.1 like the rest of the repo. That prerelease sits
  outside `^5.0.0`, hence the allowedVersions rule above; at runtime it only warns.
  `tests-workers/vitest.config.ts` imports `cloudflareTest` from '@cloudflare/vitest-plugin'. The
  plugin's miniflare options keep the legacy flat shape (dist/pool/index.d.mts).
  Gate: pool 4/4, raw miniflare 6/6. Re-arm: none while a single vitest line works. A future
  plugin peer range that excludes the main vitest line re-opens the island question.
- **Amends LD-14:** fast-check 4.9.0 becomes **4.10.2**; mitata stays 1.0.34.
- **Amends LD-18** (3.0.1 since G-16): @changesets/cli becomes **3.0.3**.
- **LD-08 unchanged:** the peer range stays `^1.9.1`, and the dev pin is 1.10.0. The OTel Logs
  bridge is deferred (17.11).

Law 5 markers ("amended per G-17") are due at the changed sites: spec §0.2, §2 LD-01, LD-12, LD-13,
LD-14 and LD-18, the §3 pin rows, §3.7, §5.4 and §8.5, plus CLAUDE.md's version lines. This
docs phase's spec and CLAUDE.md owners edit those sites; this entry does not.

**17.5 · Size measurement method amended (§8.5 / G-10).**
size-limit 14 (preset-small-lib 14.3.0) bundles with **rolldown**. Its `modifyEsbuildConfig`
hook no longer applies, which turned the size gate red.
`packages/modern-debug/.size-limit.mjs` now uses `modifyRolldownConfig` to set
`platform: 'node'`, on ./node only, so `node:async_hooks` stays external. ./otel needs no hook:
size-limit treats the peer `@opentelemetry/api` as external.
Only `.` sets `import: '{ createDebug }'`; ./compat, ./otel and ./node measure their whole entry
file, as at G-14. Every entry is measured min+brotli.

| Entry | Budget | G-14 (esbuild) | rolldown, before the code fixes | Final (2026-10-30) | Headroom |
|---|---|---|---|---|---|
| `.` (`import { createDebug }`) | 1536 (G-10) | 1524 | 1450 | **1460** | 76 |
| `./compat` | 1800 | 1790 | 1750 | **1753** | 47 |
| `./otel` | 512 | 240 | 229 | **249** | 263 |
| `./node` | 448 | 148 | 132 | **132** | 316 |

The G-14 and baseline columns measure the same source (no src change between c8d7ac8 and 96361c8).
The baseline dist was built by tsdown 0.23.4 and bundled by size-limit's rolldown, so the gap
mixes the bundler change and the tsdown bump. Budgets are unchanged. Final deltas are core +10 (F051 +12, F115 +1, F097 −3), compat +3 and
otel +20 (F054, F105/F119). The ES2024 target bump left every byte identical (measured.json
`sizes.final_note`). The competitor comparison (measured.json `comparison`) bundles every row with
platform node. Its modern-debug rows (1464 / 1736) therefore differ from this gate's neutral-platform
1460 / 1753, although both measure the same dist.

**17.6 · Biome 2.6 Markdown/YAML formatters (F020).**
2.6.4 formats Markdown and YAML. biome.json changes:
- `$schema` points at 2.6.4.
- `markdown.parser.frontmatter: true` covers the VitePress frontmatter.
- `yaml.formatter.quoteStyle: 'single'`.
- `files.includes` shrinks to `["**", "!**/pnpm-lock.yaml"]`. dist, .turbo and coverage drop out
  through the VCS ignore file (`useIgnoreFile: true`).
- An `overrides` entry disables the formatter for three files:
  - **DECISIONS.md** is append-only (decisions-ledger law 7), and a formatter pass would rewrite
    past rows.
  - **01-modern-debug-CLAUDE.md** is the spec. It has authority over prose and changes only at
    amended sites.
  - **bench/RESULTS.md** is written by bench/run-benches.mjs, so it is regenerated, never reformatted.

All other Markdown adopts Biome formatting. The serial gate reformatted 10 files once (9 prose .md
plus biome.json), and `biome check .` is clean on 97 files.

**17.7 · CI and release plumbing.** This supersedes G-15's plumbing lines and keeps the G-05
guard. The ci.yml facts come from measured.json `ci`; the release facts were read from
release.yml on 2026-10-30.
- **Setup:** pnpm/setup v3.1.2 (`runtime: node@<ver>`, `cache: true`, `require-lockfile: true`)
  replaces pnpm/action-setup, setup-node and the explicit install in every ci.yml and docs.yml job.
  pnpm.io/continuous-integration recommends pnpm/setup (apply ledger, ci). release.yml leaves the
  store cache off.
- **Matrix:** `verify` runs ubuntu/windows/macos × Node 24.22.2 and 26.13.0 (blocking) plus
  27.0.0-alpha.0.0.0 (job-level `continue-on-error`): 9 legs, 3 of them non-blocking. Each leg
  now also runs `node tests-runtimes/smoke.mjs`.
- **New jobs:** `floor` runs 22.13.0 (17.4). `bench` runs 26.13.0 as primary plus 24.22.2 through
  `BENCH_EXTRA_NODE`, and uploads bench/RESULTS.md as the `bench-results` artifact. Together with
  bun, deno, workers, browser and alias-fixture, CI has **16 jobs**.
- **Permissions:** ci.yml gains `permissions: contents: read` and `concurrency`, with
  cancel-in-progress on pull requests only.
- **`LEFTHOOK: '0'`** is set workflow-wide in ci.yml and release.yml. This **retires G-15's
  "pre-push re-verify kept deliberately as defense-in-depth"**. That hook turned the
  configure.test.ts flake into Release failures (17.1). The explicit `pnpm verify` step in
  release `verify` stays the gate.
- **release.yml** has top-level `permissions: {}` and three jobs: `verify`, then `version` or
  `publish`.
  - `verify` (contents: read, `persist-credentials: false`): G-05 guard → pnpm/setup → build →
    `pnpm verify` → 10⁶ fuzz → `changesets/action/select-mode` → `pack` (publish mode only).
  - `version` (contents and pull-requests write): an `--ignore-scripts` install, then
    `changesets/action/version`. It opens the PR through the API with the default github.token, and
    GitHub starts no CI run for pushes made with that token. An App token is the owner's option (17.11).
  - `publish` (contents and id-token write): an `--ignore-scripts` install, then
    `changesets/action/publish` with `pack-dir-artifact-id`. That runs
    `changeset publish --from-pack-dir` on the tarballs packed from the verified dist. It sets
    `PNPM_CONFIG_PROVENANCE: 'true'`, because pnpm 11+ reads only `pnpm_config_*`: with that
    variable `pnpm config get provenance` printed `true`, and the `NPM_` form printed `undefined`
    (apply ledger, ci verify).
  - Publishing is OIDC only. The `NPM_TOKEN` and env `GITHUB_TOKEN` lines are gone, and
    `gh secret list` is empty (2026-10-31 ~04:05Z UTC).
  - This supersedes G-15's `pnpm -r publish --access public --provenance` line and G-14's "publish
    command self-builds" line: `publish` ships the packed, verified dist and runs no build.
  - A root `release` script (`pnpm -C packages/modern-debug build && changeset publish`) exists for
    manual use.
  - G-15's repo setting "Actions can create PRs" stays on, because `version` needs it.
- **Amends G-12 (alias fixture).** pnpm 12 no longer reads `package.json#pnpm`. The pnpm 12.16.1
  binary warns "The "pnpm" field in package.json is no longer read by pnpm".
  - The fixture is now a **standalone pnpm root**. Its own `fixtures/alias-migration/pnpm-workspace.yaml`
    declares `packages: []` and `overrides: debug: file:../../packages/modern-debug`.
  - ci.yml no longer passes `--ignore-workspace`. That flag skips the fixture's pnpm-workspace.yaml
    and with it the override (pnpm CHANGELOG, apply ledger fixture).
  - The lock was regenerated from scratch. It now holds engine.io 6.6.11, ws 8.21.3 (the ceiling of
    every dependent's `~8.21.0`) and @types/node 26.6.6, and no debug@4.4.3 entry.
  - check.cjs resolves `debug` from express, send, socket.io, socket.io-client, router, body-parser,
    finalhandler, engine.io and socket.io-adapter. It asserts each realpath ends with
    `dist/compat-cjs.js` and that no `node_modules/.pnpm/debug@*` directory exists. The old
    top-level substring check passed with real debug@4.4.3 underneath (F003).
  - The fixture now runs express 5.3.0, send 1.2.1 and socket.io(-client) 4.8.4 (F090).
  - The fixture's pnpm-workspace.yaml is untracked, along with test/json.test.ts,
    tests-workers/workerd-compat.ts and docs/public/ (`git status --short`). All four must be
    committed with this tree, or the fixture's frozen install fails.

**17.8 · Code fixes.** Each fix landed test-first. Bytes come from `size-limit --json` after each
step (apply ledger, src-core and compat).
- **F051 `json.ts` safeJson:** the `JSON.stringify` result is returned only when it starts with
  `{`. Anything else (`toJSON` returning 'abc', [1,2] or undefined) yields the G-08 marker
  `{"$fields":"unserializable"}`. Before, `'abc'` produced an unparseable `,abc`, and undefined threw.
  A new test/json.test.ts and it.for rows in format-ndjson.test.ts cover it. core +12 B.
- **F115 `format-ndjson.ts`:** `trace_id` and `span_id` now go through `esc()`. A quote-and-newline
  id used to break `JSON.parse`. core +1 B.
- **F116 property units:** ns, msg and both ids now draw from binary strings plus lone surrogates
  (U+D800–DFFF). The verifier's 20-seed run broke esc in two ways: dropping the c<32 branch failed
  19/20 seeds, and dropping the surrogate branch failed 20/20. Well-formedness is asserted with a
  `\p{Cs}` regex, because lib was still ES2023 when the test was written (17.10).
- **F054 `otel.ts`:** active ids are emitted only when `trace.isSpanContextValid(ctx)` holds. In
  @opentelemetry/api 1.10.0 that means hex, lengths 32/16 and not all-zero, so INVALID_SPAN_CONTEXT
  and non-hex contexts no longer emit ids.
- **F105/F119 `otel.ts`:** the absent-peer error is now `new Error(hint, { cause })`, and the test
  asserts the cause reads "Cannot find package". With F054 this costs otel +20 B (229 → 249).
- **F097 `matcher.ts`:** `Matcher.source` is dropped, and compile returns `{ allow, deny }`, the LD-04
  shape, pinned with `toStrictEqual`. core −3 B, compat −6 B.
- **F120:** the otel.test.ts describe sets `{ shuffle: false }`. Shuffle seed 7 failed without it.
- **Compat parity.** The oracle is the installed debug 4.4.3 `src/`. In the compat cluster ./compat
  went 1750 → 1739 B (F062, F099, F100 and F101 together, −11 B) → 1744 B (F102, +5) → 1753 B
  (F103, +9). The src-core cluster's F097 measured −6 B on its own tree; the merged tree measures
  1753 B (apply ledger, compat and src-core).
  - F062: `curr` comes from `Date.now()`. debug's common.js:75 uses `Number(new Date())`, so the
    change is not observable as parity; the test pins the clock source.
  - F099: `process.getBuiltinModule?.('node:util')` no longer needs a cast (@types/node 26.6.6
    process.d.ts:1262).
  - F100: the colour escape is `c < 8 ? c : '8;5;' + c` (node.js:172). Basic colours now emit
    `33;1m`, not `38;5;3;1m`.
  - F101: diff is `curr - (prevTime || curr)` (common.js:76). `??` gave 5 where debug gives 0.
  - F102: an overridden `createDebug.formatArgs` is now called through `.call(self, args)`
    (common.js:110), and `formatArgs` is on the public surface. +5 B.
  - F103: `names`/`skips` are live. enable() reassigns them from a local compile
    (common.js:162-182). `createDebug.enabled` reads them on every call (common.js:249-263). The
    instance getter calls `createDebug.enabled` (common.js:129-131). +9 B.
  - F102 leftovers are deferred: `createDebug.init` (common.js:142-144), a public
    `createDebug.namespaces` (common.js:164) and a static `createDebug.destroy` (common.js:15). They
    are estimated at +14 B against 47 B of headroom. Re-arm: a consumer report or the next compat
    parity round. The docs record the gap in divergence.md.
  - F098 (doc only): debug 4.4.3 warns once on `destroy()`. On Node it emits one DeprecationWarning
    through `util.deprecate`, which `--no-deprecation` silences; in browsers it emits one
    console.warn. compat calls console.warn with a shorter message on every call. This refines
    G-11's "destroy() warns a shorter message" line, which stays unedited, and compat.ts is unchanged.
- **Tests:**
  - F058: the re-bind test in configure.test.ts mocks `performance.now` to 1000, which removes the
    +4 ms flake. It passed 5 consecutive runs; the flake was not reproduced under load.
  - F111: three isTTY tests, plus a verifier-added off-TTY `format: 'auto'` test. The `'auto'`
    guard at src/index.ts:81 had no other test.
  - F112: the tests write ESC as an escape, not a raw byte.
  - F113: a chained `fields()` merge test.
  - F114: env-init's afterEach now runs unstubAllEnvs, unstubAllGlobals and resetModules.
  - F121: a comment corrected to match the code.
  - F117: the matcher oracle and matcher TABLE loops run through `it.for`, taking matcher.test.ts
    from 3 to 165 tests.
  - F122: scaffold.test.ts is deleted; other tests import every entry.
  - Island:
    - The miniflare 5 port uses the native `workers: [{ config }]` shape and `handleStructuredLogs` (F012, F013, F035).
    - One `COMPATIBILITY_DATE` constant (F084) and a nodejs_als-only case (F104).
    - A WeakRef presence test and a long-lived re-bind test. The verifier rewrote the latter after
      the worker's 10 000-instance version proved nothing.
    - Mutation check (serial gate): with `sweep(true)` changed to `sweep(false)` in enable(), the
      re-bind test fails ("expected [] to have a length of 500").
- **Counts** (serial gate): package **342** tests in 20 files (158 in 20 at G-16); browser 6 in 2;
  workers pool 4 in 2 (2 at G-16); raw miniflare 6 in 2 (4 at G-16). Total **358**. v8 coverage:
  93.05 % statements, 90.04 % branches, 98.64 % functions, 92.76 % lines. The §8.7 thresholds pass.
- **Docs site** (apply ledger, docs-site):
  - Contrast was measured with an oklch→WCAG script. Light brand-1/3 on white: 6.11:1; brand-2:
    4.73:1. Dark button text on brand-3: 6.24:1, on brand-2: 13.78:1, on brand-1: 10.51:1. Dark
    text-3: 5.01:1 on bg and 4.72:1 on bg-soft.
  - The theme imports `vitepress/theme-without-fonts`, so the dist ships no Inter woff2, and 'Geist
    Sans' is gone from the font stack.
  - The hero gradient and the frosted nav and sidebar use VitePress variables instead of
    `!important`.
  - resolve-dts.mjs strips the alias export and appends the barrel export line. It rewrites
    node.d.ts's chunk import to `modern-debug` and fails the build on a leaked minified alias or
    hashed chunk path. Its chunk regex is `[A-Za-z0-9_-]+`, and it also runs as `predev`.
  - Added: favicon.svg, a sitemap, local search, a GitHub social link and editLink.
  - Not done: a dark-mode screenshot (the browser MCP servers failed to connect) and `lastUpdated`
    (it needs `fetch-depth: 0` in docs.yml).

**17.9 · workerd facts, measured 2026-10-30** (island cluster probes, measured.json `workers`).
- miniflare 5.20261023.3-beta bundles workerd 1.20261023.1. Its newest accepted compatibility date
  is **2026-10-23**: a probe with 2026-12-01 failed with "Compatibility date … is in the future and
  unsupported". That date is the one constant in tests-workers/workerd-compat.ts.
- **Node.js compatibility is on by default from compatibility date 2026-08-04.** A bisect found no
  `process` at 2026-08-03 and `process` present at 2026-08-04 with no flags. At 2026-10-23:
  - `[]` gives full Node compatibility.
  - `[no_nodejs_compat]` gives process and ALS, but no fs and no `stderr.write`.
  - `[no_nodejs_compat, no_nodejs_compat_v2]` gives no process and no ALS.
  - Adding `nodejs_als` to that pair gives ALS only, which is enough for modern-debug/node.
  The absence-path tests therefore use the opt-out pair, and a no-flags case pins the default.
- **stderr capture:** miniflare 5 has no `handleRuntimeStdio`; `handleStructuredLogs` is its only
  runtime-output hook. A default-sink line arrives as one entry
  `{level: 'log', message: 'stderr: {...}'}` and never as level 'error'. The `stderr: ` prefix is
  the only stream identity; stdout gets a `stdout: ` prefix.
- **modern-debug/node** imports only AsyncLocalStorage, so `nodejs_als` alone suffices. Scope
  fields cross an await. The canonical wording is "Node.js compatibility (on by default from
  compatibility date 2026-08-04; nodejs_compat before that) or the nodejs_als flag alone for
  modern-debug/node". This supersedes spec §5.4's "requires nodejs_compat" (F104).
- **G-08 closure (recorded in G-14) re-checked on miniflare 5.** The LD-11 detect picks
  `process.stderr.write` under Node compatibility and `console.error` without it, and
  default-sink.test.ts asserts both. The closure stands and LD-11 is unchanged. G-14's "labeled log
  stream" now reads as a level-'log' structured entry with the `stderr: ` prefix.
- Not re-verified: G-12's "vitest-pool-workers masks compat flags for its own runner" under
  @cloudflare/vitest-plugin (the island verifier declined to judge it).

**17.10 · Hygiene and post-gate config.**
- The orphan browser-failure screenshot PNG is removed (staged deletion). .gitignore adds
  `.claude/run/`, `*.tgz`, `docs/.vitepress/.temp/` (knip reads .gitignore, so in-flight VitePress
  scratch no longer counts as unused files; 17.1) and that exact `test-browser/__screenshots__/`
  directory. The screenshot line is not a blanket ignore, because toMatchScreenshot baselines would
  share the folder.
- The root and package LICENSE files are byte-identical. The package copy's holder is now
  Albert Badalov. Both files now end with third-party MIT notices for the ported debug 4.4.3 code
  (TJ Holowaychuk 2014-2017, Josh Junon 2018-2021) and ms 2.1.3 (Vercel, Inc. 2020). No finding
  asked for the notices. They are accepted as legal text that matches the installed licenses.
- packages/modern-debug/package.json gains `author`, `homepage` and `bugs.url`. On GitHub the repo
  homepage is https://abcrimson.github.io/modern-debug/ and the wiki is disabled (`gh repo view`,
  2026-10-31 ~04:05Z UTC).
- capture-colors.mjs: one raw NUL became a `\u0000` escape, so git no longer treats the file as
  binary. Its raw output needs a Biome format pass to match the committed colors.json; the data is
  equal.
- bench/run-benches.mjs: execFileSync gets a 120 000 ms timeout. tests-runtimes/smoke.mjs checks the
  /otel surface and the `require` condition.
- Post-gate fixes (G-17-notes, "Serial gate"); the gate was re-run green:
  - tsconfig target/lib and the tsdown target go from ES2023 to **ES2024**, with bytes unchanged.
    Every ES2024 feature ships in Node 22.13.0. ES2025 would type Promise.try, which is absent
    before Node 23.
  - vitest coverage `include` narrows from `src/**` to `src/**/*.ts`. The v8 remap could not parse
    the hand-written compat-cjs.d.cts import attribute.
- **Serial-gate tallies (merged tree, 2026-10-30):**
  - `pnpm verify --force --continue`: 9/10 green. publint fails only on this host because of a
    stray `~/node_modules` pnpm shim; `publint --pack npm` (0.3.25) prints "All good!". The gate is
    not weakened, and CI is unaffected. Re-arm: the publint result of the first CI run.
  - attw 0.18.5 (esm-only profile, `false-cjs` ignored per G-14) is green for node16 ESM and bundler
    on all 4 entries.
  - The browser leg passes 6 tests in 2 files (Playwright 1.65.0-alpha-2026-10-30 Chromium).
  - Smokes are green on Node 26.13.0 and Bun 1.4.4. Deno is not installed on this host; the CI deno
    job covers it.
  - Alias fixture: frozen install and check.cjs are green.
  - Island mutation check: red with the sweep disabled, green once restored (17.8).

**17.11 · Deferred items and owner actions (open items handed forward).**

| Item | State | Re-arm |
|---|---|---|
| Bench regeneration on Node 26.13.0 + 24.22.2 | The 2026-10-30 local run was stopped by the host for low system memory before it wrote anything. bench/RESULTS.md is unchanged from c8d7ac8 (generated 2026-07-14 on Node 26.5.0 / 24.18.0), and docs cite those numbers with that date (measured.json `bench`). The CI bench job re-measures on every push and uploads the artifact | The owner re-runs it locally, or a CI `bench-results` artifact replaces RESULTS.md |
| npm publish | modern-debug is unpublished (`npm view modern-debug` → 404, 2026-10-31 ~04:05Z UTC). There is no NPM_TOKEN and no trusted publisher. **Awaiting owner** | The owner bootstraps the first publish manually (measured.json `package.npm_status`). Then the owner registers release.yml as an npm trusted publisher with "npm publish" enabled; an unused config expires after 2 days. PR #1 refreshes on the next push |
| GitHub App token for version-PR CI checks | Optional, not wired. actions/create-github-app-token v3.3.0 was verified as newest (apply ledger, ci) | The owner installs an App and passes its token as `github-token:` |
| knip "Unused files (11)" on `docs/.vitepress/.temp/` (17.1) | .gitignore now lists `docs/.vitepress/.temp/` (17.10), and knip reads .gitignore. Not proven: no CI or Release run has used this tree | The first CI and Release runs on main. If either is red, the item re-opens with the job name and the log line |
| Lazy-epoch registry sweep | enable()/configure() re-bind every live registry entry, which is O(N) per toggle and O(N²) for N instances toggled once each. The island worker measured about 50M re-binds: 4046 ms warm and 9204 ms cold for 10 000 instances in workerd | Roadmap. It needs a core size re-measure against 76 B of headroom |
| `isWellFormed()` in the F116 property | lib is ES2024 now (17.10), so the `\p{Cs}` regex substitute can go | Next touch of format-ndjson.test.ts |
| SHA-pinning of actions | Exact tags today, not SHAs | Owner supply-chain decision |
| docs.yml build/deploy split | `pages` and `id-token` write sit on the job that installs and builds | Next docs.yml change |
| OTel Logs bridge (LD-08) | research.md finds the Logs API exported by @opentelemetry/api 1.10.0 typings. Its OTel JS 3.0.0 / 0.300.0 stability claims were not checked against npm. The estimate is 150–250 B against the 512 B ./otel budget | Those claims are verified. A peer floor of `^1.10.0` would amend LD-08 |
| rolldown-plugin-dts 0.29.0 (`latest`) | Unreachable: tsdown 0.23.4 depends on `^0.28.8` | A tsdown release that widens the range |
| Small leftovers | format-ndjson.ts repeats the safeJson marker literal. The `[vpw:warn]` prints on every island run. The miniflare README in node_modules still shows the v4 API | Next touch of each |

Status: the code phase is gated green locally (17.10). Cloud CI has not run on this tree. 17.1
closes on a green CI run and a green Release run on main. Publish is awaiting the owner.

**17.12 · Spec refresh to 1.1.0 (registry refresh).** The spec header moves from 1.0.0 to 1.1.0
(registry-verified 2026-10-30, executor Claude Code 2.1.304 as reported by `claude --version` on
the executing host); a "Channel events since 1.0.0" digest follows the header and every changed
site carries an *(amended per G-NN)* marker (F037). Spec header, §1 and §7 download figure: `debug`
≈939M downloads/week (npm API, `/downloads/point/last-week/debug`, week ending 2026-10-29),
replacing the 2026-07-09 ~300M; "most-installed utility on npm" is corrected to "one of the
most-downloaded packages on npm" (semver ≈1,136.8M the same week, same source). The bench §6 line
keeps the 2026-07-14 measurement (Node 26.5.0 / 24.18.0, bench/RESULTS.md); the CI bench job now
runs on 26.13.0 and 24.22.2 (17.7), so §6 is marked amended per G-17 for the Node lines, not the
numbers (17.11, bench regeneration).

### G-18 · 2026-10-31 · Date-change freshness sweep, vitest `test.projects` restructure, AGENTS.md import, roadmap (amends nothing locked; adds §4 topology markers)

The same owner-requested run, resumed on 2026-10-31. Every number below was measured on the
executing host through the pruned-PATH runner unless a CI run is named. The restructure workflow
wf_cc9db4e9-239 ran two file-disjoint clusters with 8 agents; both ended PASS.

**18.1 · Date-change freshness sweep.** `dep-freshness.mjs` on 2026-10-31 checked 55 pins. Moved:
typescript 7.1.0-dev.20261030.1 → **7.1.0-dev.20261031.1** (`next`) and @playwright/test
1.65.0-alpha-2026-10-30 → **1.65.0-alpha-2026-10-31** (`next`, with playwright and
playwright-core); the pins, the seven `@typescript/typescript-*` binaries and
`minimumReleaseAgeExclude` moved with them, the lockfile re-resolved with zero old strings, and
the Chromium headless shell moved to Playwright build 1253 (Chrome Headless Shell 158.0.8127.2)
through `playwright install chromium`. Reported and left as is: the `@opentelemetry/api ^1.9.1`
peer range (LD-08, the only range by design), the two `engines.node` floors (the sweep compares
floors to the 28 nightly; floors are not pins), `typescript-legacy` (the G-14 alias, exempt), and
`actions/checkout` in docs.yml shown as "Installs" (the sweep read the next line's comment as the
version; docs.yml pins v7.0.1). The spec manifest rows for typescript and @playwright/test and
docs/guide/runtimes.md carry the new nightlies with a G-18 marker.

**18.2 · Restructure: one vitest config per package.** The inventory found 99 tracked files, no
orphan beyond the already-deleted scaffold test, and exactly one structural win: each package ran
two vitest configs that vitest 5.1.0-beta.1 can express as `test.projects`.
- `packages/modern-debug/vitest.browser.config.ts` is deleted; `vitest.config.ts` holds project
  `node` (environment node, `test/**`, `pool: 'forks'`, `execArgv: ['--expose-gc']`) and project
  `browser` (`test-browser/**`, headless Chromium through `@vitest/browser-playwright`). Root
  `test` holds only `coverage`, which the installed types make root-only (`NonProjectOptions`);
  `execArgv`, `pool`, `include` and `browser` are per-project. Scripts: `test` =
  `vitest run --project node`, `test:browser` = `vitest run --project browser`, `coverage` =
  `vitest run --coverage --project node`; ci.yml needs no change. tsconfig.json drops the dead
  include entry; the CONTRIBUTING verify table and the registry.test.ts comment say where
  `--expose-gc` is wired now.
- `tests-workers/vitest.miniflare.config.ts` is deleted; `vitest.config.ts` holds project `pool`
  (the `cloudflareTest` plugin, `test/**`) and project `miniflare` (no plugin, `test-miniflare/**`,
  `testTimeout: 30000`). The plugin sits on the pool project only: plugin 1.4.11's
  `configureVitest` sets the pool and drops the `node` resolve condition per project
  (dist/pool/index.mjs), so a root-level plugin would leak into the raw-miniflare suites.
  `scripts.test` = `vitest run`; knip.json lists one config per package.
- Measured after the fold: node project 342 tests in 20 files, browser 6 in 2, island 4 files
  (pool + miniflare), coverage 93.05 / 90.04 / 98.64 / 92.76, knip clean, typecheck clean.
- Considered and left to the owner: one `tests/` directory for tests-runtimes/ and
  tests-workers/. It moves ci.yml paths and CONTRIBUTING text for no measured gain.
- Process note: both clusters wrote backups into one `.claude/run/2026-10-30/backup-E/` and
  overwrote each other's copies; the island cluster kept its originals under `backup-E/island-vitest/`.
  Nothing was restored from either. A future script gives each cluster its own backup path.

**18.3 · AGENTS.md.** The Phase D docs pass left an untracked `AGENTS.md` identical to
`CLAUDE.md`. It stays as the executor notes (the cross-vendor file every agent reads) and
`CLAUDE.md` becomes a one-line `@AGENTS.md` import, so one file holds the text. Spec §4 topology,
CONTRIBUTING's authority table and the README's spec row point at AGENTS.md with a G-18 marker.

**18.4 · Open oddity: happy-dom in the lockfile.** 17.4 removed the happy-dom devDependency and no
importer declares it, yet pnpm-lock.yaml still resolves happy-dom@21.0.4 as vitest's optional
peer (the `(happy-dom@21.0.4)` suffix on both vitest importers and a package entry), and it is
present in the virtual store (`pnpm why -r happy-dom` lists it under vitest). `pnpm install` and
`pnpm dedupe` on pnpm 12.17.0 both keep it. Harmless: it is not reachable from any package's
node_modules by name and no test selects it. Re-arm: the next vitest bump or a
`pnpm install --fix-lockfile`; if it persists, report it against pnpm 12.17.0 with the excerpt.

**18.5 · Gate on the final tree (2026-10-31).** `pnpm verify --force --continue`: 9 of 10 green
(publint red only on this host, `publint --pack npm` prints All good); sizes 1460 / 1753 / 249 /
132 B against 1536 / 1800 / 512 / 448 (unchanged by 18.1 and 18.2); package 342 tests in 20
files; island 4 files; browser 6 tests in 2 files; runtime smokes green on node v26.13.0 and bun
1.4.4; `biome check .` clean on 97 files. Cloud CI has not run on this tree. 17.1 and this entry
close on the first green CI, Docs and Release runs on main, recorded as 18.7 after the push.

**18.6 · Roadmap.** `ROADMAP.md` at the repo root holds the 1.0.0 completion plan (what is done,
what this run automates, the owner's six-step runbook from the npm staged-publishing,
trusted-publishers and `npm trust` pages read live on 2026-10-31, and the §12 crosswalk) and the
next ten minors 1.1.0 → 1.10.0 (Node diagnostics; OTel Logs bridge; browser and DevTools; compat
completeness and migration; levels; hot paths; redaction; edge and Deno; Node transports;
distribution and longevity), each with a feature, a hardening and a debt lane, graded facts
traced to `.claude/run/2026-10-30/research.md`, size caps set by measured bytes, a gate, a
fallback and a kill criterion. It authorizes nothing: every Locked Decision or §1 Non-Goal a
release would touch (LD-01 per new entry, LD-05/G-07, LD-07, LD-08, LD-11, LD-15/G-08, LD-16,
the "no file targets, no redaction engine" and "one sink function" Non-Goals) is named in that
release's Owner row and in its §9 default, and lands only through a G-NN entry. Each release
opens with its own dated plan in `docs/plans/` (the first adds `srcExclude` to the VitePress
config). The draft was written by an Opus writer from the research, refuted by an Opus verifier
(1 P1, 11 P2, 13 P3, all applied in one fix round) and re-verified. README and the docs nav link
to it. The 17.11 rows are each assigned to a release or to the owner's runbook; 18.4 goes to
1.1.0's debt lane.

**18.7 · publint packs with npm, strict.** The `publint` script becomes `publint --pack npm
--strict` (publint 0.3.25; `--pack` takes auto | npm | yarn | pnpm | bun | false). Reason: with
`auto` publint picks pnpm and, on this host, the stray `~/node_modules/.bin/pnpm` shim, so the
gate was red here and green in CI (17.10). npm pack is what attw already uses (`--pack .`), it
exists wherever Node does, and for `files: ["dist"]` plus LICENSE, README and package.json the
tarball is the same. `--strict` turns publint warnings into errors; there are none today ("All
good!"). The gate is stronger, not weaker. Measured after: `pnpm verify --force --continue`
**10 of 10** green on this host (publint All good!, 342 package tests in 20 files, island 4
files). The 17.10 re-arm ("the publint result of the first CI run") still stands for CI.
