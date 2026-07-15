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
