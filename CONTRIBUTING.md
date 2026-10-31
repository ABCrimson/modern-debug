# Contributing to modern-debug

`modern-debug` replaces `debug`, one of the most-downloaded packages on npm (≈939M downloads/week,
npm API, week ending 2026-10-29). That sets the bar: every behavioral claim in this repo is backed
by a test, a golden fixture, or a measured gate — never by prose. This guide is how to work inside
that constraint.

---

## Table of contents

- [Authority order](#authority-order)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Repository layout](#repository-layout)
- [The verify gate](#the-verify-gate)
- [Testing](#testing)
- [The hard constraints](#the-hard-constraints)
- [Benchmarks](#benchmarks)
- [Documentation](#documentation)
- [Formatting with Biome](#formatting-with-biome)
- [Git workflow](#git-workflow)
- [Release process](#release-process)
- [Troubleshooting](#troubleshooting)
- [Questions](#questions)

---

## Authority order

This repo is spec-driven. When two sources disagree, the higher one wins:

| Rank | Source                      | What it governs                                                                        |
| ---- | --------------------------- | -------------------------------------------------------------------------------------- |
| 1    | `01-modern-debug-CLAUDE.md` | The execution spec. Locked Decisions LD-01…LD-18 live in §2.                           |
| 2    | `DECISIONS.md`              | Append-only ledger. Amendments (G-NN) to Locked Decisions, drift adoptions, deferrals. |
| 3    | `AGENTS.md`                 | Distilled operating notes for day-to-day work (`CLAUDE.md` imports it).                |
| 4    | Inline comments             | Local rationale.                                                                       |

> [!IMPORTANT]
> `DECISIONS.md` is **append-only**. Never rewrite or delete an entry. A decision that turns
> out wrong is superseded by a _new_ entry that says so and references the old one.

Nothing overrides a Locked Decision. If you believe one is wrong, that is a `DECISIONS.md`
amendment discussion, not a code change.

---

## Prerequisites

| Tool    | Version    | Notes                                                                                                 |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Node.js | >= 24.22.2 | Root `engines` (LD-01, amended per G-17).                                                             |
| pnpm    | 12.17.0    | Pinned via `packageManager`. Install any pnpm 12 (Node 26 bundles none); it self-switches to the pin. |
| Git     | any recent | Lefthook installs hooks on `pnpm install`.                                                            |

You need Node ≥ 24.22.2 and pnpm 12.17.0 (packageManager pin; pnpm self-switches) to work on the
repo; consumers need Node ≥ 22.13.0. The published package declares `node >=22.13.0`, the first 22.x
with `require(esm)` unflagged and warning-free (DECISIONS G-17). The higher root floor is a
_development_ requirement only.

CI (`.github/workflows/ci.yml`, 2026-10-30): Node 24.22.2 and 26.13.0 on Ubuntu, Windows and
macOS (blocking), Node 27.0.0-alpha.0.0.0 (non-blocking), a Node 22.13.0 floor job, Bun, Deno 2,
Cloudflare workerd 1.20261023.1 and Chromium (Playwright).

| Job             | What it runs                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `verify`        | 3 OS × 3 Node = 9 legs (the 27.0.0-alpha.0.0.0 legs are `continue-on-error`): `pnpm verify`, the runtime smoke, coverage |
| `floor`         | Builds on 26.13.0, then Node 22.13.0 runs the smoke and the alias fixture                                                |
| `bun`, `deno`   | `tests-runtimes/smoke.mjs` on each runtime                                                                               |
| `workers`       | `pnpm -C tests-workers test`                                                                                             |
| `browser`       | `pnpm -C packages/modern-debug test:browser` (Playwright Chromium)                                                       |
| `bench`         | 26.13.0 primary plus 24.22.2 through `BENCH_EXTRA_NODE`; uploads `bench/RESULTS.md` as `bench-results`                   |
| `alias-fixture` | Frozen install of `fixtures/alias-migration/`, then `check.cjs`                                                          |

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

```text
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
  test/                    20 files, 342 tests (Node)
  test-browser/            2 files, 6 tests (Chromium via vitest browser mode)
tests-workers/             workerd: @cloudflare/vitest-plugin pool + raw miniflare
bench/                     mitata suites + the gate harness
fixtures/debug-golden/     Captured `debug` 4.4.3 output and the differential cases
fixtures/alias-migration/  Standalone pnpm root: real express/send/socket.io dependents behind the override
docs/                      VitePress site
```

### Entry points

Sizes: size-limit 14.3.0, rolldown, min+brotli, 2026-10-30. `.` is measured as
`import { createDebug }`; the other three entries are measured as whole files.

| Entry                 | Budget | Measured | Contents                                           |
| --------------------- | ------ | -------- | -------------------------------------------------- |
| `modern-debug`        | 1536 B | 1460 B   | Core. Zero dependencies.                           |
| `modern-debug/compat` | 1800 B | 1753 B   | The `debug` 4.4.3 API surface.                     |
| `modern-debug/otel`   | 512 B  | 249 B    | OpenTelemetry correlation. Optional peer.          |
| `modern-debug/node`   | 448 B  | 132 B    | `AsyncLocalStorage` scoping. Needs Node built-ins. |

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

| Stage       | Command                                                     | What it catches                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck` | `tsc --noEmit` ×2                                           | Both the full project and `tsconfig.src.json` (the stricter src-only pass)                                                                                                                                          |
| `lint`      | `biome check .`                                             | Format + lint. Biome 2.6.4, `recommended` preset; see [Formatting with Biome](#formatting-with-biome).                                                                                                              |
| `knip`      | `knip`                                                      | Unused files, exports and dependencies (knip 6.44.0; it honours `.gitignore`)                                                                                                                                       |
| `test`      | `vitest run --project node`                                 | The package suite: 342 tests in 20 files (vitest 5.1.0-beta.1, 2026-10-30)                                                                                                                                          |
| `size`      | `size-limit`                                                | The four byte budgets above, bundled by rolldown (size-limit 14.3.0; method amended per G-17)                                                                                                                       |
| `publint`   | `publint --pack npm --strict`                               | Broken `exports` map / packaging mistakes                                                                                                                                                                           |
| `attw`      | `attw --pack . --profile esm-only --ignore-rules false-cjs` | Type resolution across every module mode. `false-cjs` is ignored because attw cannot model Node's `module.exports` unwrap; `alias-require.test.ts` and `alias-types.test.ts` gate that failure class instead (G-14) |

> [!WARNING]
> **Never delete or weaken a gate.** If a gate cannot be met, record the measured number and
> the blocking cause in `DECISIONS.md` and surface it. A green build bought by loosening a
> threshold is the one outcome this repo treats as failure.

---

## Testing

TDD is the rule: no production code without a failing test first.

```sh
pnpm -C packages/modern-debug test                               # Node suite
pnpm -C packages/modern-debug exec playwright install chromium   # once, for the browser suite
pnpm -C packages/modern-debug test:browser                       # Chromium, vitest browser mode
pnpm -C packages/modern-debug coverage                           # v8 coverage
pnpm -C tests-workers test                                       # workerd: plugin pool + raw miniflare
```

Test counts (vitest 5.1.0-beta.1, serial gate, 2026-10-30):

| Suite                         | Files | Tests   |
| ----------------------------- | ----- | ------- |
| `packages/modern-debug`       | 20    | 342     |
| Browser (`test-browser/`)     | 2     | 6       |
| `tests-workers` plugin pool   | 2     | 4       |
| `tests-workers` raw miniflare | 2     | 6       |
| **Total**                     |       | **358** |

### What each layer proves

| Layer               | Location                        | Proves                                                                                                                                                                                        |
| ------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                | `packages/modern-debug/test/`   | Core behavior, formatting, levels, env ladder                                                                                                                                                 |
| Grammar oracle      | `test/matcher.test.ts`          | An 81-row table; `it.for` runs each row as its own test, once against **real** `debug` 4.4.3 and once against our matcher (162 table tests; 165 in the file, vitest 5.1.0-beta.1, 2026-10-30) |
| Property fuzz       | `test/matcher.property.test.ts` | 5,000 random pattern/namespace pairs differentially vs. real `debug`                                                                                                                          |
| Golden differential | `test/compat-golden.test.ts`    | `/compat` output byte-matches **live** `debug` 4.4.3 over `fixtures/debug-golden/format-cases.ts`                                                                                             |
| Color hash          | `test/format-pretty.test.ts`    | Namespace colors match `fixtures/debug-golden/colors.json` (LD-06)                                                                                                                            |
| Browser             | `test-browser/`                 | The real `localStorage` rung (LD-09); `/compat` on the non-Node path (no `node:util`): log override and `localStorage` persistence                                                            |
| Workers             | `tests-workers/`                | workerd with Node.js compatibility on (the default from compatibility date 2026-08-04), opted out (`no_nodejs_compat` + `no_nodejs_compat_v2`), and `nodejs_als` alone                        |
| Alias integration   | `fixtures/alias-migration/`     | express 5.3.0, send 1.2.1, socket.io 4.8.4 and socket.io-client 4.8.4 logging through the override                                                                                            |

The fuzz count is configurable — the release workflow re-runs it at 10⁶ cases:

```sh
MATCHER_FUZZ_RUNS=1000000 pnpm -C packages/modern-debug exec vitest run test/matcher.property.test.ts
```

### Golden fixtures

`fixtures/debug-golden/` holds the oracle inputs (spec §8.3):

- `colors.json` (`node capture-colors.mjs`) gates LD-06 in `test/format-pretty.test.ts`.
- `format-cases.ts` feeds `test/compat-golden.test.ts`. That test byte-compares `/compat`
  against **live** `debug` 4.4.3 in-process (`DEBUG_HIDE_DATE`, a fresh instance per case, so the
  diff is always `+0ms`).
- `format-golden.json` (`node capture-format.ts`) is a non-gating review snapshot (DECISIONS G-11).

### The alias fixture

`fixtures/alias-migration/` is a **standalone pnpm root** (DECISIONS G-12, amended per G-17):

- It sits outside the workspace glob. Its own `pnpm-workspace.yaml` declares `packages: []` and
  the override `debug: file:../../packages/modern-debug`. pnpm 12 reads overrides only from
  `pnpm-workspace.yaml` and ignores `package.json#pnpm`.
- It has its own lockfile. After changing the fixture's dependencies, regenerate it with a plain
  `pnpm -C fixtures/alias-migration install`.
- A standalone `file:` install packs the `files` allowlist (`dist` only), so **build before you
  install the fixture.**
- `check.cjs` resolves `debug` from inside each dependent (express, send, socket.io,
  socket.io-client, router, body-parser, finalhandler, engine.io, socket.io-adapter). It asserts
  every realpath ends with `dist/compat-cjs.js` and that no `node_modules/.pnpm/debug@*`
  directory exists.

```sh
pnpm -C packages/modern-debug build
pnpm -C fixtures/alias-migration install --frozen-lockfile
pnpm -C fixtures/alias-migration test
```

### Changing anything `debug`-facing

Parity is defined by fixtures, not by prose (LD-04/LD-06). If you change the matcher, the
color hash, or the printf path:

1. Add the case to the oracle table or the golden fixtures **first**.
2. Confirm it fails.
3. Fix the implementation.
4. If the new behavior _deliberately_ differs from `debug` 4.4.3, it must be recorded in
   `DECISIONS.md` **and** listed in [`docs/guide/divergence.md`](./docs/guide/divergence.md).
   An undocumented divergence is a bug.

---

## The hard constraints

These are Locked Decisions. They are not style preferences.

| Constraint                                                            | Ref                      |
| --------------------------------------------------------------------- | ------------------------ |
| ESM-only, `"type": "module"`, no CJS authoring anywhere               | LD-01                    |
| Engines: published `node >=22.13.0`, repo root `node >=24.22.2`       | LD-01 (amended per G-17) |
| Zero runtime dependencies in the core                                 | LD-02                    |
| No WASM, and no Rust anywhere in this repo                            | LD-03                    |
| `debug` grammar and color parity defined by golden fixtures           | LD-04 / LD-06            |
| All devDependencies **exact-pinned** — no `^`, no `~`                 | LD-08                    |
| The single allowed range: optional peer `@opentelemetry/api ^1.9.1`   | LD-08                    |
| Logging must never throw — degrade the record, never crash the caller | —                        |

### Toolchain

One vitest line runs everywhere: 5.1.0-beta.1 (LD-13, amended per G-17).

- `tests-workers/` runs on it through `@cloudflare/vitest-plugin` 1.4.11. The plugin's vitest
  peer range is `^4.1.0 || ^5.0.0`, which excludes the prerelease.
- `pnpm-workspace.yaml` carries a `peerDependencyRules.allowedVersions` rule,
  `'@cloudflare/vitest-plugin>vitest': '5.1.0-beta.1'`, so `pnpm install` reports no peer issue.
- The plugin's own runtime check still prints `[vpw:warn]` on every run. That warning is
  expected; the run passes.
- Every workerd boot uses one compatibility date: `COMPATIBILITY_DATE` in
  `tests-workers/workerd-compat.ts` (`2026-10-23`, the bundled workerd 1.20261023.1's own date).
  Raise it only together with the miniflare pin.

Version drift is adopted, not avoided: take the newest release on any channel and log the delta
in `DECISIONS.md` (G-17). Oracle pins are exempt: `debug` 4.4.3 and
`typescript-legacy` = `npm:typescript@5.8.3`.

---

## Benchmarks

```sh
pnpm -C packages/modern-debug build
node bench/run-benches.mjs                                      # current node
BENCH_EXTRA_NODE=<path-to-node-24> node bench/run-benches.mjs   # + a second runtime
```

Three gates (spec §8.6), run as their own CI job:

| Gate                | Threshold                 |
| ------------------- | ------------------------- |
| disabled call       | ≤ 1.05× `debug`           |
| enabled pretty line | ≥ 1.5× `debug` throughput |
| NDJSON record       | ≥ 0.8× `pino` throughput  |

Margin policy (G-14): each suite runs `BENCH_RUNS` (default 5) times in its own child
process, and **a gate passes only if the worst run clears it**. Ratios are paired inside a
single process so both sides see the same machine state.

The bench job is deliberately separate from the `verify` matrix so shared-runner timing
variance can never block typecheck/lint/test/size/publint/attw. It runs on Node 26.13.0 and
24.22.2 and uploads `bench/RESULTS.md` as the `bench-results` artifact.

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
> The docs **depend on `dist/`**. `docs/api/index.md` includes the real `.d.ts`
> declarations, and `tsdown` emits those into content-hashed chunk files whose names change
> every build. `docs/resolve-dts.mjs` runs before `vitepress dev` (the `predev` script) and
> before `vitepress build` (the `build` script). It locates each entry's current chunk and
> copies it to a stable path under `.vitepress/cache/api-dts/`. It exits nonzero if it cannot
> find exactly one chunk per entry — a broken API reference fails the build instead of shipping
> silently (G-14).

If you add a user-visible behavior, the corresponding guide page under `docs/guide/` is part
of the change, not a follow-up.

---

## Formatting with Biome

Biome 2.6.4 (`biome.json`) formats and lints the repo; `biome check .` is the `lint` stage.

- It formats TypeScript, JavaScript, JSON, CSS, Markdown and YAML. `pnpm-lock.yaml` is excluded, and
  the VCS ignore file keeps `dist`, `.turbo` and `coverage` out.
- JavaScript and TypeScript: single quotes, semicolons as needed, width 100.
- YAML: single quotes (`yaml.formatter.quoteStyle: 'single'`), the style pnpm writes into
  `pnpm-workspace.yaml` and the style the workflows use.
- Markdown: frontmatter parsing is on (`markdown.parser.frontmatter: true`), so VitePress pages
  keep their frontmatter.
- The formatter is off for three files (G-17):

| File                        | Why it is not formatted                                              |
| --------------------------- | -------------------------------------------------------------------- |
| `DECISIONS.md`              | Append-only ledger; a formatter pass would rewrite past entries      |
| `01-modern-debug-CLAUDE.md` | The spec; it changes only at amended sites                           |
| `bench/RESULTS.md`          | Generated by `bench/run-benches.mjs`; regenerated, never reformatted |

To fix formatting in the files you touched:

```sh
pnpm exec biome format --write <files>
pnpm exec biome check <files>
```

---

## Git workflow

Branch from `main`. Conventional Commits:

```text
feat(core): add per-namespace level override
fix(compat): match debug's %j output for circular refs
perf(matcher): avoid re-walking the skip list
docs(divergence): record the localStorage rung scoping
chore: bump biome to 2.6.4
```

Hooks (Lefthook, installed by `pnpm install`):

| Hook       | Runs                                                      |
| ---------- | --------------------------------------------------------- |
| pre-commit | `pnpm exec biome check --staged --no-errors-on-unmatched` |
| pre-push   | `pnpm verify` — the whole gate                            |

CI and release workflows set `LEFTHOOK: '0'`, so no hook runs on a runner (G-17).

If a change affects the published package, add a changeset:

```sh
pnpm changeset
```

---

## Release process

Managed by [changesets](https://github.com/changesets/changesets) through the
`changesets/action` v2.1.2 sub-actions. Only pushes to `main` trigger `release.yml`. It has
three jobs:

1. **`verify`** (`contents: read`):
   - Guards on the `repository` field in `packages/modern-debug/package.json`. npm provenance
     requires it, and a missing field fails the publish with a registry E422 (DECISIONS G-05).
     The guard runs first so no build time is spent before it.
   - Installs, builds, and runs `pnpm verify`.
   - Re-runs the matcher fuzz at **10⁶ cases** (`MATCHER_FUZZ_RUNS=1000000`), so the RC-grade
     gate cannot silently decay into a one-off local claim (G-13).
   - `select-mode` picks `version` when changesets are pending, `publish` when the versions on
     `main` are not on npm yet, and `none` otherwise. In publish mode, `pack` packs the tarballs
     from the verified `dist/`.
2. **`version`** (`contents` and `pull-requests` write): installs with `--ignore-scripts`, then
   opens or updates the "Version Packages" PR with the default `github.token`. GitHub starts no
   CI run for a push made with that token, so the version PR gets CI checks only when a GitHub
   App token is passed as `github-token:`.
3. **`publish`** (`contents` and `id-token` write): installs with `--ignore-scripts`, then runs
   `changeset publish --from-pack-dir` on the packed tarballs. It ships the verified `dist/` and
   runs no build. Publishing is npm trusted publishing (OIDC) only; there is no `NPM_TOKEN`.
   `PNPM_CONFIG_PROVENANCE: 'true'` makes provenance explicit.

Publish is parked on the owner. modern-debug is not on npm yet (checked 2026-10-30). The first
publish is a manual bootstrap; the root `release` script
(`pnpm -C packages/modern-debug build && changeset publish`) exists for manual use. After it,
the owner registers `release.yml` as an npm trusted publisher with "npm publish" enabled. Do not
merge the Version Packages PR before that trusted publisher exists: `publish` authenticates only
through OIDC (`release.yml`), so it would fail. The owner actions are tracked in DECISIONS G-17
(17.11). The GitHub App token for version-PR CI checks is optional.

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

workerd is a different runtime. Run its tests directly:

```sh
pnpm -C packages/modern-debug build
pnpm -C tests-workers test
```

Node.js compatibility on, opted out, and `nodejs_als` alone are all exercised.
`modern-debug/node` is expected to fail loudly without Node.js compatibility and without
`nodejs_als` — the core must keep working.

### An `ExperimentalWarning` about `localStorage` appears in test output

Expected on Node ≥ 26 when a test touches `globalThis.localStorage` (for example through
`vi.stubGlobal('localStorage', …)` in `test/env.test.ts`): Node emits an `ExperimentalWarning`
on bare `localStorage` access (`src/env.ts`). The `localStorage` rung is
browser-scoped and is never consulted where `process.env` exists (see
[divergence notes](./docs/guide/divergence.md)); `test/no-warning.test.ts` guards the
behavior that matters.

---

## Questions

Open an [issue](https://github.com/ABCrimson/modern-debug/issues) for bugs and feature
requests. For anything touching a Locked Decision, say which one — that is the fastest path
to a useful answer.
