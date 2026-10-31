# modern-debug — Genesis→1.0.0 Execution Spec

> **Replaces:** `debug` 4.4.3 (#1 on npm-packages-ripe-for-modern-replacement, ≈939M weekly downloads (npm API, week ending 2026-10-29), architecture frozen since 2014) *(amended per G-17: the 2026-07-09 figure was ~300M)*
> **Product:** Sub-2KB *(amended per G-10: was Sub-1KB)*, ESM-only, universal-runtime diagnostic logger with `debug`-grammar namespaces, structured NDJSON output, OpenTelemetry trace correlation, AsyncLocalStorage request scoping, and a byte-for-byte `DEBUG` env-var compatibility layer.
> **Spec version:** 1.1.0 (registry refresh) · **Authored:** 2026-07-09 · **Registry-verified:** 2026-10-30 (every pin below pulled live from registry.npmjs.org / nodejs.org / GitHub; 1.0.0 was registry-verified 2026-07-09)
> **Executor:** Claude Code 2.1.304 (verified: `claude --version` on the executing host, 2026-10-30; npm `latest` was 2.1.316 that day; 1.0.0 named 2.1.205)
> **Publisher:** @crimson_dev · npm name `modern-debug` (unscoped, matching `modern-cmdk` / `modern-xlsx` / `modern-pdf-lib` convention) · unpublished (registry 404 on 2026-10-30); publish is parked on the owner (G-17)

**Channel events since 1.0.0** (2026-07-09 → 2026-10-30; DECISIONS G-16, G-17). *What moved:* Node.js 26 became Active LTS (26.13.0 "Lithium", LTS since 2026-10-28), 24 is maintenance LTS (24.22.2 "Krypton"), 27.0.0-alpha.0.0.0 shipped (2026-10-29) and Node 20 reached EOL (2026-04-30) (nodejs.org/dist/index.json, read 2026-10-30). pnpm moved to 12 (12.17.0, which ignores `package.json#pnpm`), changesets to 3, size-limit to 14 (whose bundler is now rolldown), tsdown to 0.23, vitest to the 5.1 beta line, TypeScript to the 7.1 nightlies, and workerd made Node.js compatibility the default from compatibility date 2026-08-04. *What was adopted:* the newest build on any channel for every dependency, toolchain and action (§0.2 amended per G-17), the engines floor >=22.13.0 (LD-01), and the bumps marked `→ … (G-17)` in §3. *Standing triggers that fired:* LD-18's changesets 3 GA (G-16), and LD-13's island premise: `@cloudflare/vitest-pool-workers` was renamed `@cloudflare/vitest-plugin`, whose 1.4.11 peers `vitest ^4.1.0 || ^5.0.0`, so the vitest-4 workers island is retired (G-17). *Oracles:* oracle debug 4.4.3 unchanged; typescript-legacy 5.8.3 (the G-14 legacy-TS gate) unchanged.

---

## §0 Executor Protocol — READ FIRST

1. **Read this entire file before writing any code.** Authority order: this spec → `DECISIONS.md` (append-only log you maintain) → inline code comments. Nothing else overrides a Locked Decision (LD).
2. **Phase 0 re-verification is mandatory.** Pins below were verified 2026-07-09 and drift weekly. At genesis, run the re-verify block in §3.6. If a pin has moved: adopt the newer version ~~**within the same channel** (latest→latest, beta→beta)~~, record the delta in `DECISIONS.md`, and continue. If a channel changed (e.g., a beta went GA), adopt GA and log it. Never silently keep a stale pin. *(amended per G-17: the same-channel clause is superseded by the owner's standing order (peak-modern, 2026-09-23, widened 2026-10-10): every dependency, toolchain and action takes its **newest release on any channel**, exact-pinned. The only hold is a newest build verifiably broken for this repo, recorded with evidence beside the pin and in `.peak-modern-holds.json`. Oracle pins (debug 4.4.3, typescript-legacy 5.8.3) are exempt.)*
3. **Execute phases strictly in order** (§9). Every phase ends with a **gate** — a command block that must exit 0. Do not begin phase N+1 with a red gate. Fix or revert.
4. **Self-verification loop after every substantive change:** `pnpm verify` (typecheck → lint → knip → test → size → publint/attw) *(amended per G-14: knip wired in as `//#knip`)*. This is wired in Phase 0 and must never be weakened.
5. **Honesty rule:** if a gate cannot be met (e.g., the 1024-byte budget *(amended per G-10: 1536 B)*), do not delete the gate. Stop, write the measured number and the blocking cause into `DECISIONS.md`, and surface it.

---

## §1 Mission & Non-Goals

### Mission
The most-installed utility on npm *(amended per G-17: one of the most-downloaded packages on npm, ≈939M downloads/week (npm API, week ending 2026-10-29); semver had ≈1,136.8M the same week)* has no JSON mode, no levels, no trace correlation, no async-context awareness, and no tree-shakeable ESM build. `modern-debug` keeps the two things that made `debug` win — the `app:db`-style namespace grammar and near-zero disabled-path cost — and rebuilds everything else for 2026: structured output, OTel spans, ALS scoping, and first-class operation on Node, Bun, Deno, Cloudflare Workers, and browsers.

### Product pillars
1. **Tiny core.** `import { createDebug } from 'modern-debug'` costs ≤1536 bytes min+brotli (amended from 1024 per DECISIONS G-09/G-10, owner-approved 2026-07-10 — the spec-mandated §5.1+LD-07+LD-10 core surface measures a ~1.4 KB floor). Hard gate, never waived. *(measured per G-17: 1460 B (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30))*
2. **Drop-in migration.** `modern-debug/compat` is API-compatible with `debug` 4.4.3 (default-export factory, printf formatters, `.enabled`, `.extend()`, `DEBUG` env grammar, same color-hash algorithm) so `"debug": "npm:modern-debug@^1"` aliasing works for the transitive install base.
3. **Structured by default where it matters.** Non-TTY sinks emit NDJSON records; TTY gets the classic colored pretty format. One flag flips either way.
4. **Observability-native.** `modern-debug/otel` injects `trace_id`/`span_id` from the active `@opentelemetry/api` context. `modern-debug/node` adds `scope(fields, fn)` via `AsyncLocalStorage` so every log line inside a request carries the request's fields.
5. **Universal.** Identical behavior on Node 24 LTS / 26 Current *(amended per G-17: Node 26 Active LTS and 24 maintenance LTS, with a 22.13.0 floor job and a non-blocking 27 alpha leg)*, Bun, Deno 2, workerd, and evergreen browsers — proven in CI, not claimed.

### Non-Goals (v1)
- **Not a log shipper/router.** One sink function. Transports are the consumer's problem (pino ecosystem exists for that).
- **No log rotation, no file targets, no redaction engine.** Out of scope; keeps the byte budget honest.
- **No CJS build.** ESM-only, `"type": "module"`, no `require` condition *(amended per G-12: `"."` has a `require` condition to the ESM `dist/compat-cjs.js`; no CJS artifact)*. Consumers on CJS need Node ≥20.19.0 (`require(esm)` interop floor) — encoded in `engines` *(amended per G-17: Node ≥ 22.13.0: require(esm) is unflagged since 22.12.0 and warning-free since 22.13.0 (nodejs/node modules.md history, 2026-10-30); Node 20 reached EOL 2026-04-30)*.
- **No custom `%` formatter *registration* in core.** Core takes `(msg, fields?)`. The printf grammar lives entirely in `/compat`.

---

## §2 Locked Decisions

| ID | Decision | Rationale | Status |
|---|---|---|---|
| LD-01 | ESM-only; `exports` map with `"."`, `"./compat"`, `"./otel"`, `"./node"`; no `main`, no CJS *(amended per G-17: published `engines.node` >=22.13.0, root >=24.22.2; ESM-only, no CJS artifact and the four-entry map stand; G-12's `"."` `require` condition relies on `require(esm)`, which is unflagged and warning-free on 22.13.0; the CI `floor` job runs the smoke and the alias fixture on 22.13.0 to check it (G-17.4))* | House standard; enables per-subpath byte budgets; CJS interop handled by Node ≥20.19 `require(esm)` *(amended per G-17: Node ≥22.13.0)* | LOCKED |
| LD-02 | Zero runtime dependencies in all four subpaths | The product *is* the byte budget; a single dep forfeits it | LOCKED |
| LD-03 | **No WASM.** Core hot path is small-string formatting; JS↔WASM boundary crossing costs more than it saves at this size | Performance honesty over buzzwords; documented so nobody "optimizes" it in later | LOCKED |
| LD-04 | Namespace matcher compiles the pattern set **once** to a `{allow: RegExp[], deny: RegExp[]}` pair, exact `debug` 4.4.3 grammar: comma/space separators, `*` wildcard, `-` prefix negation, colon-delimited namespaces *(amended per G-08: allow/deny template pair, linear `matchesTemplate` walk, no RegExp)* | Drop-in `DEBUG` env compatibility is pillar #2 | LOCKED |
| LD-05 | Disabled namespaces return a **shared noop function** from `createDebug`; re-evaluation only on explicit `enable()`/`configure()` call | This is the trick that makes `debug` free when off; we keep it | LOCKED |
| LD-06 | Color selection in pretty mode uses `debug` 4.4.3's exact hash (`for (i) hash = ((hash << 5) - hash + charCode) | 0` → `colors[Math.abs(hash) % colors.length]`) and its ANSI 256-color palette | Same namespace ⇒ same color after migration; verified by fixture test against `debug` 4.4.3 output | LOCKED |
| LD-07 | NDJSON record shape: `{"t":<epoch-ms>,"ns":"app:db","msg":"...","sev"?:10|20|30|40|50,"trace_id"?,"span_id"?,...fields}` — flat, no nesting of user fields, key order fixed for diff-ability | Structured-output pillar; pino-compatible severity numbers for downstream tooling | LOCKED |
| LD-08 | `@opentelemetry/api` is an **optional peerDependency** (`^1.9.1`, `peerDependenciesMeta.optional=true`), imported only inside `modern-debug/otel` | Core stays zero-dep; OTel users opt in; verified 1.9.1 = latest 2026-07-09 *(re-checked per G-17: peer range unchanged; the devDependency is 1.10.0)* | LOCKED |
| LD-09 | Env resolution order: explicit `enable()` call > `process.env.DEBUG` (feature-detected) > `globalThis.DEBUG` > browser `localStorage.debug` (feature-detected, try/caught) > disabled | Covers Node/Bun/Deno (process.env), Workers (no env object without bindings → globalThis escape hatch), browsers (`debug` parity) | LOCKED |
| LD-10 | Format auto-detect: TTY (`process.stderr.isTTY` feature-detected) → pretty; otherwise NDJSON. Overridable via `configure({format})` or `MODERN_DEBUG_FORMAT=pretty\|ndjson` | "Structured where it matters" without breaking local DX | LOCKED |
| LD-11 | Default sink: `process.stderr.write` where present, else `console.error` | Matches `debug` Node behavior; Workers/browsers get console | LOCKED |
| LD-12 | Toolchain: TypeScript **7.0.2** (GA native compiler — verified `latest` 2026-07-09), emit via tsdown 0.22.4 (rolldown 1.1.5), `.d.ts` via **isolatedDeclarations** (oxc path, no tsc emit) *(amended per G-17: TypeScript 7.1.0-dev.20261031.1 (`next` nightly), tsdown 0.23.4 (rolldown 1.2.16); d.ts still isolatedDeclarations via `dts: { generator: 'oxc' }`; build target ES2024)* | Newest GA of the native-TS line; isolatedDeclarations keeps d.ts generation compiler-independent | LOCKED |
| LD-13 | Vitest **5.0.0-beta.6** everywhere except the Workers island (`tests-workers/`), which pins vitest **4.1.10** because `@cloudflare/vitest-pool-workers` 0.18.2 declares `peerDependencies: vitest ^4.1.0` (verified from its packument 2026-07-09) *(amended per G-16: main line now 5.0.0-rc.2; island 4.1.11 + pool-workers 0.22.0, whose peers remain `vitest ^4.1.0` — island contract intact)* *(amended per G-17: island retired. pool-workers was renamed `@cloudflare/vitest-plugin`; 1.4.11 peers `vitest ^4.1.0 \|\| ^5.0.0`, so `tests-workers/` runs vitest 5.1.0-beta.1 like the rest of the repo, with an `allowedVersions` rule for the prerelease. The workerd suite stays. Re-arm: a plugin peer range that excludes the main vitest line)* | Bleeding edge where possible; the one hard peer conflict is isolated, not fought | LOCKED |
| LD-14 | Benchmarks: mitata 1.0.34; property tests: fast-check 4.9.0 *(amended per G-17: fast-check now 4.10.2; mitata stays 1.0.34)* | House standard | LOCKED |
| LD-15 | `sideEffects: false`; no top-level mutable module state except the matcher singleton, initialized lazily *(restated per G-08: matcher singleton + configure() snapshot + WeakRef registry + `send`-level constants; nothing per-request at module level)* | Tree-shaking + Workers isolate-reuse safety | LOCKED |
| LD-16 | Levels are core (`.warn`, `.error` sugar setting `sev`), but cost ≤48 bytes; if they push core past 1024B they move to a `/levels` subpath *(budget amended per G-10: 1536 B; levels measured at 9 B per G-09, so they stay in core)* | Budget is senior to feature placement | LOCKED |
| LD-17 | Time in pretty mode: `+Nms` diff (debug parity) computed via `performance.now()`; NDJSON uses `Date.now()` epoch-ms | Familiar DX / machine-parseable split | LOCKED |
| LD-18 | changesets 2.31.0 for versioning (3.0.0-next.8 exists; release tooling stays on GA — tracked upgrade trigger: changesets 3 GA) *(amended per G-16: trigger fired — changesets 3 went GA; now 3.0.1; amended per G-17: now 3.0.3)* | Release plumbing must not be the experiment | LOCKED |

---

## §3 Verified Version Manifest — nothing unpinned, nothing omitted

All verified **2026-07-09** against registry.npmjs.org unless noted. Channel notation: `GA` = latest dist-tag; prerelease channel named where taken. *(amended per G-17: re-verified 2026-10-30. A `→ X (G-17)` suffix gives the pin in the tree on that date, read from the six package.json files and the workflows; channels are the dist-tags from `npm view <pkg> dist-tags` on that date. The 2026-07-09 pin stays in front of the arrow. Rows without an arrow are unchanged.)*

### 3.1 Runtimes & package manager
| Component | Pin | Channel | Notes |
|---|---|---|---|
| Node.js (dev/CI primary) | **26.5.0** → **26.13.0** (G-17) | Current → Active LTS "Lithium", LTS since 2026-10-28 (G-17) | nodejs.org/dist index, newest Current *(amended per G-17: newest Active LTS; nodejs.org/dist/index.json, read 2026-10-30)* |
| Node.js (CI floor) | **24.18.0** → **24.22.2** (G-17) | LTS "Krypton" → maintenance LTS "Krypton" (G-17) | newest LTS *(amended per G-17: second blocking `verify` line and root `engines.node` floor; the published floor has its own job, below)* |
| Node.js (CI early-warning leg) | **27.0.0-alpha.0.0.0** (G-17) | alpha, released 2026-10-29 | *(added per G-17)* non-blocking `verify` leg (job-level `continue-on-error`) |
| Node.js (CI published-floor job) | **22.13.0** (G-17) | maintenance line 22 (newest 22.23.4) | *(added per G-17)* the exact `engines.node` floor: the `floor` job runs the smoke and the alias fixture on it |
| pnpm | **11.10.0** → **12.17.0** (G-17) | GA (`latest`) → `next-12` (G-17; `latest` 12.16.1) | `packageManager` field pins exact |
| Bun (CI) | latest via setup-bun **v2.2.0** | GA action | runtime matrix |
| Deno (CI) | 2.x via setup-deno **v2.0.5** | GA action | runtime matrix |
| `engines.node` (published) | **>=20.19.0** → **>=22.13.0** (G-17) | — | `require(esm)` interop floor for CJS consumers *(amended per G-17: require(esm) is unflagged since 22.12.0 and warning-free since 22.13.0 (nodejs/node modules.md history, 2026-10-30); Node 20 reached EOL 2026-04-30)* |
| `engines.node` (root, contributors) | **>=24.22.2** (G-17) | — | *(added per G-17)* contributor floor |

### 3.2 Build & language
| Package | Pin | Channel |
|---|---|---|
| typescript | **7.0.2** → **7.1.0-dev.20261031.1** (G-17; nightly refreshed 2026-10-31 per G-18) | GA (native compiler line; `next` = 7.1.0-dev.20260708.3, tracked not taken) *(amended per G-17: `next` nightly taken; `latest` stays 7.0.2)* |
| typescript-legacy | **npm:typescript@5.8.3** | oracle pin, exempt from §0.2 *(added per G-17: the G-14 legacy-TS gate)* |
| tsdown | **0.22.4** → **0.23.4** (G-17) | GA |
| rolldown (via tsdown) | **1.1.5** → **1.2.16** (G-17) | GA — first stable line, out of beta |
| rolldown-plugin-dts (via tsdown) | **0.28.8** (G-17) | GA *(added per G-17: `latest` 0.29.0 is out of reach, tsdown 0.23.4 depends on `^0.28.8`)* |
| @types/node | **26.1.1** → **26.6.6** (G-17) | GA |

### 3.3 Quality, test, bench
| Package | Pin | Channel |
|---|---|---|
| @biomejs/biome | **2.5.3** → **2.6.4** (G-17) | GA |
| vitest | **5.0.0-beta.6** → **5.1.0-beta.1** (G-17) | beta (house channel; Aurora precedent 5.0.0-beta.5) *(amended per G-17: `beta`; `latest` 5.0.5)* |
| @vitest/coverage-v8 | **5.0.0-beta.6** → **5.1.0-beta.1** (G-17) | beta (must match vitest) |
| @vitest/browser | **5.0.0-beta.6** → **5.1.0-beta.1** (G-17) | beta |
| @vitest/browser-playwright | **5.1.0-beta.1** (G-17) | beta *(added per G-17: in the tree since G-12, absent from the 1.0.0 manifest)* |
| @playwright/test | **1.61.1** → **1.65.0-alpha-2026-10-31** (G-17; nightly refreshed 2026-10-31 per G-18) | GA (browser provider for @vitest/browser) *(amended per G-17: `next`; `latest` 1.64.1)* |
| @cloudflare/vitest-pool-workers | **0.18.2** → retired (G-17) | GA — **workers island only**, with vitest **4.1.10** + @vitest/runner/snapshot 4.1.10 (its peer range `^4.1.0`); brings miniflare 4.20260706.0 / wrangler 4.108.0 transitively *(amended per G-17: renamed upstream, its `latest` 0.23.0 is deprecated; replaced by the row below; @vitest/runner and @vitest/snapshot dropped)* |
| @cloudflare/vitest-plugin | **1.4.11** (G-17) | GA *(added per G-17)* — `tests-workers/` on the root vitest 5.1.0-beta.1 line; peers `vitest ^4.1.0 \|\| ^5.0.0`; brings miniflare 5.20261023.3-beta / wrangler 4.156.0 transitively |
| miniflare (tests-workers direct pin) | **5.20261023.3-beta** (G-17) | beta (`latest` 4.20260730.0) *(added per G-17)* — bundles workerd 1.20261023.1 |
| happy-dom | **20.10.6** → removed (G-17) | GA (jsdom-free DOM for browser-adjacent unit tests) *(amended per G-17: no test or config selects a happy-dom environment)* |
| fast-check | **4.9.0** → **4.10.2** (G-17) | GA |
| mitata | **1.0.34** | GA |
| size-limit | **12.1.0** → **14.3.0** (G-17) | GA *(amended per G-17: the bundler is now rolldown, §8.5)* |
| @size-limit/preset-small-lib | **12.1.0** → **14.3.0** (G-17) | GA |
| publint | **0.3.21** → **0.3.25** (G-17) | GA |
| @arethetypeswrong/cli | **0.18.4** → **0.18.5** (G-17) | GA |
| knip | **6.25.0** → **6.44.0** (G-17) | GA |
| lefthook | **2.1.10** → **2.2.2** (G-17) | GA |

### 3.4 Release, docs, monorepo
| Package | Pin | Channel |
|---|---|---|
| @changesets/cli | **2.31.0** → **3.0.3** (G-17) | GA (LD-18) |
| turbo | **2.10.4** → **2.11.11-canary.1** (G-17) | GA *(amended per G-17: `canary`; `latest` 2.11.10)* |
| vitepress | **2.0.0-alpha.18** → **2.0.0-alpha.21** (G-17) | alpha (house channel; Aurora precedent alpha.17) *(amended per G-17: `next`; `latest` 1.6.4)* |
| shiki | **4.3.1** → **4.5.0** (G-17) | GA |
| @fontsource-variable/fraunces, geist, jetbrains-mono | **5.3.0** | GA *(added per G-17: the §11 fonts; verified unchanged at newest)* |

### 3.5 Runtime deps, peers, and benchmark oracles
| Package | Pin | Role |
|---|---|---|
| *(runtime dependencies)* | **none** | LD-02 |
| @opentelemetry/api | **^1.9.1** | optional peer (LD-08), devDep 1.9.1 exact for tests *(amended per G-17: devDep 1.10.0; the peer range is unchanged)* |
| debug | **4.4.3** | devDep — differential oracle + benchmark baseline |
| @types/debug | **4.1.13** | devDep — compat type-parity reference (G-14) *(added per G-17: verified unchanged at newest)* |
| pino | **10.3.1** → **10.4.0** (G-17) | devDep — NDJSON benchmark baseline |

### 3.6 Genesis re-verify block (Phase 0 gate, run verbatim)
*(amended per G-17: `@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`; `happy-dom` dropped; `miniflare`, `@vitest/browser-playwright` and `rolldown-plugin-dts` added; the local Node expectation was >= 26.5.0)*
```bash
for p in typescript tsdown rolldown rolldown-plugin-dts @biomejs/biome vitest @vitest/coverage-v8 \
  @vitest/browser @vitest/browser-playwright @cloudflare/vitest-plugin miniflare @playwright/test \
  fast-check mitata size-limit @size-limit/preset-small-lib publint @arethetypeswrong/cli knip \
  lefthook @changesets/cli turbo vitepress shiki @types/node @opentelemetry/api debug pino pnpm; do
  echo -n "$p :: "; npm view "$p" dist-tags --json | tr -d '\n'; echo; done
node -e "console.log(process.version)"   # expect >= 26.13.0 locally (amended per G-17; was 26.5.0)
```
Adopt drift per §0.2 *(amended per G-17: newest build on any channel)*; write deltas to `DECISIONS.md`.

**Standing triggers** *(amended per G-17: rewritten 2026-10-30)*.
- *Fired:* LD-18's changesets 3 GA (G-16). LD-13's island premise (G-17): `@cloudflare/vitest-pool-workers` was renamed `@cloudflare/vitest-plugin`, which accepts vitest 5, so the island retired.
- *Open:*
  - OTel JS Logs API: the `@opentelemetry/api` 1.10.0 typings export a Logs API. If the OTel JS 3.0.0 / 0.300.0 stability claims hold when checked against npm, a Logs bridge with a `^1.10.0` peer floor amends LD-08 (G-17.11).
  - rolldown-plugin-dts 0.29.0 (`latest`) cannot be installed while tsdown 0.23.4 depends on `^0.28.8`. Adopt it when a tsdown release widens that range (G-17.11).
  - Each `peerDependencyRules.allowedVersions` rule (`rolldown-plugin-dts>typescript`, `@cloudflare/vitest-plugin>vitest`) is re-checked at every refresh and removed once the peer range covers the pin (G-17.3).
  - Any `debug` minor or patch: full parity re-run (golden fixtures, matcher property suite, 10⁶ fuzz) before the oracle pin moves.
  - A `@cloudflare/vitest-plugin` peer range that excludes the main vitest line: re-open the island question (LD-13) (G-17.4).

### 3.7 CI action pins (GitHub, verified 2026-07-09)
`actions/checkout@v7` (v7.0.0) · `actions/setup-node@v6` (v6.4.0) · `pnpm/action-setup@v6` (v6.0.9) · `oven-sh/setup-bun@v2` (v2.2.0) · `denoland/setup-deno@v2` (v2.0.5) · `changesets/action@v1` (v1.9.0)

*(amended per G-17, verified 2026-10-30: the workflows pin exact tags, not floating majors.)* Across ci.yml, release.yml and docs.yml: `actions/checkout@v7.0.1` · `pnpm/setup@v3.1.2` (replaces `pnpm/action-setup`, `actions/setup-node` and the explicit install in every ci.yml and docs.yml job and in release.yml `verify`; release.yml `version` and `publish` set `install: false` and run `pnpm install --frozen-lockfile --ignore-scripts`) · `actions/setup-node@v7.1.0` (only where a second Node.js is needed: the `floor` job's 22.13.0 and the `bench` job's 24.22.2) · `oven-sh/setup-bun@v2.2.0` · `denoland/setup-deno@v2.0.5` · `actions/upload-artifact@v7.0.2` (bench RESULTS.md) · `changesets/action@v2.1.2` (sub-actions `select-mode`, `pack`, `version`, `publish`). Pages deploy in docs.yml (G-15): `actions/configure-pages@v6.0.0` · `actions/upload-pages-artifact@v5.0.0` · `actions/deploy-pages@v5.0.1`.

---

## §4 Repository Topology (pnpm workspace + turbo 2.10.4 *(amended per G-17: turbo 2.11.11-canary.1)*)

*(amended per G-17: tree redrawn from the working tree on 2026-10-30; each changed or added comment carries its G-NN marker)*
```
modern-debug/
├─ package.json                  # private root; packageManager: pnpm@12.17.0; engines >=24.22.2; `release` script (amended per G-17; was pnpm@11.10.0)
├─ pnpm-workspace.yaml           # packages/*, bench, docs, tests-workers; allowBuilds, minimumReleaseAgeExclude, peerDependencyRules.allowedVersions (rules amended per G-17)
├─ turbo.json                    # build → test → size pipeline, remote-cache-ready; root tasks //#lint and //#knip (knip added per G-14)
├─ biome.json                    # 2.6.4 schema; formatter+linter, no eslint here; Markdown/YAML formatters on, except DECISIONS.md, this spec and bench/RESULTS.md (amended per G-17; was 2.5.3)
├─ lefthook.yml                  # pre-commit: biome check --staged; pre-push: pnpm verify; CI sets LEFTHOOK=0 (amended per G-17)
├─ .github/workflows/{ci,release,docs}.yml   # docs.yml added per G-15
├─ AGENTS.md                     # the distilled executor notes (amended per G-18: was CLAUDE.md)
├─ CLAUDE.md                     # `@AGENTS.md` import for Claude Code (amended per G-18)
├─ DECISIONS.md                  # append-only; seeded with LD-01…LD-18
├─ packages/modern-debug/
│  ├─ package.json               # the ONLY publishable package
│  ├─ src/
│  │  ├─ index.ts                # createDebug, enable, disable, configure
│  │  ├─ matcher.ts              # DEBUG grammar → template pair (LD-04, amended per G-08)
│  │  ├─ format-pretty.ts        # ANSI/color-hash (LD-06), +Nms diff
│  │  ├─ format-ndjson.ts        # LD-07 record writer, zero-alloc fast path
│  │  ├─ json.ts                 # safeJson → {"$fields":"unserializable"} marker (G-08, G-17)
│  │  ├─ hooks.ts                # cross-entry hook slots that /node and /otel fill; core reads them per emit
│  │  ├─ env.ts                  # LD-09 resolution ladder, all feature-detected
│  │  ├─ compat.ts               # → dist compat entry: debug-4.4.3 API surface
│  │  ├─ compat-cjs.ts           # → dist compat-cjs entry: the "." require target (G-12) + compat-cjs.d.cts legacy-TS types (G-14)
│  │  ├─ otel.ts                 # → dist otel entry: trace/span injection
│  │  └─ node.ts                 # → dist node entry: ALS scope()
│  ├─ test/                      # unit + property + differential (vitest 5.1.0-beta.1; amended per G-17, was 5.0.0-beta.6)
│  ├─ test-browser/              # Chromium via @vitest/browser + Playwright (§8.4)
│  ├─ .size-limit.mjs            # §8.5 gates; rolldown bundler, modifyRolldownConfig on ./node (amended per G-17)
│  └─ tsdown.config.ts           # 4 entries, minify, target: es2023, dts: isolatedDeclarations (amended: dts: { generator: 'oxc' } per G-06; 5th entry compat-cjs per G-12; copies src/compat-cjs.d.cts per G-14; target es2024 per G-17)
├─ tests-workers/                # vitest 4.1.10 + pool-workers 0.18.2 island (LD-13) (amended per G-17: root vitest 5.1.0-beta.1 + @cloudflare/vitest-plugin 1.4.11 + miniflare 5.20261023.3-beta; no @vitest/runner or @vitest/snapshot pins)
│  ├─ workerd-compat.ts          # the one COMPATIBILITY_DATE (2026-10-23) for the pool and both raw-miniflare suites (added per G-17)
│  ├─ test/                      # @cloudflare/vitest-plugin pool suites
│  └─ test-miniflare/            # raw miniflare suites: default sink, nodejs_compat / nodejs_als paths
├─ tests-runtimes/smoke.mjs      # ESM smoke for Node, Bun, Deno and the 22.13.0 floor job (G-12, G-17)
├─ bench/                        # mitata 1.0.34 suites vs debug 4.4.3 / pino 10.3.1 (amended per G-17: pino 10.4.0)
├─ fixtures/debug-golden/        # captured debug 4.4.3 outputs (colors, formatters)
├─ fixtures/alias-migration/     # §7 fixture: standalone pnpm root (outside the workspace glob) (G-12)
│  └─ pnpm-workspace.yaml        # packages: []; overrides: debug: file:../../packages/modern-debug (amended per G-17: pnpm 12 ignores package.json#pnpm)
└─ docs/                         # vitepress 2.0.0-alpha.18, OKLCH dark-glass theme (amended per G-17: 2.0.0-alpha.21)
   └─ public/favicon.svg         # site favicon (added per G-17)
```

Publishable `package.json` essentials:
```jsonc
{
  "name": "modern-debug", "version": "0.0.1", "type": "module", "sideEffects": false,
  "author": "Albert Badalov",                                   // added per G-17
  "homepage": "https://abcrimson.github.io/modern-debug/",       // added per G-17
  "bugs": { "url": "https://github.com/ABCrimson/modern-debug/issues" },   // added per G-17
  "repository": { "type": "git", "url": "git+https://github.com/ABCrimson/modern-debug.git", "directory": "packages/modern-debug" },   // G-05
  "engines": { "node": ">=22.13.0" },                           // amended per G-17 (was >=20.19.0)
  "exports": {
    ".":        { "require": { "types": "./dist/compat-cjs.d.cts", "default": "./dist/compat-cjs.js" },   // amended per G-12
                  "default": { "types": "./dist/index.d.ts",  "default": "./dist/index.js" } },
    "./compat": { "types": "./dist/compat.d.ts", "default": "./dist/compat.js" },
    "./otel":   { "types": "./dist/otel.d.ts",   "default": "./dist/otel.js" },
    "./node":   { "types": "./dist/node.d.ts",   "default": "./dist/node.js" }
  },
  "peerDependencies": { "@opentelemetry/api": "^1.9.1" },
  "peerDependenciesMeta": { "@opentelemetry/api": { "optional": true } },
  "files": ["dist"], "license": "MIT"
}
```

Root `package.json` essentials *(added per G-17)*:
```jsonc
{
  "name": "modern-debug-monorepo", "private": true, "type": "module",
  "packageManager": "pnpm@12.17.0",
  "engines": { "node": ">=24.22.2" },
  "scripts": {
    "verify": "turbo run typecheck lint knip test size publint attw",
    "release": "pnpm -C packages/modern-debug build && changeset publish"   // manual use; release.yml publishes through changesets/action/publish
  }
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
Works on Node/Bun/Deno; on workerd requires the `nodejs_compat` flag — documented, and the workers island tests both presence and absence paths. *(amended per G-17: on workerd it needs Node.js compatibility (on by default from compatibility date 2026-08-04; nodejs_compat before that) or the nodejs_als flag alone for modern-debug/node, because the entry imports only `AsyncLocalStorage`. `tests-workers/` tests the default, the opt-out pair `no_nodejs_compat` + `no_nodejs_compat_v2`, and the `nodejs_als`-only path on workerd 1.20261023.1, 2026-10-30.)*

---

## §6 Architecture & Performance Strategy

- **Disabled path is the product.** `createDebug` on a non-matching namespace returns a module-shared frozen noop carrying `{enabled:false}` semantics; calling it is a single megamorphic-safe function call, zero allocation. Gate: ≤1.05× the cost of `debug` 4.4.3's disabled call (mitata, 26.5.0 and 24.18.0). *(amended per G-17: the CI `bench` job measures on 26.13.0 and 24.22.2; bench/RESULTS.md was measured 2026-07-14 on 26.5.0 and 24.18.0 and has not been regenerated since)*
- **Enabled pretty path:** namespace prefix (with ANSI color codes) pre-concatenated at creation/enable time; per-call work = time-diff + one template concat + one sink call. No intermediate arrays, no `util.format`.
- **NDJSON path:** hand-rolled serializer for the fixed envelope keys (`t`,`ns`,`msg`,`sev`,`trace_id`,`span_id`) + `JSON.stringify` only for user fields; strings pre-escaped via charCode scan with a no-escape fast path. Target: ≥0.8× pino 10.3.1 *(amended per G-17: pino 10.4.0)* single-record throughput (honesty note: pino is a transport-optimized 60KB+ system; parity-minus-20% at 1/60th the size is the win — do not chase past it at byte-budget cost).
- **Matcher:** compiled once; `enable()` swaps the compiled pair and flips live `DebugFn` bindings via an internal registry of WeakRef'd fns (falls back to re-check-on-call where WeakRef unavailable — it is available on all five target runtimes; keep the fallback for exotic embedders).
- **Isolate safety:** no per-request module state; matcher is global-config, ALS carries request state (Workers-correct).

---

## §7 Migration Layer

- **Alias recipe (README + docs):** `"overrides": { "debug": "npm:modern-debug@^1" }` (npm) / pnpm `overrides` / bun equivalent — routes the *transitive* 300M-weekly install base through `/compat` via a `debug`-shaped conditional export set on the compat entry. Phase 6 validates the alias against three real dependents in fixtures: `express` 5.2.1, `send`, `socket.io` (dev-only fixture installs; versions resolved at fixture-lock time and recorded). *(amended per G-12: the route is a `require` condition on `"."` that maps to the ESM `dist/compat-cjs.js`; ESM `import debug from 'debug'` under the alias is a documented v1 divergence.)* *(amended per G-17: the install base is ≈939M downloads/week (npm API, week ending 2026-10-29). The pnpm recipe is an `overrides` block in pnpm-workspace.yaml, `debug: npm:modern-debug@^1.0.0`, because pnpm 12 reads overrides from pnpm-workspace.yaml and ignores package.json#pnpm (pnpm 12 changelog). The fixture runs express 5.3.0, send 1.2.1 and socket.io / socket.io-client 4.8.4 as a standalone pnpm root; check.cjs asserts that `debug` resolved from each dependent ends at `dist/compat-cjs.js` and that no `node_modules/.pnpm/debug@*` directory exists.)*
- **`DEBUG` env grammar:** identical (LD-04). `MODERN_DEBUG_FORMAT` is additive, never required.
- **Codemod: not shipped for v1.** The alias covers the dominant path; a source codemod is a tracked post-1.0 item. (Contrast with specs #2/#4/#5 where the codemod *is* the product.)

---

## §8 Testing & Quality Gates

1. **Unit** (vitest 5.0.0-beta.6): matcher grammar table (≥60 cases incl. `*`, `-a:*`, mixed separators), env ladder with every feature-detect branch mocked, format switching, extend/fields inheritance. *(amended per G-17: vitest 5.1.0-beta.1 everywhere. Counts from the 2026-10-30 serial gate: package 342 tests in 20 files, of which matcher.test.ts runs 165 through `it.for`; browser 6 in 2; workers pool 4 in 2; raw miniflare 6 in 2; total 358.)*
2. **Property** (fast-check 4.9.0 *(amended per G-17: 4.10.2)*): (a) matcher — for random pattern/namespace pairs, our matcher decision === `debug` 4.4.3's `enabled()`; (b) NDJSON — every emitted line `JSON.parse`s and round-trips fields.
3. **Golden differential:** fixtures captured from `debug` 4.4.3 (colors per namespace, formatter outputs, diff-timing shape with time normalized) — `/compat` output must byte-match after timestamp normalization. Color-hash test asserts LD-06 verbatim.
4. **Runtime matrix (CI):** unit suite on Node 24.18.0 + 26.5.0 (ubuntu/windows/macos), Bun (setup-bun v2), Deno 2 (setup-deno v2), browser via @vitest/browser 5.0.0-beta.6 + playwright 1.61.1 (chromium), workerd via tests-workers island (vitest 4.1.10 + pool-workers 0.18.2). *(amended per G-17: CI: Node 24.22.2 and 26.13.0 on Ubuntu, Windows and macOS (blocking), Node 27.0.0-alpha.0.0.0 (non-blocking), a Node 22.13.0 floor job, Bun, Deno 2, Cloudflare workerd 1.20261023.1 and Chromium (Playwright). The browser leg is @vitest/browser 5.1.0-beta.1 with Playwright 1.65.0-alpha-2026-10-31; workerd runs through `tests-workers/` on vitest 5.1.0-beta.1 with @cloudflare/vitest-plugin 1.4.11 and raw miniflare 5.20261023.3-beta.)*
5. **Size gates (size-limit 12.1.0, min+brotli):** `.` ≤ **1536 B** (amended per G-10) · `./compat` ≤ **1800 B** · `./otel` ≤ **512 B** · `./node` ≤ **448 B**. CI-enforced from Phase 1 onward. *(amended per G-17: method is size-limit 14.3.0, rolldown, min+brotli, 2026-10-30. `.` is measured as `import { createDebug }` (the §1 pillar cost); ./compat, ./otel and ./node are measured as whole entry files; `modifyRolldownConfig` sets platform node on ./node only. Budgets are unchanged. The G-14 numbers were measured by the esbuild-era size-limit.)*

   | Entry | Budget (B) | G-14, esbuild (was) | 2026-10-30, rolldown | Headroom |
   |---|---|---|---|---|
   | `.` (`import { createDebug }`) | 1536 (G-10) | 1524 | **1460** | 76 |
   | `./compat` | 1800 | 1790 | **1753** | 47 |
   | `./otel` | 512 | 240 | **249** | 263 |
   | `./node` | 448 | 148 | **132** | 316 |

6. **Bench gates (mitata 1.0.34, informational until Phase 5, enforced after):** disabled ≤1.05× debug; enabled-pretty ≥1.5× debug; ndjson ≥0.8× pino.
7. **Coverage:** ≥95% lines on `matcher.ts`/`env.ts`/formatters; ≥90% package-wide (v8 provider). *(measured per G-17, 2026-10-30 serial gate: 93.05 % statements, 90.04 % branches, 98.64 % functions, 92.76 % lines; thresholds pass)*
8. **Publish hygiene:** publint 0.3.21 clean; attw 0.18.4 clean (`--profile esm-only`); knip 6.25.0 zero unused. *(amended per G-17: publint 0.3.25, attw 0.18.5 with `--ignore-rules false-cjs` (G-14), knip 6.44.0)*

`pnpm verify` = `turbo run typecheck lint knip test size publint attw` *(amended per G-14: knip added)* — the loop from §0.4.

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

`.github/workflows/ci.yml` (sketch — exact pins §3.7) *(amended per G-17: sketch redrawn from ci.yml as of 2026-10-30, 16 jobs; each changed line carries its marker)*:
```yaml
permissions: { contents: read }                # amended per G-17
env: { LEFTHOOK: '0' }                         # amended per G-17: installed git hooks exit early, so no runner-side hook re-runs pnpm verify
jobs:
  verify:
    strategy: { matrix: { os: [ubuntu-latest, windows-latest, macos-latest], node: ['24.22.2', '26.13.0', '27.0.0-alpha.0.0.0'] } }   # amended per G-17 (was '24.18.0', '26.5.0')
    continue-on-error: ${{ matrix.node == '27.0.0-alpha.0.0.0' }}   # amended per G-17: the alpha leg is non-blocking (9 legs, 3 non-blocking)
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: pnpm/setup@v3.1.2              # reads packageManager pnpm@12.17.0; installs Node.js and runs the frozen install (amended per G-17: was pnpm/action-setup@v6 + actions/setup-node@v6, pnpm@11.10.0)
        with: { runtime: 'node@${{ matrix.node }}', cache: true, require-lockfile: true }
      - run: pnpm verify && node tests-runtimes/smoke.mjs && pnpm -C packages/modern-debug coverage   # amended per G-17
  floor:  { steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), build, actions/setup-node@v7.1.0 (22.13.0), assert node v22.13.0, smoke.mjs, alias fixture install + test] }   # added per G-17
  bun:    { steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), oven-sh/setup-bun@v2.2.0, build, bun tests-runtimes/smoke.mjs] }   # amended per G-12 (was a bun test-runner shim → vitest) and per G-17 (exact tags, pnpm/setup)
  deno:   { steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), denoland/setup-deno@v2.0.5 (deno-version: v2.x), build, deno run -A tests-runtimes/smoke.mjs] }   # amended per G-12 (was a deno-vitest bridge) and per G-17 (exact tags, pnpm/setup)
  workers:{ steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), build, pnpm -C tests-workers test] }   # amended per G-17 (was setup-node@v6 26.5.0)
  browser:{ steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), playwright install --with-deps chromium, pnpm test:browser] }   # amended per G-17
  bench:  { steps: [checkout@v7.0.1, actions/setup-node@v7.1.0 (24.22.2 → BENCH_EXTRA_NODE), pnpm/setup@v3.1.2 (node@26.13.0, primary), build, node bench/run-benches.mjs, actions/upload-artifact@v7.0.2 (bench-results)] }   # added per G-17
  alias-fixture: { steps: [checkout@v7.0.1, pnpm/setup@v3.1.2 (node@26.13.0), build, pnpm -C fixtures/alias-migration install --frozen-lockfile, test] }   # amended per G-17: no --ignore-workspace
```
`release.yml`: changesets/action@v1 → version PR → on merge `pnpm -r publish --access public --provenance` under GitHub OIDC (`id-token: write`). npm provenance is mandatory from 0.1.0. *(amended per G-17: release.yml runs on push to main with top-level `permissions: {}`, `LEFTHOOK: '0'` and changesets/action v2.1.2's sub-action split.)*
- `verify` (contents: read): the G-05 `repository` guard first, then pnpm/setup, build, `pnpm verify`, the 10⁶-case matcher fuzz, `changesets/action/select-mode@v2.1.2` and, in publish mode, `changesets/action/pack@v2.1.2`.
- `version` (contents and pull-requests write): an `--ignore-scripts` install, then `changesets/action/version@v2.1.2` opens the Version PR with the default github.token. A GitHub App token for CI checks on that PR is optional and not wired.
- `publish` (contents and id-token write): an `--ignore-scripts` install, then `changesets/action/publish@v2.1.2` runs `changeset publish --from-pack-dir` on the tarballs packed from the verified dist. It uses npm trusted publishing (OIDC) only, with `PNPM_CONFIG_PROVENANCE: 'true'` and no `NPM_TOKEN`.
- A root `release` script (`pnpm -C packages/modern-debug build && changeset publish`) is for manual use.
- Publish is parked on the owner. modern-debug is unpublished (registry 404 on 2026-10-30). The first publish is a manual bootstrap by the owner. After it, the owner registers release.yml as an npm trusted publisher with "npm publish" enabled; a config left unused for 2 days expires.

---

## §11 Documentation Site

VitePress 2.0.0-alpha.18 + shiki 4.3.1 *(amended per G-17: VitePress 2.0.0-alpha.21, shiki 4.5.0)*. House design system: OKLCH tokens, dark glassmorphism, Fraunces (display) / Geist (text) / JetBrains Mono (code). Required pages: Why (the debug-is-frozen case, with the §8.6 bench table rendered live), Quickstart, Migration-from-debug (alias recipe + grammar guarantee), Structured Logging, OTel, ALS scoping, Runtime matrix, API reference (generated from d.ts), Divergence notes (anything golden suite normalizes, e.g., timestamp text).

## §12 Definition of Done (1.0.0)
- [ ] All §8 gates enforced and green on the full CI matrix
- [ ] Size: 1536 (G-10) /1800/512/448 B budgets hold at publish commit
- [ ] Golden differential vs debug 4.4.3: 100%
- [ ] Bench RESULTS.md committed with reproduction commands
- [ ] publint + attw + knip clean; provenance on npm; `DECISIONS.md` reconciled with zero open items
- [ ] Docs deployed; alias migration validated against ≥3 real dependents
