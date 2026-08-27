# Contributing to modern-debug

`modern-debug` replaces a package with ~300M weekly downloads. That sets the bar: every
behavioral claim in this repo is backed by a test, a golden fixture, or a measured gate —
never by prose. This guide is how to work inside that constraint.

---

## Table of Contents

- [Authority order](#authority-order)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Repository layout](#repository-layout)
- [The verify gate](#the-verify-gate)
- [Testing](#testing)
- [The hard constraints](#the-hard-constraints)
- [Benchmarks](#benchmarks)
- [Documentation](#documentation)
- [Git workflow](#git-workflow)
- [Release process](#release-process)
- [Troubleshooting](#troubleshooting)

---

## Authority order

This repo is spec-driven. When two sources disagree, the higher one wins:

| Rank | Source | What it governs |
|---|---|---|
| 1 | `01-modern-debug-CLAUDE.md` | The execution spec. Locked Decisions LD-01…LD-18 live in §2. |
| 2 | `DECISIONS.md` | Append-only ledger. Amendments (G-NN) to Locked Decisions, drift adoptions, deferrals. |
| 3 | `CLAUDE.md` | Distilled operating notes for day-to-day work. |
| 4 | Inline comments | Local rationale. |

> [!IMPORTANT]
> `DECISIONS.md` is **append-only**. Never rewrite or delete an entry. A decision that turns
> out wrong is superseded by a *new* entry that says so and references the old one.

Nothing overrides a Locked Decision. If you believe one is wrong, that is a `DECISIONS.md`
amendment discussion, not a code change.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | >= 24.18.0 | Root `engines`. CI runs 24.18.0 and 26.5.0. |
| pnpm | 12.0.0 | Pinned via `packageManager`. Use Corepack. |
| Git | any recent | Lefthook installs hooks on `pnpm install`. |

The published package's own floor is lower — `packages/modern-debug` declares
`node >= 20.19.0`, because that is the oldest runtime the shipped code supports. The higher
root floor is a *development* requirement only.

Optional, only for the runtime-parity jobs: [Bun](https://bun.sh) and
[Deno 2](https://deno.com). CI covers both, so you do not need them locally.

---

## Setup

```sh
git clone https://github.com/ABCrimson/modern-debug.git
cd modern-debug
pnpm install          # also runs `lefthook install` via the prepare script
pnpm -C packages/modern-debug build
pnpm verify           # the full gate — see below
```

`pnpm verify` is the single command that must exit 0 before you push. It is also what the
pre-push hook runs.

---

## Repository layout

The pnpm workspace is `packages/*`, `bench`, `docs` and `tests-workers`.

```
packages/modern-debug/     The only publishable package — 4 subpath entries
  src/
    index.ts               Core: createDebug, enable, disable, enabled, configure
    matcher.ts             DEBUG pattern grammar — linear template walk, no regex
    env.ts                 The enablement ladder (see below)
    format-pretty.ts       TTY output: colors, +Nms diffs
    format-ndjson.ts       One flat record per line, fixed envelope key order
    json.ts                Never-throws serializer
    hooks.ts               Record decorator hook (used by /otel)
    compat.ts              The full `debug` 4.4.3 surface
    compat-cjs.ts          The `require` condition for the alias path
    otel.ts                trace_id/span_id injection — optional peer
    node.ts                AsyncLocalStorage request scoping
  test/                    20 files, 158 tests (Node)
  test-browser/            Chromium suite via vitest browser mode
tests-workers/             workerd island — vitest-pool-workers + raw miniflare
bench/                     mitata suites + the gate harness
fixtures/debug-golden/     Captured `debug` 4.4.3 output — the differential oracle
fixtures/alias-migration/  Real express/send/socket.io dependents behind the alias
docs/                      VitePress site
```

### Entry points

| Entry | Budget (min+brotli) | Contents |
|---|---|---|
| `modern-debug` | 1536 B | Core. Zero dependencies. |
| `modern-debug/compat` | 1800 B | The `debug` 4.4.3 API surface. |
| `modern-debug/otel` | 512 B | OpenTelemetry correlation. Optional peer. |
| `modern-debug/node` | 448 B | `AsyncLocalStorage` scoping. Needs Node built-ins. |

### The enablement ladder

Highest precedence to lowest — worth knowing before you touch `env.ts`:

1. explicit `enable(pattern)`
2. `process.env.DEBUG`
3. `globalThis.DEBUG` — the Workers escape hatch
4. `localStorage.debug` — **browser-scoped**, never consulted where `process.env` exists
5. disabled

---

## The verify gate

```sh
pnpm verify   # turbo run typecheck lint knip test size publint attw
```

| Stage | Command | What it catches |
|---|---|---|
| `typecheck` | `tsc --noEmit` ×2 | Both the full project and `tsconfig.src.json` (the stricter src-only pass) |
| `lint` | `biome check .` | Format + lint. Biome's `recommended` preset, single quotes, semicolons as-needed, width 100. |
| `knip` | `knip` | Unused files, exports and dependencies |
| `test` | `vitest run` | The 158-test Node suite |
| `size` | `size-limit` | The four byte budgets above |
| `publint` | `publint` | Broken `exports` map / packaging mistakes |
| `attw` | `attw --pack . --profile esm-only` | Type resolution across every module mode |

> [!WARNING]
> **Never delete or weaken a gate.** If a gate cannot be met, record the measured number and
> the blocking cause in `DECISIONS.md` and surface it. A green build bought by loosening a
> threshold is the one outcome this repo treats as failure.

---

## Testing

TDD is the rule: no production code without a failing test first.

```sh
pnpm -C packages/modern-debug test              # 158 tests, Node
pnpm -C packages/modern-debug test:browser      # chromium, vitest browser mode
pnpm -C packages/modern-debug coverage          # v8 coverage
pnpm -C tests-workers test                      # workerd: pool-workers + raw miniflare
```

### What each layer proves

| Layer | Location | Proves |
|---|---|---|
| Unit | `packages/modern-debug/test/` | Core behavior, formatting, levels, env ladder |
| Grammar oracle | `test/matcher.test.ts` | An 81-row table, each row asserted against **real** `debug` 4.4.3 *and* against our matcher |
| Property fuzz | `test/matcher.property.test.ts` | 5,000 random pattern/namespace pairs differentially vs. real `debug` |
| Golden differential | `test/compat-golden.test.ts` | `/compat` output byte-matches `fixtures/debug-golden/` |
| Browser | `test-browser/` | The real `localStorage` rung (LD-09), compat console passthrough |
| Workers | `tests-workers/` | workerd with `nodejs_compat` **on and off** |
| Alias integration | `fixtures/alias-migration/` | express 5.2.1, send 1.2.1, socket.io 4.8.3 logging through the override |

The fuzz count is configurable — the release workflow re-runs it at 10⁶ cases:

```sh
MATCHER_FUZZ_RUNS=1000000 pnpm -C packages/modern-debug exec vitest run test/matcher.property.test.ts
```

> [!NOTE]
> `fixtures/alias-migration/` sits **outside** the workspace glob on purpose and installs
> with `--ignore-workspace` (DECISIONS G-12), so `debug` resolves the way it would for a real
> standalone consumer rather than via workspace hoisting. Because a standalone `file:` install
> packs the `files` allowlist (`dist` only), **you must build before installing the fixture.**

### Changing anything `debug`-facing

Parity is defined by fixtures, not by prose (LD-04/LD-06). If you change the matcher, the
color hash, or the printf path:

1. Add the case to the oracle table or the golden fixtures **first**.
2. Confirm it fails.
3. Fix the implementation.
4. If the new behavior *deliberately* differs from `debug` 4.4.3, it must be recorded in
   `DECISIONS.md` **and** listed in [`docs/guide/divergence.md`](./docs/guide/divergence.md).
   An undocumented divergence is a bug.

---

## The hard constraints

These are Locked Decisions. They are not style preferences.

| Constraint | Ref |
|---|---|
| ESM-only, `"type": "module"`, no CJS authoring anywhere | LD-01 |
| Zero runtime dependencies in the core | LD-02 |
| No WASM, and no Rust anywhere in this repo | LD-03 |
| `debug` grammar and color parity defined by golden fixtures | LD-04 / LD-06 |
| All devDependencies **exact-pinned** — no `^`, no `~` | LD-08 |
| The single allowed range: optional peer `@opentelemetry/api ^1.9.1` | LD-08 |
| Logging must never throw — degrade the record, never crash the caller | — |

<details>
<summary>Toolchain version split</summary>

`tests-workers/` stays on the **vitest 4.x** line (4.1.11) because
`@cloudflare/vitest-pool-workers` declares a `^4.1.0` peer (LD-13). Everything else runs
**vitest 5.0.0-rc.2** (amended per G-16). Do not "unify" these — the split is deliberate and
the pool package will not load under 5.x.

Version drift is adopted, not avoided: move to newer versions within the same channel and log
the delta in `DECISIONS.md`.

</details>

---

## Benchmarks

```sh
pnpm -C packages/modern-debug build
node bench/run-benches.mjs                                      # current node
BENCH_EXTRA_NODE=<path-to-node-24> node bench/run-benches.mjs   # + a second runtime
```

Three gates, enforced since 0.7.0 and run as their own CI job:

| Gate | Threshold |
|---|---|
| disabled call | ≤ 1.05× `debug` |
| enabled pretty line | ≥ 1.5× `debug` throughput |
| NDJSON record | ≥ 0.8× `pino` throughput |

Margin policy (G-14): each suite runs `BENCH_RUNS` (default 5) times in its own child
process, and **a gate passes only if the worst run clears it**. Ratios are paired inside a
single process so both sides see the same machine state.

The bench job is deliberately separate from the `verify` matrix so shared-runner timing
variance can never block typecheck/lint/test/size/publint/attw.

> [!NOTE]
> `bench/RESULTS.md` is a generated record. Regenerate it with the commands above rather than
> hand-editing numbers into it.

---

## Documentation

The VitePress site lives in `docs/` and deploys to GitHub Pages on every push to `main`.

```sh
pnpm -C packages/modern-debug build   # REQUIRED FIRST — see below
pnpm -C docs dev
pnpm -C docs build
```

> [!IMPORTANT]
> The docs build **depends on `dist/`**. `docs/api/index.md` includes the real `.d.ts`
> declarations, and `tsdown` emits those into content-hashed chunk files whose names change
> every build. `docs/resolve-dts.mjs` runs before `vitepress build`, locates each entry's
> current chunk, and copies it to a stable path under `.vitepress/cache/api-dts/`. It exits
> nonzero if it cannot find exactly one chunk per entry — a broken API reference fails the
> build instead of shipping silently.

If you add a user-visible behavior, the corresponding guide page under `docs/guide/` is part
of the change, not a follow-up.

---

## Git workflow

Branch from `main`. Conventional Commits:

```
feat(core): add per-namespace level override
fix(compat): match debug's %j output for circular refs
perf(matcher): avoid re-walking the skip list
docs(divergence): record the localStorage rung scoping
chore: bump biome to 2.5.10
```

Hooks (Lefthook, installed by `pnpm install`):

| Hook | Runs |
|---|---|
| pre-commit | `biome check --staged --no-errors-on-unmatched` |
| pre-push | `pnpm verify` — the whole gate |

If a change affects the published package, add a changeset:

```sh
pnpm changeset
```

---

## Release process

Managed by [changesets](https://github.com/changesets/changesets). On every push to `main`,
`release.yml`:

1. **Guards on the `repository` field** in `packages/modern-debug/package.json` — npm
   provenance requires it, and a missing field fails the publish with a registry E422
   (DECISIONS G-05). The guard runs first so no build time is spent before it.
2. Installs, builds, and runs `pnpm verify`.
3. Re-runs the matcher fuzz at **10⁶ cases** (`MATCHER_FUZZ_RUNS=1000000`), so the RC-grade
   gate cannot silently decay into a one-off local claim (G-13).
4. Hands off to `changesets/action`, which either opens a version PR or publishes with
   `pnpm -r publish --access public --provenance`.

The publish command re-runs the build immediately before publishing rather than trusting
`dist/` to survive changesets' own git work — `dist/` is gitignored, so nothing else
guarantees it is intact at that moment.

> [!CAUTION]
> **Never push git tags manually.** Tag pushes can trigger publishing.

---

## Troubleshooting

### `pnpm verify` fails at `size`

You exceeded a byte budget. Run `pnpm -C packages/modern-debug size` to see which entry and
by how much. The budgets are Locked Decisions — the fix is smaller code, not a bigger number.
If it genuinely cannot be met, record the measured value and blocking cause in
`DECISIONS.md`.

### `attw` reports a resolution failure

The `exports` map has four entries and a `require` condition that ships a separate
`.d.cts`. Any change to `exports`, `tsdown.config.ts` entries, or the `compat-cjs` files
needs `pnpm -C packages/modern-debug attw` re-run locally — this is the check that catches a
broken alias for `require('debug')` consumers.

### The docs build fails with `[resolve-dts] ... does not exist`

Build the package first:

```sh
pnpm -C packages/modern-debug build
```

### `knip` reports an unused export

`knip.json` scopes each workspace explicitly. A genuinely-public export that knip cannot see
being used belongs in that workspace's config — but check first that it is actually reachable
from a real entry point rather than adding an ignore.

### Tests pass locally but the workers job fails

The workerd island is a different runtime with a different vitest major. Run it directly:

```sh
pnpm -C packages/modern-debug build
pnpm -C tests-workers test
```

Both `nodejs_compat` on and off are exercised. `modern-debug/node` is expected to fail
loudly without the flag — the core must keep working.

### An `ExperimentalWarning` about `localStorage` appears in test output

Expected on Node ≥26 when the runner enables the storage flag. The `localStorage` rung is
browser-scoped and is never consulted where `process.env` exists (see
[divergence notes](./docs/guide/divergence.md)); `test/no-warning.test.ts` guards the
behavior that matters.

---

## Questions

Open an [issue](https://github.com/ABCrimson/modern-debug/issues) for bugs and feature
requests. For anything touching a Locked Decision, say which one — that is the fastest path
to a useful answer.
