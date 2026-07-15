# modern-debug — Genesis→1.0.0 Execution Spec

> **Replaces:** `debug` 4.4.3 (#1 on npm-packages-ripe-for-modern-replacement, ~300M weekly downloads, architecture frozen since 2014)
> **Product:** Sub-1KB, ESM-only, universal-runtime diagnostic logger with `debug`-grammar namespaces, structured NDJSON output, OpenTelemetry trace correlation, AsyncLocalStorage request scoping, and a byte-for-byte `DEBUG` env-var compatibility layer.
> **Spec version:** 1.0.0 · **Authored:** 2026-07-09 · **Registry-verified:** 2026-07-09 (every pin below pulled live from registry.npmjs.org / nodejs.org / GitHub)
> **Executor:** Claude Code 2.1.205 (verified: npm `latest` dist-tag = 2.1.205 on 2026-07-09)
> **Publisher:** @crimson_dev · npm name `modern-debug` (unscoped, matching `modern-cmdk` / `modern-xlsx` / `modern-pdf-lib` convention)

---

## §0 Executor Protocol — READ FIRST

1. **Read this entire file before writing any code.** Authority order: this spec → `DECISIONS.md` (append-only log you maintain) → inline code comments. Nothing else overrides a Locked Decision (LD).
2. **Phase 0 re-verification is mandatory.** Pins below were verified 2026-07-09 and drift weekly. At genesis, run the re-verify block in §3.6. If a pin has moved: adopt the newer version **within the same channel** (latest→latest, beta→beta), record the delta in `DECISIONS.md`, and continue. If a channel changed (e.g., a beta went GA), adopt GA and log it. Never silently keep a stale pin.
3. **Execute phases strictly in order** (§9). Every phase ends with a **gate** — a command block that must exit 0. Do not begin phase N+1 with a red gate. Fix or revert.
4. **Self-verification loop after every substantive change:** `pnpm verify` (typecheck → lint → test → size → publint/attw). This is wired in Phase 0 and must never be weakened.
5. **Honesty rule:** if a gate cannot be met (e.g., the 1024-byte budget), do not delete the gate. Stop, write the measured number and the blocking cause into `DECISIONS.md`, and surface it.

---

## §1 Mission & Non-Goals

### Mission
The most-installed utility on npm has no JSON mode, no levels, no trace correlation, no async-context awareness, and no tree-shakeable ESM build. `modern-debug` keeps the two things that made `debug` win — the `app:db`-style namespace grammar and near-zero disabled-path cost — and rebuilds everything else for 2026: structured output, OTel spans, ALS scoping, and first-class operation on Node, Bun, Deno, Cloudflare Workers, and browsers.

### Product pillars
1. **Tiny core.** `import { createDebug } from 'modern-debug'` costs ≤1536 bytes min+brotli (amended from 1024 per DECISIONS G-09/G-10, owner-approved 2026-07-10 — the spec-mandated §5.1+LD-07+LD-10 core surface measures a ~1.4 KB floor). Hard gate, never waived.
2. **Drop-in migration.** `modern-debug/compat` is API-compatible with `debug` 4.4.3 (default-export factory, printf formatters, `.enabled`, `.extend()`, `DEBUG` env grammar, same color-hash algorithm) so `"debug": "npm:modern-debug@^1"` aliasing works for the transitive install base.
3. **Structured by default where it matters.** Non-TTY sinks emit NDJSON records; TTY gets the classic colored pretty format. One flag flips either way.
4. **Observability-native.** `modern-debug/otel` injects `trace_id`/`span_id` from the active `@opentelemetry/api` context. `modern-debug/node` adds `scope(fields, fn)` via `AsyncLocalStorage` so every log line inside a request carries the request's fields.
5. **Universal.** Identical behavior on Node 24 LTS / 26 Current, Bun, Deno 2, workerd, and evergreen browsers — proven in CI, not claimed.

### Non-Goals (v1)
- **Not a log shipper/router.** One sink function. Transports are the consumer's problem (pino ecosystem exists for that).
- **No log rotation, no file targets, no redaction engine.** Out of scope; keeps the byte budget honest.
- **No CJS build.** ESM-only, `"type": "module"`, no `require` condition. Consumers on CJS need Node ≥20.19.0 (`require(esm)` interop floor) — encoded in `engines`.
- **No custom `%` formatter *registration* in core.** Core takes `(msg, fields?)`. The printf grammar lives entirely in `/compat`.

---

## §2 Locked Decisions

| ID | Decision | Rationale | Status |
|---|---|---|---|
| LD-01 | ESM-only; `exports` map with `"."`, `"./compat"`, `"./otel"`, `"./node"`; no `main`, no CJS | House standard; enables per-subpath byte budgets; CJS interop handled by Node ≥20.19 `require(esm)` | LOCKED |
| LD-02 | Zero runtime dependencies in all four subpaths | The product *is* the byte budget; a single dep forfeits it | LOCKED |
| LD-03 | **No WASM.** Core hot path is small-string formatting; JS↔WASM boundary crossing costs more than it saves at this size | Performance honesty over buzzwords; documented so nobody "optimizes" it in later | LOCKED |
| LD-04 | Namespace matcher compiles the pattern set **once** to a `{allow: RegExp[], deny: RegExp[]}` pair, exact `debug` 4.4.3 grammar: comma/space separators, `*` wildcard, `-` prefix negation, colon-delimited namespaces | Drop-in `DEBUG` env compatibility is pillar #2 | LOCKED |
| LD-05 | Disabled namespaces return a **shared noop function** from `createDebug`; re-evaluation only on explicit `enable()`/`configure()` call | This is the trick that makes `debug` free when off; we keep it | LOCKED |
| LD-06 | Color selection in pretty mode uses `debug` 4.4.3's exact hash (`for (i) hash = ((hash << 5) - hash + charCode) | 0` → `colors[Math.abs(hash) % colors.length]`) and its ANSI 256-color palette | Same namespace ⇒ same color after migration; verified by fixture test against `debug` 4.4.3 output | LOCKED |
| LD-07 | NDJSON record shape: `{"t":<epoch-ms>,"ns":"app:db","msg":"...","sev"?:10|20|30|40|50,"trace_id"?,"span_id"?,...fields}` — flat, no nesting of user fields, key order fixed for diff-ability | Structured-output pillar; pino-compatible severity numbers for downstream tooling | LOCKED |
| LD-08 | `@opentelemetry/api` is an **optional peerDependency** (`^1.9.1`, `peerDependenciesMeta.optional=true`), imported only inside `modern-debug/otel` | Core stays zero-dep; OTel users opt in; verified 1.9.1 = latest 2026-07-09 | LOCKED |
| LD-09 | Env resolution order: explicit `enable()` call > `process.env.DEBUG` (feature-detected) > `globalThis.DEBUG` > browser `localStorage.debug` (feature-detected, try/caught) > disabled | Covers Node/Bun/Deno (process.env), Workers (no env object without bindings → globalThis escape hatch), browsers (`debug` parity) | LOCKED |
| LD-10 | Format auto-detect: TTY (`process.stderr.isTTY` feature-detected) → pretty; otherwise NDJSON. Overridable via `configure({format})` or `MODERN_DEBUG_FORMAT=pretty\|ndjson` | "Structured where it matters" without breaking local DX | LOCKED |
| LD-11 | Default sink: `process.stderr.write` where present, else `console.error` | Matches `debug` Node behavior; Workers/browsers get console | LOCKED |
| LD-12 | Toolchain: TypeScript **7.0.2** (GA native compiler — verified `latest` 2026-07-09), emit via tsdown 0.22.4 (rolldown 1.1.5), `.d.ts` via **isolatedDeclarations** (oxc path, no tsc emit) | Newest GA of the native-TS line; isolatedDeclarations keeps d.ts generation compiler-independent | LOCKED |
| LD-13 | Vitest **5.0.0-beta.6** everywhere except the Workers island (`tests-workers/`), which pins vitest **4.1.10** because `@cloudflare/vitest-pool-workers` 0.18.2 declares `peerDependencies: vitest ^4.1.0` (verified from its packument 2026-07-09) | Bleeding edge where possible; the one hard peer conflict is isolated, not fought | LOCKED |
| LD-14 | Benchmarks: mitata 1.0.34; property tests: fast-check 4.9.0 | House standard | LOCKED |
| LD-15 | `sideEffects: false`; no top-level mutable module state except the matcher singleton, initialized lazily | Tree-shaking + Workers isolate-reuse safety | LOCKED |
| LD-16 | Levels are core (`.warn`, `.error` sugar setting `sev`), but cost ≤48 bytes; if they push core past 1024B they move to a `/levels` subpath | Budget is senior to feature placement | LOCKED |
| LD-17 | Time in pretty mode: `+Nms` diff (debug parity) computed via `performance.now()`; NDJSON uses `Date.now()` epoch-ms | Familiar DX / machine-parseable split | LOCKED |
| LD-18 | changesets 2.31.0 for versioning (3.0.0-next.8 exists; release tooling stays on GA — tracked upgrade trigger: changesets 3 GA) | Release plumbing must not be the experiment | LOCKED |

---

## §3 Verified Version Manifest — nothing unpinned, nothing omitted

All verified **2026-07-09** against registry.npmjs.org unless noted. Channel notation: `GA` = latest dist-tag; prerelease channel named where taken.

### 3.1 Runtimes & package manager
| Component | Pin | Channel | Notes |
|---|---|---|---|
| Node.js (dev/CI primary) | **26.5.0** | Current | nodejs.org/dist index, newest Current |
| Node.js (CI floor) | **24.18.0** | LTS "Krypton" | newest LTS |
| pnpm | **11.10.0** | GA (`latest`) | `packageManager` field pins exact |
| Bun (CI) | latest via setup-bun **v2.2.0** | GA action | runtime matrix |
| Deno (CI) | 2.x via setup-deno **v2.0.5** | GA action | runtime matrix |
| `engines.node` (published) | **>=20.19.0** | — | `require(esm)` interop floor for CJS consumers |

### 3.2 Build & language
| Package | Pin | Channel |
|---|---|---|
| typescript | **7.0.2** | GA (native compiler line; `next` = 7.1.0-dev.20260708.3, tracked not taken) |
| tsdown | **0.22.4** | GA |
| rolldown (via tsdown) | **1.1.5** | GA — first stable line, out of beta |
| @types/node | **26.1.1** | GA |

### 3.3 Quality, test, bench
| Package | Pin | Channel |
|---|---|---|
| @biomejs/biome | **2.5.3** | GA |
| vitest | **5.0.0-beta.6** | beta (house channel; Aurora precedent 5.0.0-beta.5) |
| @vitest/coverage-v8 | **5.0.0-beta.6** | beta (must match vitest) |
| @vitest/browser | **5.0.0-beta.6** | beta |
| @playwright/test | **1.61.1** | GA (browser provider for @vitest/browser) |
| @cloudflare/vitest-pool-workers | **0.18.2** | GA — **workers island only**, with vitest **4.1.10** + @vitest/runner/snapshot 4.1.10 (its peer range `^4.1.0`); brings miniflare 4.20260706.0 / wrangler 4.108.0 transitively |
| happy-dom | **20.10.6** | GA (jsdom-free DOM for browser-adjacent unit tests) |
| fast-check | **4.9.0** | GA |
| mitata | **1.0.34** | GA |
| size-limit | **12.1.0** | GA |
| @size-limit/preset-small-lib | **12.1.0** | GA |
| publint | **0.3.21** | GA |
| @arethetypeswrong/cli | **0.18.4** | GA |
| knip | **6.25.0** | GA |
| lefthook | **2.1.10** | GA |

### 3.4 Release, docs, monorepo
| Package | Pin | Channel |
|---|---|---|
| @changesets/cli | **2.31.0** | GA (LD-18) |
| turbo | **2.10.4** | GA |
| vitepress | **2.0.0-alpha.18** | alpha (house channel; Aurora precedent alpha.17) |
| shiki | **4.3.1** | GA |

### 3.5 Runtime deps, peers, and benchmark oracles
| Package | Pin | Role |
|---|---|---|
| *(runtime dependencies)* | **none** | LD-02 |
| @opentelemetry/api | **^1.9.1** | optional peer (LD-08), devDep 1.9.1 exact for tests |
| debug | **4.4.3** | devDep — differential oracle + benchmark baseline |
| pino | **10.3.1** | devDep — NDJSON benchmark baseline |

### 3.6 Genesis re-verify block (Phase 0 gate, run verbatim)
```bash
for p in typescript tsdown rolldown @biomejs/biome vitest @vitest/coverage-v8 @vitest/browser \
  @cloudflare/vitest-pool-workers @playwright/test happy-dom fast-check mitata size-limit \
  @size-limit/preset-small-lib publint @arethetypeswrong/cli knip lefthook @changesets/cli \
  turbo vitepress shiki @types/node @opentelemetry/api debug pino pnpm; do
  echo -n "$p :: "; npm view "$p" dist-tags --json | tr -d '\n'; echo; done
node -e "console.log(process.version)"   # expect >= 26.5.0 locally
```
Adopt drift per §0.2; write deltas to `DECISIONS.md`.

### 3.7 CI action pins (GitHub, verified 2026-07-09)
`actions/checkout@v7` (v7.0.0) · `actions/setup-node@v6` (v6.4.0) · `pnpm/action-setup@v6` (v6.0.9) · `oven-sh/setup-bun@v2` (v2.2.0) · `denoland/setup-deno@v2` (v2.0.5) · `changesets/action@v1` (v1.9.0)

---

## §4 Repository Topology (pnpm workspace + turbo 2.10.4)

```
modern-debug/
├─ package.json                  # private root; packageManager: pnpm@11.10.0
├─ pnpm-workspace.yaml           # packages/*, bench, docs, tests-workers
├─ turbo.json                    # build → test → size pipeline, remote-cache-ready
├─ biome.json                    # 2.5.3 schema; formatter+linter, no eslint here
├─ lefthook.yml                  # pre-commit: biome check --staged; pre-push: pnpm verify
├─ .github/workflows/{ci,release}.yml
├─ CLAUDE.md                     # generated Phase 0: distilled from this spec
├─ DECISIONS.md                  # append-only; seeded with LD-01…LD-18
├─ packages/modern-debug/
│  ├─ package.json               # the ONLY publishable package
│  ├─ src/
│  │  ├─ index.ts                # createDebug, enable, disable, configure
│  │  ├─ matcher.ts              # DEBUG grammar → RegExp pair (LD-04)
│  │  ├─ format-pretty.ts        # ANSI/color-hash (LD-06), +Nms diff
│  │  ├─ format-ndjson.ts        # LD-07 record writer, zero-alloc fast path
│  │  ├─ env.ts                  # LD-09 resolution ladder, all feature-detected
│  │  ├─ compat.ts               # → dist compat entry: debug-4.4.3 API surface
│  │  ├─ otel.ts                 # → dist otel entry: trace/span injection
│  │  └─ node.ts                 # → dist node entry: ALS scope()
│  ├─ test/                      # unit + property + differential (vitest 5.0.0-beta.6)
│  └─ tsdown.config.ts           # 4 entries, minify, target: es2023, dts: isolatedDeclarations
├─ tests-workers/                # vitest 4.1.10 + pool-workers 0.18.2 island (LD-13)
├─ bench/                        # mitata 1.0.34 suites vs debug 4.4.3 / pino 10.3.1
├─ fixtures/debug-golden/        # captured debug 4.4.3 outputs (colors, formatters)
└─ docs/                         # vitepress 2.0.0-alpha.18, OKLCH dark-glass theme
```

Publishable `package.json` essentials:
```jsonc
{
  "name": "modern-debug", "version": "0.0.1", "type": "module", "sideEffects": false,
  "engines": { "node": ">=20.19.0" },
  "exports": {
    ".":        { "types": "./dist/index.d.ts",  "default": "./dist/index.js" },
    "./compat": { "types": "./dist/compat.d.ts", "default": "./dist/compat.js" },
    "./otel":   { "types": "./dist/otel.d.ts",   "default": "./dist/otel.js" },
    "./node":   { "types": "./dist/node.d.ts",   "default": "./dist/node.js" }
  },
  "peerDependencies": { "@opentelemetry/api": "^1.9.1" },
  "peerDependenciesMeta": { "@opentelemetry/api": { "optional": true } },
  "files": ["dist"], "license": "MIT"
}
```

---

## §5 Public API Specification

### 5.1 Core (`modern-debug`)
```ts
export interface DebugFields { readonly [k: string]: unknown }
export interface DebugFn {
  (msg: string, fields?: DebugFields): void;
  warn(msg: string, fields?: DebugFields): void;   // sev 40 (LD-16)
  error(msg: string, fields?: DebugFields): void;  // sev 50
  readonly ns: string;
  readonly enabled: boolean;                        // live getter against matcher
  extend(suffix: string, delimiter?: string): DebugFn; // default ':' — debug parity
  fields(base: DebugFields): DebugFn;               // returns child with merged base fields
}
export function createDebug(ns: string): DebugFn;
export function enable(pattern: string): void;      // recompiles matcher; re-binds existing fns
export function disable(): string;                  // returns previous pattern (debug parity)
export function enabled(ns: string): boolean;
export interface Configure {
  format?: 'pretty' | 'ndjson' | 'auto';            // default 'auto' (LD-10)
  sink?: (line: string) => void;                    // default LD-11
  time?: 'diff' | 'epoch' | 'none';                 // pretty default 'diff'; ndjson always epoch
  colors?: boolean;                                 // pretty only; default TTY-detect
}
export function configure(opts: Configure): void;
```

### 5.2 Compat (`modern-debug/compat`) — `debug` 4.4.3 surface
Default export `debug(namespace) → fn` where `fn(format, ...args)` supports `%s %d %i %f %j %o %O %%` and `%`-custom via `debug.formatters` object; plus `fn.enabled`, `fn.namespace`, `fn.color`, `fn.extend()`, `fn.log` override; module-level `debug.enable() / .disable() / .enabled() / .names / .skips / .selectColor() / .humanize` (humanize = minimal ms-formatting, inlined, not the `ms` package). Behavioral parity is defined **by the golden-fixture differential suite** (§8.3), not prose.

### 5.3 OTel (`modern-debug/otel`)
```ts
export function withTraceContext(): void;   // installs a record decorator reading trace.getActiveSpan()
export function traceFields(): { trace_id?: string; span_id?: string }; // manual escape hatch
```
Import cost: pulls `@opentelemetry/api` only here (LD-08). If the peer is absent, module throws a clear install hint at import time.

### 5.4 Node (`modern-debug/node`)
```ts
export function scope<T>(fields: DebugFields, fn: () => T): T;      // AsyncLocalStorage.run
export function scopeFields(): DebugFields | undefined;
```
Works on Node/Bun/Deno; on workerd requires the `nodejs_compat` flag — documented, and the workers island tests both presence and absence paths.

---

## §6 Architecture & Performance Strategy

- **Disabled path is the product.** `createDebug` on a non-matching namespace returns a module-shared frozen noop carrying `{enabled:false}` semantics; calling it is a single megamorphic-safe function call, zero allocation. Gate: ≤1.05× the cost of `debug` 4.4.3's disabled call (mitata, 26.5.0 and 24.18.0).
- **Enabled pretty path:** namespace prefix (with ANSI color codes) pre-concatenated at creation/enable time; per-call work = time-diff + one template concat + one sink call. No intermediate arrays, no `util.format`.
- **NDJSON path:** hand-rolled serializer for the fixed envelope keys (`t`,`ns`,`msg`,`sev`,`trace_id`,`span_id`) + `JSON.stringify` only for user fields; strings pre-escaped via charCode scan with a no-escape fast path. Target: ≥0.8× pino 10.3.1 single-record throughput (honesty note: pino is a transport-optimized 60KB+ system; parity-minus-20% at 1/60th the size is the win — do not chase past it at byte-budget cost).
- **Matcher:** compiled once; `enable()` swaps the compiled pair and flips live `DebugFn` bindings via an internal registry of WeakRef'd fns (falls back to re-check-on-call where WeakRef unavailable — it is available on all five target runtimes; keep the fallback for exotic embedders).
- **Isolate safety:** no per-request module state; matcher is global-config, ALS carries request state (Workers-correct).

---

## §7 Migration Layer

- **Alias recipe (README + docs):** `"overrides": { "debug": "npm:modern-debug@^1" }` (npm) / pnpm `overrides` / bun equivalent — routes the *transitive* 300M-weekly install base through `/compat` via a `debug`-shaped conditional export set on the compat entry. Phase 6 validates the alias against three real dependents in fixtures: `express` 5.2.1, `send`, `socket.io` (dev-only fixture installs; versions resolved at fixture-lock time and recorded).
- **`DEBUG` env grammar:** identical (LD-04). `MODERN_DEBUG_FORMAT` is additive, never required.
- **Codemod: not shipped for v1.** The alias covers the dominant path; a source codemod is a tracked post-1.0 item. (Contrast with specs #2/#4/#5 where the codemod *is* the product.)

---

## §8 Testing & Quality Gates

1. **Unit** (vitest 5.0.0-beta.6): matcher grammar table (≥60 cases incl. `*`, `-a:*`, mixed separators), env ladder with every feature-detect branch mocked, format switching, extend/fields inheritance.
2. **Property** (fast-check 4.9.0): (a) matcher — for random pattern/namespace pairs, our matcher decision === `debug` 4.4.3's `enabled()`; (b) NDJSON — every emitted line `JSON.parse`s and round-trips fields.
3. **Golden differential:** fixtures captured from `debug` 4.4.3 (colors per namespace, formatter outputs, diff-timing shape with time normalized) — `/compat` output must byte-match after timestamp normalization. Color-hash test asserts LD-06 verbatim.
4. **Runtime matrix (CI):** unit suite on Node 24.18.0 + 26.5.0 (ubuntu/windows/macos), Bun (setup-bun v2), Deno 2 (setup-deno v2), browser via @vitest/browser 5.0.0-beta.6 + playwright 1.61.1 (chromium), workerd via tests-workers island (vitest 4.1.10 + pool-workers 0.18.2).
5. **Size gates (size-limit 12.1.0, min+brotli):** `.` ≤ **1536 B** (amended per G-10) · `./compat` ≤ **1800 B** · `./otel` ≤ **512 B** · `./node` ≤ **448 B**. CI-enforced from Phase 1 onward.
6. **Bench gates (mitata 1.0.34, informational until Phase 5, enforced after):** disabled ≤1.05× debug; enabled-pretty ≥1.5× debug; ndjson ≥0.8× pino.
7. **Coverage:** ≥95% lines on `matcher.ts`/`env.ts`/formatters; ≥90% package-wide (v8 provider).
8. **Publish hygiene:** publint 0.3.21 clean; attw 0.18.4 clean (`--profile esm-only`); knip 6.25.0 zero unused.

`pnpm verify` = `turbo run typecheck lint test size publint attw` — the loop from §0.4.

---

## §9 Roadmap 0.0.1 → 1.0.0

| Ver | Deliverable | Gate (must exit 0) |
|---|---|---|
| 0.0.1 | Phase 0: scaffold (topology §4), all pins installed, §3.6 re-verify run, CLAUDE.md + DECISIONS.md seeded, `pnpm verify` green on empty lib | `pnpm verify` + re-verify block |
| 0.1.0 | Matcher (LD-04) + env ladder (LD-09), unit+property suites | matcher property suite vs debug 4.4.3 green |
| 0.2.0 | Core `createDebug` + pretty formatter + LD-06 color hash | golden color fixtures green; size `.` ≤1024B |
| 0.3.0 | NDJSON formatter + configure()/sinks + levels (LD-16 placement decided by measured bytes) | NDJSON property suite; size gate holds |
| 0.4.0 | `/node` ALS scope; `/otel` injection | both subpath size gates; otel peer-absent error-path test |
| 0.5.0 | `/compat` full debug 4.4.3 surface + formatters | golden differential suite 100% |
| 0.6.0 | Runtime matrix in CI (Bun/Deno/browser/workerd island) | all five runtimes green |
| 0.7.0 | Bench suite; optimize to gates; record numbers in `bench/RESULTS.md` | §8.6 gates flip to enforced, green |
| 0.8.0 | Alias-migration fixtures (express 5.2.1 et al.) | fixture apps log correctly through override |
| 0.9.0 | Docs site (vitepress 2.0.0-alpha.18, OKLCH dark-glass, migration guide, divergence notes) | docs build; link-check |
| 0.9.x | RC hardening: fuzz matcher 10⁶ cases, npm pack audit, README API freeze | zero P1s for 7 days |
| **1.0.0** | Publish with provenance | §12 checklist 100% |

---

## §10 CI/CD & Publishing

`.github/workflows/ci.yml` (sketch — exact pins §3.7):
```yaml
jobs:
  verify:
    strategy: { matrix: { os: [ubuntu-latest, windows-latest, macos-latest], node: ['24.18.0', '26.5.0'] } }
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6            # reads packageManager pnpm@11.10.0
      - uses: actions/setup-node@v6
        with: { node-version: ${{ matrix.node }}, cache: pnpm }
      - run: pnpm install --frozen-lockfile && pnpm verify
  bun:    { steps: [checkout@v7, oven-sh/setup-bun@v2, bun test-runner shim → vitest] }
  deno:   { steps: [checkout@v7, denoland/setup-deno@v2 (deno-version: v2.x), deno-vitest bridge] }
  workers:{ steps: [checkout@v7, pnpm@v6, setup-node@v6 (26.5.0), pnpm -C tests-workers test] }
  browser:{ steps: [checkout@v7, pnpm@v6, setup-node@v6, npx playwright install chromium, pnpm test:browser] }
```
`release.yml`: changesets/action@v1 → version PR → on merge `pnpm -r publish --access public --provenance` under GitHub OIDC (`id-token: write`). npm provenance is mandatory from 0.1.0.

---

## §11 Documentation Site

VitePress 2.0.0-alpha.18 + shiki 4.3.1. House design system: OKLCH tokens, dark glassmorphism, Fraunces (display) / Geist (text) / JetBrains Mono (code). Required pages: Why (the debug-is-frozen case, with the §8.6 bench table rendered live), Quickstart, Migration-from-debug (alias recipe + grammar guarantee), Structured Logging, OTel, ALS scoping, Runtime matrix, API reference (generated from d.ts), Divergence notes (anything golden suite normalizes, e.g., timestamp text).

## §12 Definition of Done (1.0.0)
- [ ] All §8 gates enforced and green on the full CI matrix
- [ ] Size: 1536 (G-10) /1800/512/448 B budgets hold at publish commit
- [ ] Golden differential vs debug 4.4.3: 100%
- [ ] Bench RESULTS.md committed with reproduction commands
- [ ] publint + attw + knip clean; provenance on npm; `DECISIONS.md` reconciled with zero open items
- [ ] Docs deployed; alias migration validated against ≥3 real dependents
