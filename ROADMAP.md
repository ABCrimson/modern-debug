# modern-debug roadmap — 1.0.0 completion and 1.1.0 → 1.10.0

> **Status:** draft 2026-10-31, pending the owner's read; each release opens with its own plan in `docs/plans/` · **Authority:** `01-modern-debug-CLAUDE.md` (spec 1.1.0) → `DECISIONS.md` (G-18 current) → this file · **Numbers:** measured 2026-10-30/31 (size-limit 14.3.0, rolldown, min+brotli) · **Oracle:** debug 4.4.3 golden fixtures (LD-04/06)

This file plans work. It authorizes no publish, no push and no Locked Decision change. Every item that needs a Locked Decision amended says so and names the owner as the decider.

Source keys used below: **R1** to **R7** are the sections of `.claude/run/2026-10-30/research.md` (R1 JS/TS loggers, R2 npm debug internals, R3 dep deltas, R4 toolchain deltas, R5 CI/publish/Node, R6 1.x roadmap tech, R7 discoverability). **M** is `.claude/run/2026-10-30/measured.json`. **L** marks a page fetched live on 2026-10-31 for this file. **17.x** is a subsection of the G-17 ledger entry in `DECISIONS.md`.

## 1 · Completing 1.0.0

The first release is 1.0.0. The package is at 0.0.1 in the tree, and the staged changeset `.changeset/modern-debug-1.0.0.md` is a `major` bump that freezes the 1.0.0 surface under semver. `npm view modern-debug` still returned 404 on 2026-10-31.

### 1.1 Done (local, measured 2026-10-30)

| Area          | State                                                                                                                                  | Evidence                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Gates         | `pnpm verify` 10/10 green since publint packs with npm in strict mode (G-18.7); before that, publint was red on this host only (17.10) | M `gate.verify`, 17.10, 18.7 |
| attw          | esm-only profile, `false-cjs` ignored: node16 ESM and bundler green on all 4 entries                                                   | M `gate.attw`                |
| Tests         | 358: package 342 in 20 files, browser 6 in 2, workers pool 4 in 2, raw miniflare 6 in 2                                                | M `tests`                    |
| Coverage      | 93.05 % statements, 90.04 % branches, 98.64 % functions, 92.76 % lines; §8.7 thresholds pass                                           | M `tests.coverage`           |
| Sizes         | `.` 1460/1536 B, `./compat` 1753/1800, `./otel` 249/512, `./node` 132/448                                                              | M `sizes.final`              |
| Fuzz          | 10⁶-case matcher fuzz runs in release.yml `verify`                                                                                     | release.yml, 17.7            |
| Runtimes      | smokes green on Node 26.13.0 and Bun 1.4.4; Deno not installed here, the CI `deno` job covers it                                       | M `gate.smokes`              |
| Alias fixture | frozen install and check.cjs green (express 5.3.0, send 1.2.1, socket.io 4.8.4)                                                        | M `gate.fixture`             |
| Docs and spec | docs site rebuilt (17.8); spec header at 1.1.0 (17.12); Biome clean                                                                    | 17.8, 17.12, M `gate.biome`  |

### 1.2 This run (automated)

This run, under the owner's run order (not this file):

1. Commit and push the modernization tree, including every untracked file: the four 17.7 names (the fixture's `pnpm-workspace.yaml`, `test/json.test.ts`, `tests-workers/workerd-compat.ts`, `docs/public/`), plus `AGENTS.md` (G-18.3), `docs/guide/comparison.md` and `ROADMAP.md`.
2. CI (16 jobs), Docs and Release go green on main. That closes 17.1 and proves the open re-arms: the `floor` job on Node 22.13.0 (LD-01 amendment, 17.4), publint on Linux (17.10) and the knip `.temp/` fix (17.11).
3. Release runs in version mode, because a changeset is pending. Its `version` job refreshes PR #1 "Version Packages" (`changeset-release/main`, open on 2026-10-31 per `gh api`) with the 1.0.0 changeset. Pushes made with the default token start no CI on that PR (R5, 17.1).

A red job here stops the runbook. The job name and the log line go into a new ledger entry.

### 1.3 Owner runbook, in order

Commands are as of the npm docs read live on 2026-10-31 (L): staged-publishing, trusted-publishers and `npm trust`. Use Node 26.13.0 (it bundles npm 11.20.0, R5; this host's npm is 12.2.1). Staged publishing and `npm trust` need npm ≥ 11.15.0 (both pages) and Node ≥ 22.14.0 (staged-publishing, trusted-publishers), and both need 2FA on the account (L).

| Step | Action                                                    | When                        |
| ---- | --------------------------------------------------------- | --------------------------- |
| 1    | Bootstrap the name on npm                                 | any time after 1.2 is green |
| 2    | Optional: GitHub App token as `github-token`              | before step 3               |
| 3    | Create the trusted publisher with **npm publish** allowed | last, right before step 4   |
| 4    | Merge PR #1                                               | within 2 days of step 3     |
| 5    | Verify the release                                        | after step 4                |
| 6    | Re-run the bench                                          | when convenient             |

**Step 1, bootstrap.** `npm trust` refuses a package that does not exist: "The package you're configuring must already exist on the npm registry." (L, npm-trust). The staged-publishing page supports a never-published name: npm then "publishes a placeholder version of the package with the version `0.0.0-stage`", which is public, and keeps the staged contents hidden until a maintainer approves with 2FA (L). Default path, staged:

```sh
npm --version   # 12.2.1 here (npm latest, 2026-10-31); at least 11.15.0
npm login                            # the account that will own modern-debug, 2FA on
pnpm -C packages/modern-debug build
cd packages/modern-debug
npm stage publish                    # creates the name and the public 0.0.0-stage placeholder
npm stage list modern-debug          # note the stage id; default: do not approve it
```

The staged version is the tree's 0.0.1. Leaving it unapproved keeps 0.0.1 off the registry; the public 0.0.0-stage placeholder stays in the version history. The alternative is a manual `npm publish --access public` from `packages/modern-debug` after the same build. It publishes 0.0.1 for real, and 0.0.1 then stays in the version history. The page lists no reject command for a pending stage (L), and it does not say how a pending stage interacts with a later OIDC publish (open question, §9).

**Step 2, optional App token.** Create a GitHub App with contents and pull-requests write, install it on the repo, and store its id and private key as repo secrets. A follow-up change adds `actions/create-github-app-token@v3.3.0` (newest, `gh api` 2026-10-31) before `changesets/action/version@v2.1.2` and passes its token as `github-token:` (17.11). PR #1 then gets real CI runs instead of the phantom 0-job runs 17.1 recorded.

**Step 3, trusted publisher.** The release.yml `publish` job has `id-token: write` and no `environment:`, so leave the environment empty. Configs created after 2026-09-03 allow only `npm stage publish` by default, so turn on npm publish explicitly. A new config must complete its first publish within 2 days or it expires (L, trusted-publishers; R5).

```sh
npm trust github modern-debug --file release.yml --repo ABCrimson/modern-debug --allow-publish
npm trust list modern-debug          # one config per package (L, npm-trust)
```

The web form is equivalent: package Settings, Trusted publishing, GitHub Actions, then organization or user `ABCrimson`, repository `modern-debug`, workflow filename `release.yml`. After the first OIDC publish, the trusted-publishers page recommends "Require two-factor authentication and disallow tokens" under Publishing access (L). That is the owner's call.

**Step 4, merge.** Merge PR #1 (`gh pr merge 1 --merge`, or the method the repo uses). The push to main runs release.yml in publish mode: `verify` packs the verified dist, and `publish` runs `changeset publish --from-pack-dir` over OIDC with provenance. changesets/action then pushes the tag and creates the GitHub release from the CHANGELOG.md entry (R5 read its `src/run.ts`).

**Step 5, verify.** The provenance panel on the npmjs.com package page shows the attestation. npm generates it automatically under trusted publishing for a public repo and package (L; R5).

```sh
npm view modern-debug version        # expect 1.0.0
npm view modern-debug dist-tags      # expect latest: 1.0.0
gh release list --limit 3            # the 1.0.0 release, body from CHANGELOG.md
```

If the publish job logs "Skipped OIDC" or no attestation appears, the pnpm 12 OIDC path is the suspect: R5 found it undocumented. The fallback is `npm stage publish` of the packed tarball plus the owner's 2FA approval.

**Step 6, bench.** bench/RESULTS.md is from 2026-07-14 on Node 26.5.0 and 24.18.0, and the docs cite those numbers with that date until it changes (M `bench`). Re-run locally, or replace RESULTS.md with the CI `bench-results` artifact:

```sh
pnpm -C packages/modern-debug build
BENCH_EXTRA_NODE=<path to node 24.22.2> node bench/run-benches.mjs
```

### 1.4 Definition of Done crosswalk (spec §12)

| §12 item                                              | State                     | Evidence or remaining step                                                                                                               |
| ----------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| All §8 gates green on the full CI matrix              | this run                  | local 10/10 (18.7); CI run 41190331061 16/16 green (18.9)                                                                                |
| Size budgets hold at the publish commit               | done locally; CI this run | 1460/1753/249/132 B (M `sizes.final`)                                                                                                    |
| Golden differential vs debug 4.4.3: 100 %             | done                      | compat golden suite inside the 342 package tests (17.8)                                                                                  |
| Bench RESULTS.md committed with reproduction commands | done, dated               | 2026-07-14 file with a Reproduce block; regeneration is owner step 6                                                                     |
| publint + attw + knip clean                           | this run                  | attw and knip green locally; publint proven on CI (17.10 re-arm)                                                                         |
| Provenance on npm                                     | owner                     | steps 1 to 5                                                                                                                             |
| DECISIONS.md reconciled with zero open items          | owner                     | 17.11 holds 11 open rows and G-18.4 one more. A ledger entry at 1.0.0 closes each row or re-homes it to a release in §6 (owner decision) |
| Docs deployed                                         | this run                  | docs.yml on the push                                                                                                                     |
| Alias migration validated against ≥ 3 real dependents | done locally; CI this run | express, send, socket.io (17.7)                                                                                                          |

## 2 · Intent and principles

modern-debug 1.x grows by entries, not by core bytes. The core keeps the two things that made `debug` win, the namespace grammar and a near-free disabled path, and the four 1.0.0 entries keep their contracts. Each minor adds one user-visible capability, hardens the supply chain one step, and closes named debt. Demand comes from the open debug issue titles and from what the peer loggers ship (R1, R2); placement comes from measured bytes.

**Size placement.** The core stays at its budget. New capability lands in subpath entries. Where a feature lives is decided by measured bytes, as LD-16 decided levels in G-09. A new entry gets its own budget from a real `size-limit` build at plan time, recorded in a ledger entry. Each new entry also amends LD-01, whose exports map names exactly four entries: that needs a G-NN entry and the owner's decision. LD-02 (zero runtime dependencies) extends to every new entry.

**Three lanes per minor.**

| Lane      | Contents                                     | Rule                                                   |
| --------- | -------------------------------------------- | ------------------------------------------------------ |
| Feature   | additive public API or a new entry           | semver-minor: nothing removed, nothing changes meaning |
| Hardening | supply chain, CI, release plumbing           | no gate deleted or widened                             |
| Debt      | named 17.11 rows and research open questions | each closure cites its row                             |

**Honesty rule.** A gate is never deleted or widened silently. A red gate is recorded with the measured number and its cause in a ledger entry, and the owner decides.

**Plans.** Each release opens with a dated plan, `docs/plans/YYYY-MM-DD-<ver>-plan.md`, in the house TDD format: failing test first, then code, then the gate. `docs/` is the VitePress srcDir, so the first plan (1.1.0) also adds `srcExclude: ['plans/**']` to `docs/.vitepress/config.ts`.

**No dates.** Pins move weekly under the peak-modern law, and each plan opens with a freshness sweep. Releases have an order and a gate. §7 gives one guessed window per release, marked as the orchestrator's guess; none is a promise.

**Standard gate.** Every release gate starts with this block, run on this host through `bash ~/.claude/bin/pruned-path.sh`, then adds its own lines:

```sh
pnpm verify                                  # typecheck lint knip test size publint attw
pnpm -C packages/modern-debug coverage
pnpm -C packages/modern-debug test:browser
pnpm -C tests-workers test
node tests-runtimes/smoke.mjs
pnpm -C fixtures/alias-migration install --frozen-lockfile
pnpm -C fixtures/alias-migration test
```

CI then runs all 16 jobs on main. A release lands only on the owner's explicit word (§10).

## 3 · Goals, non-goals, anti-goals

| Kind      | Item                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Goal      | Answer the open debug demand list: structured output, console.group, STDOUT, Workers, Deno, bundler-inlined env (R1, R2; titles only, grade B) |
| Goal      | First-class observability: diagnostics_channel, OTel Logs, Workers Logs fields                                                                 |
| Goal      | A migration path past the alias: compat completeness, more real dependents, codemods                                                           |
| Goal      | A supply chain that scores well on OpenSSF Scorecard checks (R5)                                                                               |
| Goal      | A written 2.0.0 engines decision before Node 22 reaches EOL on 2027-04-30 (R5)                                                                 |
| Non-goal  | A log shipper or router. Sinks stay `(line: string) => void`; vendors plug in through a sink (§8)                                              |
| Non-goal  | Log rotation. `fileSink` (1.9.0) appends; rotation stays the consumer's tool                                                                   |
| Non-goal  | A new parity oracle. debug 4.4.3 stays the oracle (§8)                                                                                         |
| Anti-goal | Any core byte spent on a feature an entry can carry                                                                                            |
| Anti-goal | A runtime dependency, a CJS artifact, WASM or Rust (LD-02, LD-01, LD-03)                                                                       |
| Anti-goal | A widened gate presented as a pass                                                                                                             |

Three §1 Non-Goals of the spec collide with planned work: "No log rotation, no file targets, no redaction engine" (1.7.0 `./redact`, 1.9.0 `fileSink`) and "One sink function" (the 1.3.0 and 1.8.0 output stages). Each release amends spec §1 through a G-NN entry first, and the owner decides. If the owner keeps a Non-Goal, that release ships without the item and its feature lane takes the fallback in §6.

## 4 · Graded facts

A = verified live in the audit (research says Observed or the CORRECTED check confirmed it, or installed typings, code or a registry read). B = read in docs, not run. C = inferred or an estimate. "Where" names the source key, the bracketed source and its date.

| Fact                                                                                                                                                       | Grade | Where                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| debug latest is 4.4.3 (2025-09-13); no behaviour change on master since; dist-tags latest and beta 4.3.3 only                                              | A     | R1 CORRECTED, R2 [registry.npmjs.org/debug; GitHub commits API, 2026-10-30]                                             |
| debug ≈939M downloads/week, week ending 2026-10-29                                                                                                         | A     | M `downloads` [api.npmjs.org, 2026-10-30]                                                                               |
| Open debug issues ask for JSON output, console.group (#1002), a STDOUT option, inlined `process.env.DEBUG`, Workers `.extend` (#999), Deno                 | B     | R1, R2 [GitHub issues API, titles only, 2026-10-30]                                                                     |
| obug 3.0.0 ≈148.7M/week; 1416 B for `{ createDebug }` vs modern-debug 1464 B, same config                                                                  | A     | R1, M `comparison` [registry; size-limit 14.3.0, 2026-10-30]                                                            |
| obug ships export conditions node, browser, workerd, edge-light, fastly, react-native                                                                      | A     | R1 CORRECTED [github.com/sxzz/obug, 2026-10-30]                                                                         |
| `node:diagnostics_channel` is Stability 2; docs advise checking `hasSubscribers` before building messages                                                  | A     | R1 CORRECTED [nodejs.org/api/diagnostics_channel.html v26.13.0, 2026-10-30]                                             |
| Workers support `node:diagnostics_channel` with no flags from compatibility date 2026-08-04; subscribers run synchronously                                 | B     | L [developers.cloudflare.com/workers/runtime-apis/nodejs/diagnostics-channel, 2026-10-31]                               |
| `util.debuglog` reads `NODE_DEBUG` as a comma list with `foo*` wildcards                                                                                   | B     | R1 [nodejs.org/api/util.html v26.13.0, 2026-10-30]                                                                      |
| `NODE_DEBUG` sections match case-insensitively                                                                                                             | C     | not in research; verify against the util docs at plan time                                                              |
| `process.getBuiltinModule` exists since Node 22.3 / 20.16                                                                                                  | A     | R5 CORRECTED [nodejs.org/docs/latest-v26.x/api/process.md, 2026-10-30]                                                  |
| @opentelemetry/api 1.10.0 exports `logs`, `LogRecord`, `SeverityNumber` (0..24); `Logger.emit(logRecord)`; `getLogger(name, version?, options?)`           | A     | R6 CORRECTED; installed `dist/index.d.mts:56`, `logs/Logger.d.mts:10`, `logs/LoggerProvider.d.mts:23` (read 2026-10-31) |
| @opentelemetry/api `latest` is 1.10.0; @opentelemetry/sdk-logs `latest` is 3.0.0                                                                           | A     | `npm view … dist-tags` (2026-10-31)                                                                                     |
| OTel JS 3.0.0 / 0.300.0 (2026-10-20) mark sdk-logs stable and drop the api-logs package                                                                    | A     | R6 CORRECTED [github.com/open-telemetry/opentelemetry-js/releases, 2026-10-30]                                          |
| OTel Logs Data Model is Stable; a single source level takes the smallest value of its range                                                                | A     | R6 CORRECTED [opentelemetry.io/docs/specs/otel/logs/data-model, 2026-10-30]                                             |
| Mapping pino 10/20/30/40/50/60 to OTel 1/5/9/13/17/21                                                                                                      | C     | R6 (rule from the docs; the pino inputs are prior knowledge, research.md:222, 255)                                      |
| pino uses 60 for fatal                                                                                                                                     | C     | R6 open question (prior knowledge, not fetched)                                                                         |
| Workers Logs extracts and indexes fields from `console.log({ ... })`; one log is capped at 256 KB                                                          | B     | L [developers.cloudflare.com/workers/observability/logs/workers-logs, 2026-10-31]                                       |
| A default-sink line in workerd arrives as one level `log` entry prefixed `stderr: `                                                                        | A     | 17.9, M `workers` [workerd 1.20261023.1 probes, 2026-10-30]                                                             |
| Node 26.13.0 prints a warning on `typeof localStorage` without `--localstorage-file`; 26.0.0 throws a DOMException on access                               | A     | R2 CORRECTED (observed run), R5 [globals.md, 2026-10-30]                                                                |
| debug 4.4.3 browser.js holds 76 hex colours and reads bare `localStorage`                                                                                  | A     | R2 CORRECTED [installed debug@4.4.3 src/browser.js:27-104, 2026-10-30]                                                  |
| Deno ≥ 2.7.0 honours root package.json `overrides` (denoland/deno#32073)                                                                                   | A     | R2 CORRECTED [2026-10-30]                                                                                               |
| Deno and Yarn Berry accept an `npm:` alias value in overrides or `resolutions`                                                                             | C     | R2 open questions; docs show no alias-valued example                                                                    |
| follow-redirects does `require("debug")("follow-redirects")` in try/catch and calls `debug.apply(null, arguments)`                                         | B     | R2 [raw.githubusercontent.com follow-redirects debug.js, 2026-10-30]                                                    |
| agent-base 9.0.0, mongoose 9.11.4 and puppeteer no longer consume debug directly                                                                           | B     | R2 [package.json sources, 2026-10-30]                                                                                   |
| Node 22 EOL 2027-04-30; 24 EOL 2028-04-30; 26 EOL 2029-04-30; 27 Current 2027-04-22                                                                        | A     | R5 CORRECTED [github.com/nodejs/Release README, 2026-10-30]                                                             |
| `util.styleText` hex colours need Node 26.1.0                                                                                                              | A     | R5 CORRECTED [util.md v26, 2026-10-30]                                                                                  |
| BCD first support: `Promise.try` Node 23.0; `using` Node 24.0; `Error.isError` Node 24.3                                                                   | A     | R6 CORRECTED [@mdn/browser-compat-data 8.1.7, 2026-10-30]                                                               |
| TC39 AsyncContext is Stage 2                                                                                                                               | A     | R1 CORRECTED, R6 [tc39/proposal-async-context, 2026-10-30]                                                              |
| npm trust needs the package to exist, npm ≥ 11.15.0 and account 2FA                                                                                        | A     | R5 CORRECTED; L [docs.npmjs.com/cli/v11/commands/npm-trust, 2026-10-31]                                                 |
| The registry supports one trusted-publisher config per package                                                                                             | B     | L npm-trust vs L trusted-publishers (both 2026-10-31) disagree: one vs up to 10                                         |
| Staged publishing works for a new name and publishes the public placeholder `0.0.0-stage`; approval needs 2FA                                              | A     | R5 CORRECTED; L [docs.npmjs.com/staged-publishing, 2026-10-31]                                                          |
| Trusted-publisher configs created after 2026-09-03 allow only stage publish by default; an unused config expires after 2 days                              | A     | R5 CORRECTED; L [docs.npmjs.com/trusted-publishers, 2026-10-31]                                                         |
| Node 26.13.0 bundles npm 11.20.0                                                                                                                           | A     | R5 CORRECTED [2026-10-30]                                                                                               |
| Events made with GITHUB_TOKEN start no workflow runs; PR #1 shows 0-job runs                                                                               | A     | R5 [docs.github.com github_token, 2026-10-30]; 17.1 [gh run view, 2026-10-30]                                           |
| actions/create-github-app-token v3.3.0 (2026-10-12) and ossf/scorecard-action v2.5.0 (2026-10-12) are newest                                               | A     | `gh api repos/…/releases/latest` (2026-10-31)                                                                           |
| Scorecard checks include Pinned-Dependencies, Token-Permissions, Branch-Protection, Security-Policy, Signed-Releases                                       | B     | R5 [github.com/ossf/scorecard docs/checks.md, 2026-10-30]                                                               |
| Dependabot cooldown covers version updates only; npm and github-actions take `default-days`                                                                | B     | R5 [Dependabot options reference, 2026-10-30]                                                                           |
| Dependabot handles exact pins and pnpm-lock correctly                                                                                                      | C     | R5 open question                                                                                                        |
| JSR publishes from GitHub Actions with `id-token: write`, `contents: read` and `npx jsr publish`; the repo is linked in package settings; names are scoped | B     | L [jsr.io/docs/publishing-packages, 2026-10-31]                                                                         |
| @ast-grep/cli `latest` is 0.51.0                                                                                                                           | A     | `npm view @ast-grep/cli dist-tags` (2026-10-31)                                                                         |
| pino redaction takes path arrays with `*` wildcards; paths must never come from user input                                                                 | B     | R1 [pino docs/redaction.md, 2026-10-30]                                                                                 |
| Deno `OTEL_DENO=true` exports console.log and console.error output with span context; marked "in development"                                              | B     | R6 [docs.deno.com open_telemetry, 2026-10-30]                                                                           |
| Lazy-epoch problem: about 50M re-binds, 4046 ms warm and 9204 ms cold for 10 000 instances in workerd                                                      | A     | 17.11 [island worker, 2026-10-30]                                                                                       |
| Byte estimates: OTel bridge 150 to 250 B; core levels 40 to 70 B; compat leftovers +14 B; every new-entry estimate below                                   | C     | R6 recs, 17.8, this file; measured at plan time                                                                         |

## 5 · Architecture across 1.x

### 5.1 Entries

Today and budget are bytes, min+brotli (M `sizes`, 2026-10-30). A "cap" is a ceiling the plan may lower after its first real build; it is never raised without a ledger entry.

| Entry       | Today | Budget  | What 1.x adds                                                     | Release             |
| ----------- | ----- | ------- | ----------------------------------------------------------------- | ------------------- |
| `.`         | 1460  | 1536    | record slot; `.info`, `.fatal`, `level`; epoch re-bind            | 1.1.0, 1.5.0, 1.6.0 |
| `./compat`  | 1753  | 1800    | `init`, `namespaces`, static `destroy`, warn-once                 | 1.4.0               |
| `./otel`    | 249   | 512     | `withLogsBridge`                                                  | 1.2.0               |
| `./node`    | 132   | 448     | diagnostics publish, `nodeDebugPattern`, `streamSink`, `fileSink` | 1.1.0, 1.9.0        |
| `./browser` | new   | cap 512 | `%c` colours, `groupSink`, `persist`                              | 1.3.0               |
| `./sample`  | new   | cap 384 | `sample`, `rateLimit`                                             | 1.6.0               |
| `./redact`  | new   | cap 512 | `redact`                                                          | 1.7.0               |
| `./workers` | new   | cap 384 | `structuredConsole`                                               | 1.8.0               |

Core headroom is 76 B, and three releases draw on it. The 1.1.0 record slot is estimated at 25 to 45 B and the 1.5.0 levels at 40 to 70 B (both C), so their sum can exceed 76 B. 1.6.0 should free bytes, because the epoch counter replaces the WeakRef registry and its sweep (C until measured). `./node` headroom is 316 B, shared by 1.1.0 and 1.9.0.

### 5.2 Hook slots

`src/hooks.ts` holds the cross-entry slots. Entries import it; it is never a public export.

| Slot        | Today | Writer                                                               | Read by core                                                             |
| ----------- | ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `ctxFields` | yes   | `./node` on import                                                   | per emit, in `merge()`                                                   |
| `traceIds`  | yes   | `./otel` `withTraceContext()`                                        | per NDJSON emit                                                          |
| `record`    | 1.1.0 | `./node`, `./otel`, `./browser`, `./sample`, `./redact`, `./workers` | per emit on an enabled namespace, only when a stage's `active()` is true |

The `record` slot is one ordered pipeline of stages. A stage receives a `DebugRecord` and returns it, a changed copy, or `undefined` to drop the line. Each stage exposes an `active()` predicate (hasSubscribers); core builds the record only when one is true. The order is fixed by stage kind, not by import order, so no observer ever sees unredacted fields:

1. redact (1.7.0)
2. filters: sample (1.6.0); the level filter stays in core (1.5.0)
3. observers: diagnostics publish (1.1.0), OTel Logs bridge (1.2.0)
4. output stages that print and then drop: `groupSink` (1.3.0), `structuredConsole` (1.8.0)

Then core formats the surviving record and calls the sink. The type is exported from `.` as a type only, which costs no bytes:

```ts
export interface DebugRecord {
  readonly t: number // Date.now() epoch ms
  readonly ns: string
  readonly msg: string
  readonly sev: number | undefined // undefined for the plain call (LD-07)
  readonly fields: DebugFields | undefined // merged: scope < fields() base < call
}
```

The 1.1.0 plan picks the mechanism for the fixed order (a stage rank or one slot per kind) by measured bytes in the `.` chunk.

### 5.3 Frozen for all of 1.x

- The 1.0.0 public symbols in §5 of the spec and their meaning.
- The `DEBUG` grammar (LD-04) and the colour hash and palette (LD-06).
- The NDJSON envelope order `t, ns, msg, sev?, trace_id?, span_id?, fields` (LD-07). 1.5.0 adds the values 30 and 60 to `sev`; it adds no key.
- The sink signature `(line: string) => void` (LD-11) and `configure()` replace semantics; the 1.3.0 and 1.8.0 output stages bypass the sink only after the owner's §1 decision.
- The disabled path: a shared noop (LD-05). 1.6.0 re-evaluates it lazily, on the first call after `enable()` or `configure()`, under its G-07 amendment (§6.6).
- ESM-only, no CJS artifact, the G-12 `require` condition (LD-01), zero runtime deps (LD-02).
- The engines floor Node ≥ 22.13.0 (LD-01, amended per G-17) until a 2.0.0 decision (1.10.0).

## 6 · Releases 1.1.0 → 1.10.0

Each release lists its additions to the standard gate (§2). "Owner" rows are decisions only the owner makes; the plan records each in a G-NN entry before code lands.

### 6.1 · 1.1.0 · Node diagnostics

**Why.** `diagnostics_channel` lets OTel, pino or an APM subscribe with zero coupling (R1, A). `util.debuglog` users already set `NODE_DEBUG` (R1, B).

**Feature.** Calling `publishRecords()` from `./node` installs an observer stage that publishes each emitted record on the channel `modern-debug:record` as `{ ns, sev, msg, fields, t }`, only when `channel.hasSubscribers` is true. The channel comes from `typeof process !== 'undefined' ? process.getBuiltinModule?.('node:diagnostics_channel') : undefined` inside a try, so a runtime without it (workerd with `nodejs_als` only, no `process`) still loads `./node`. Disabled namespaces publish nothing (LD-05).

```ts
// modern-debug/node, additions
export function publishRecords(): void // installs the diagnostics_channel observer stage
export function nodeDebugPattern(): string | undefined // NODE_DEBUG mapped to the DEBUG grammar
// usage: enable(nodeDebugPattern() ?? ''): explicit call, never applied on import
```

`nodeDebugPattern()` splits on commas, trims, keeps `*` wildcards, lowercases (default for the case question, §9) and joins with `,`. It returns `undefined` when `NODE_DEBUG` is unset or empty. Mixed-case namespaces are a documented divergence.

**Hardening.** SHA-pin every GitHub Action. Owner decides; default: pin by full commit SHA with the exact tag in a trailing comment (17.11).

**Debt.** `isWellFormed()` replaces the Cs-property regex in the F116 property, since lib is ES2024 (17.11). format-ndjson.ts imports the safeJson marker literal from json.ts instead of repeating it (17.11). The happy-dom lock oddity closes at the first vitest bump or `pnpm install --fix-lockfile` (G-18.4). First plan adds `srcExclude: ['plans/**']` (§2).

**Size.** `./node` 132 → cap 448 (estimate +60 to 120 B, C). `.` 1460 → ≤ 1536 (record slot estimate +25 to 45 B, C).

| Layer   | Tool                             | What                                                                                                                                                               |
| ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| unit    | vitest node                      | payload shape; each stage exposes an `active()` predicate (hasSubscribers); core builds the record only when one is true; disabled ns publishes nothing            |
| oracle  | vitest node, child process       | `nodeDebugPattern()` enables the same sections `util.debuglog(section).enabled` reports, for lowercase sections; mixed-case namespaces are a documented divergence |
| table   | `it.for`                         | empty, spaces, `foo*`, mixed case, trailing comma                                                                                                                  |
| workerd | tests-workers pool and miniflare | publish under default compat; `./node` loads with `nodejs_als` only                                                                                                |
| smoke   | Bun, Deno, Node 22.13.0 floor    | `./node` imports and logs                                                                                                                                          |

**Gate.** Standard gate, plus `pnpm -C packages/modern-debug size` reading `./node` ≤ 448 and `.` ≤ 1536, and `git grep -n "uses: .*@v" .github/workflows` empty if SHA pinning is accepted.

**Risks.** The record slot makes core red → fallback: a `diagnosticsSink(inner)` sink wrapper in `./node` that publishes the line string, with no core change → kill: the slot measures above 45 B, or above the headroom left. Bun or Deno lack the channel → the guard skips publishing. If the slot is killed, 1.2.0, 1.3.0 groupSink, 1.6.0 sample, 1.7.0 and 1.8.0 re-plan onto sink wrappers before they start.

**Owner.** SHA pinning. The record payload shape becomes public contract at 1.1.0. Adds module state outside the G-08 restatement of LD-15 (the `record` pipeline in hooks.ts); a G-NN entry restates LD-15 to include hook slots and stage state, or the owner rejects it.

### 6.2 · 1.2.0 · OTel Logs bridge

**Why.** OTel JS 3.0.0 marks the Logs SDK stable, and api 1.10.0 carries the Logs API (R6, A).

**Feature.**

```ts
// modern-debug/otel, addition
export interface LogsBridgeOptions {
  readonly loggerName?: string // default 'modern-debug'
}
export function withLogsBridge(opts?: LogsBridgeOptions): void
```

It caches `api.logs.getLogger(name)` once and installs an observer stage that calls `emit({ timestamp: t, severityNumber, severityText, body: msg, attributes: { ns, ...fields } })`. The mapping is arithmetic, with no enum import: `severityNumber = sev / 10 * 4 - 3`, so 10/20/30/40/50/60 → 1/5/9/13/17/21 (TRACE to FATAL). The plain call maps to 5, `DEBUG` (default, §9). The NDJSON envelope does not change. No `@opentelemetry/sdk-logs` dependency, ever.

**Hardening.** `SECURITY.md`, an OpenSSF Scorecard workflow on `ossf/scorecard-action` (v2.5.0 today; resolve live at plan time) and its README badge.

**Debt.** The `[vpw:warn]` printed on every island run (17.11): silence it by config if the plugin allows, else record it as upstream with the plugin version.

**Size.** `./otel` 249 → ≤ 512 (estimate +150 to 250 B, C).

| Layer       | Tool                                            | What                                                                   |
| ----------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| unit        | vitest node, a hand-written fake LoggerProvider | emitted record fields, mapping table via `it.for`, plain call severity |
| unit        | vitest node                                     | trace correlation: an active span reaches the emitted record           |
| peer absent | existing otel-peer-absent test                  | the import-time hint still throws                                      |
| smoke       | Bun, Deno                                       | `withLogsBridge()` with the no-op provider does not throw              |

**Gate.** Standard gate, plus `./otel` ≤ 512 and the Scorecard workflow green on main.

**Risks.** Over 512 B → fallback: a new entry `./otel-logs` with its own cap, which amends LD-01 and LD-08 (the peer is imported only inside `./otel`) → kill: the api `logs` shape changes before the plan starts.

**Owner.** Raise the optional peer to `^1.10.0`, which amends LD-08 via a G-NN entry. The alternative keeps `^1.9.1` and feature-detects `api.logs`, with no amendment and some bytes. Adds module state outside the G-08 restatement of LD-15 (the cached logger); a G-NN entry restates LD-15 to include hook slots and stage state, or the owner rejects it.

### 6.3 · 1.3.0 · Browser and DevTools

**Why.** debug issue #1002 asks for console.group; obug colours browsers with `%c` (R1, R2: B).

**Feature.** New entry `./browser`.

```ts
export interface GroupSinkOptions {
  readonly collapsed?: boolean // console.groupCollapsed instead of console.group
  readonly colors?: boolean // default true: %c CSS from the LD-06 hash over debug's 76 hex colours
}
export function groupSink(opts?: GroupSinkOptions): void // output stage; drops the string line
export function persist(pattern: string): void // enable(pattern), then writes localStorage.debug
```

`groupSink` prints with `console.debug`, as debug's browser build does (R2, A), and opens one group per run of records from the same namespace. Fields go as a second, expandable argument. `persist` imports `enable` from core, so `./browser` measures with the core chunk unless the size entry marks it shared; the 1.3.0 plan measures both ways before setting the cap. It never touches `localStorage` where `process.env` exists, the env.ts rule (R2, R5: Node 26 warns or throws). A Vite and rolldown `define` fixture checks the bundler-inlined `DEBUG` demand (R1).

**Hardening.** Split docs.yml into a `build` job (contents read) and a `deploy` job that alone holds `pages: write` and `id-token: write` (17.11).

**Debt.** VitePress `lastUpdated` with `fetch-depth: 0`, and the dark-mode screenshot (17.8 "Not done").

**Size.** `./browser` new, cap 512 (C); delta-encode the palette as format-pretty.ts does.

| Layer   | Tool                                                    | What                                                                                                   |
| ------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| golden  | vitest node + a new capture from debug 4.4.3 browser.js | namespace → hex colour parity                                                                          |
| browser | vitest browser, Playwright Chromium                     | `%c` arguments, grouping, `persist` round trip on real storage                                         |
| node    | no-warning.test.ts pattern                              | importing `./browser` on Node 26.13.0 prints no warning                                                |
| fixture | vite build with `define`                                | a `globalThis.DEBUG` define reaches the LD-09 rung; a `process.env.DEBUG` define is recorded as a miss |

**Gate.** Standard gate, plus `./browser` ≤ its recorded cap and the define fixture test.

**Risks.** env.ts returns before reading the env when `typeof process === 'undefined'`, and it reads the computed `process.env?.[key]`, so a `define` of `process.env.DEBUG` misses it (A, env.ts:12) → fallback: document `define: { 'globalThis.DEBUG': … }`, the LD-09 rung that already exists → kill: none; the fixture result is recorded either way.

**Owner.** The new entry amends LD-01 (G-NN). The cap is set from the first build. An output stage bypasses the configured sink; this crosses the spec §1 Non-Goal "One sink function" and LD-11's single output path, so the owner decides via G-NN.

### 6.4 · 1.4.0 · Compat completeness and migration

**Why.** The compat factory still lacks three debug 4.4.3 members (divergence.md, 17.8).

**Feature.** `./compat` gains exactly the F102 leftovers, plus F098:

```ts
export interface CompatDebug {
  // existing members unchanged
  init(debug: CompatDebugger): void // common.js:142-144
  namespaces: string // public, as debug common.js:164 sets it in enable()
  destroy(): void // static stub, common.js:15
}
```

`destroy()` warns once per process, as debug does (F098). `humanize`, `selectColor`, `names`/`skips`, `useColors`, `colors` and per-instance `inspectOpts` already exist (src/compat.ts).

The alias fixture grows from express 5.3.0, send 1.2.1 and socket.io 4.8.4 to five dependents: follow-redirects (R2) and one more direct `debug` consumer picked from a live dependents query (§9). New fixtures test Yarn Berry `resolutions` and Deno ≥ 2.7.0 `package.json` overrides with `"debug": "npm:modern-debug@^1"` live (R2 open questions).

`codemods/` holds ast-grep rules, run with `@ast-grep/cli` (0.51.0 today, exact-pinned root devDependency). No new package. Rules: `require('debug')` → `require('modern-debug')` (the G-12 `require` condition); `import debug from 'debug'` → `'modern-debug/compat'`; opt-in `require('debug')(ns)` → `createDebug(ns)` only in ESM files, adding `import { createDebug } from 'modern-debug'`, and only where every call passes one string.

**Hardening.** A GitHub ruleset on main that requires the 12 blocking non-bench CI jobs, with a bypass for the release App; it lands only after owner step 2 (App token) is wired.

**Debt.** F102 leftovers and F098 (17.8).

**Size.** `./compat` 1753 → ≤ 1800 (estimate +14 B plus warn-once, C). The plan measures first.

| Layer   | Tool                                    | What                                                                |
| ------- | --------------------------------------- | ------------------------------------------------------------------- |
| golden  | compat-golden suite                     | `init`, `namespaces`, `destroy` against the live debug 4.4.3 oracle |
| fixture | alias fixtures (pnpm, Yarn Berry, Deno) | five dependents resolve `dist/compat-cjs.js`                        |
| codemod | `ast-grep test`                         | each rule's before and after snapshots, plus no-match cases         |

**Gate.** Standard gate, plus `./compat` ≤ 1800, the Yarn and Deno fixture jobs and `ast-grep test`.

**Risks.** Over 1800 B → the overage goes in a G-NN; the owner picks a budget amendment or drops items. Yarn rejects the alias value → README says npm, pnpm and Bun only.

**Owner.** The ruleset. Budget or scope if compat goes red.

### 6.5 · 1.5.0 · Levels

**Why.** Every peer logger offers levels and a minimum filter (R1: consola, loglevel, LogTape, B).

**Feature.** This is the one release that touches core bytes on purpose.

```ts
export interface DebugFn {
  // existing members unchanged
  info(msg: string, fields?: DebugFields): void // sev 30
  fatal(msg: string, fields?: DebugFields): void // sev 60
}
export interface Configure {
  // existing members unchanged
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal' // minimum; default: no filter
}
```

`MODERN_DEBUG_LEVEL` takes the same names, with configure > env, as LD-10 orders format. The plain call counts as `debug` for filtering and still emits no `sev` key. The docs publish the OTel mapping of 1.2.0. No envelope key changes.

**Hardening.** release.yml checks the published version for a provenance attestation and fails on a "Skipped OIDC" log line (R5 recommendation).

**Debt.** Document how Datadog reads numeric `sev`, or record it as unverified (R6 open question).

**Size.** `.` estimate +40 to 70 B (C) against what 1.1.0 left of 76 B. LD-16 says levels in core cost ≤ 48 B, and that levels which push core past its budget move to a `/levels` entry.

| Layer    | Tool           | What                                                               |
| -------- | -------------- | ------------------------------------------------------------------ |
| unit     | levels.test.ts | sev 30 and 60, filter by name, env rung, plain call passes `debug` |
| property | fast-check     | NDJSON still parses; `sev` ∈ {30, 40, 50, 60} or absent            |
| bench    | mitata         | disabled path unchanged against the ≤ 1.05× gate                   |

**Gate.** Standard gate, plus `.` ≤ 1536 B or an owner-approved amended budget.

**Risks.** Core red → fallback: a `./levels` entry, which needs a core emit-with-sev hook (bytes measured) and amends LD-01; or pull the 1.6.0 epoch rewrite forward if it frees bytes → kill: none, the honesty rule records the number.

**Owner.** Amends LD-07 (`sev` gains 30 in use and 60 new) and LD-16 (two more levels in core) via a G-NN entry. If red: a +64 B `.` budget amendment (precedent G-10: 1024 → 1536) or the `./levels` fallback.

### 6.6 · 1.6.0 · Hot paths

**Why.** `enable()` and `configure()` re-bind every live instance: O(N) per toggle, about 50M re-binds and 4046 ms warm, 9204 ms cold for 10 000 instances in workerd (17.11, A).

**Feature.** Core: a module `epoch` counter replaces the WeakRef registry and sweep. `enable()` and `configure()` bump it; each instance re-binds on its first call after a bump. The disabled path stays the shared noop plus one integer compare. New entry `./sample`:

```ts
export function sample(rates: Readonly<Record<string, number>>): void
// keys are DEBUG-grammar patterns, values keep-ratios in [0, 1]; first matching key wins
export interface RateLimitOptions {
  readonly perSecond: number
  readonly burst?: number // default perSecond
}
export function rateLimit(
  opts: RateLimitOptions,
  sink?: (line: string) => void,
): (line: string) => void
// usage: configure({ sink: rateLimit({ perSecond: 100 }) })
```

Sampling is deterministic: a per-namespace counter, phase-shifted by the LD-06 hash of `ns`, keeps a record when `floor((n + 1) * rate) > floor(n * rate)`. No `Math.random` in the hot path. Records at sev ≥ 50 bypass sampling (default, §9). `rateLimit` is a token bucket on `Date.now()`.

**Hardening.** The CI `bench` job already fails on a breach (ci.yml, "ENFORCED from 0.7.0"); this release moves it to the then-current Node 26 and 24 lines and adds the new suite to it. It also tries `minimumReleaseAgeExcludePrune: true` in pnpm-workspace.yaml so exact-version excludes stop going stale (R4 recommendation, untested, C).

**Debt.** The lazy-epoch row of 17.11.

**Size.** `.` byte-neutral or better, measured. `./sample` new, cap 384 (C).

| Layer    | Tool                                     | What                                                                                  |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| unit     | registry.test.ts, configure.test.ts      | re-bind after toggle; no registry left                                                |
| workerd  | tests-workers                            | the long-lived re-bind test; the sweep mutation check becomes an epoch mutation check |
| bench    | mitata, new "10k instances toggle" suite | toggle cost flat in N; gate set from the first measurement                            |
| property | fast-check                               | sampled count within 1 of `rate * n`                                                  |

**Gate.** Standard gate, plus `node bench/run-benches.mjs` with all gates PASS on both Node lines.

**Risks.** The compare costs the disabled path → kill: the ≤ 1.05× debug gate goes red; fallback: keep the registry and batch the sweep.

**Owner.** Amends the G-08 restatement of LD-15, the G-07 interpretation of LD-05 (lazy re-bind, one compare on the disabled path) and spec §6 (the WeakRef registry bullet) via a G-NN entry. The new entry amends LD-01. Adds module state outside the G-08 restatement of LD-15 (`./sample` per-namespace counters, which grow with every namespace in a warm isolate); a G-NN entry restates LD-15 to include hook slots and stage state, or the owner rejects it.

### 6.7 · 1.7.0 · Redaction

**Why.** pino and tslog ship path redaction; LogTape lists it (R1, B).

**Feature.** New entry `./redact`.

```ts
export interface RedactOptions {
  readonly censor?: string // default '[Redacted]'
  readonly remove?: boolean // delete the key instead of censoring
}
export function redact(paths: readonly string[], opts?: RedactOptions): void
```

Grammar, a documented subset of pino's: `a.b`, `a.*.c`, leading `*.password`. Paths compile once, at the call; a bad path throws there, never at emit. The stage runs first in the pipeline (§5.2), on the merged fields, before any observer or sink. `msg` and envelope keys are not touched. The README states that paths must never come from user input (R1).

**Hardening.** CI snapshots the `npm pack --dry-run` file list, so a new entry cannot ship an unexpected file (the spec 0.9.x "npm pack audit", made permanent).

**Debt.** rolldown-plugin-dts 0.29.0, re-armed by a tsdown release that widens `^0.28.8` (17.11); every plan's freshness sweep checks it, and this release owns it if still open.

**Size.** `./redact` new, cap 512 (C).

| Layer    | Tool                                        | What                                                              |
| -------- | ------------------------------------------- | ----------------------------------------------------------------- |
| property | fast-check vs a naive reference in the test | matched paths never show the original value; others are untouched |
| unit     | vitest node                                 | ordering: diagnostics and OTel stages see redacted fields         |
| fuzz     | fast-check                                  | path compile stays linear on long wildcard paths                  |

**Gate.** Standard gate, plus `./redact` ≤ its cap and the pack snapshot.

**Risks.** Pipeline ordering costs core bytes → fallback: `redact` wraps `configure({ sink })` for NDJSON only → kill: owner keeps the §1 Non-Goal.

**Owner.** Amends the spec §1 Non-Goal "no redaction engine" via G-NN. The new entry amends LD-01. Adds module state outside the G-08 restatement of LD-15 (compiled paths); a G-NN entry restates LD-15 to include hook slots and stage state, or the owner rejects it.

### 6.8 · 1.8.0 · Edge and Deno

**Why.** Workers Logs indexes fields only from logged objects (L, B). debug issues ask for Workers and Deno support (R2, B).

**Feature.** New entry `./workers`.

```ts
export interface StructuredConsoleOptions {
  readonly method?: 'log' | 'by-sev' // default 'by-sev': warn at 40, error at 50 and up, else log
}
export function structuredConsole(opts?: StructuredConsoleOptions): void // output stage
```

It hands `console` the LD-07 envelope as an object, in envelope key order, with `trace_id` and `span_id` when `./otel` is installed, then drops the string line. The docs cover the `stderr: ` prefix of the default sink (17.9) and the Deno `OTEL_DENO=true` console capture (R6, B).

**Hardening.** Dependabot with a cooldown that mirrors pnpm's 1440-minute `minimumReleaseAge` default (17.3), one group for devDependencies and one for actions. Renovate is the fallback if Dependabot mishandles exact pins or pnpm-lock (R5, C).

**Debt.** The stale miniflare v4 README note (17.11). Re-verify G-12's "pool masks compat flags" under @cloudflare/vitest-plugin (17.9).

**Size.** `./workers` new, cap 384 (C).

| Layer   | Tool                              | What                                                                   |
| ------- | --------------------------------- | ---------------------------------------------------------------------- |
| workerd | tests-workers miniflare           | `handleStructuredLogs` receives the object, not a string (C until run) |
| unit    | vitest node, console spy          | key order, method routing by sev                                       |
| smoke   | CI deno job with `OTEL_DENO=true` | logging runs; capture mode default                                     |

**Gate.** Standard gate, plus `./workers` ≤ its cap and a green Dependabot config check.

**Risks.** Field indexing is only visible on a deployed Worker → the docs cite the Cloudflare page and its date; the tests prove the object handoff only.

**Owner.** Dependabot or Renovate. The new entry amends LD-01. An output stage bypasses the configured sink; this crosses the spec §1 Non-Goal "One sink function" and LD-11's single output path, so the owner decides via G-NN.

### 6.9 · 1.9.0 · Node transports

**Why.** debug users ask for a STDOUT option (R1, R2: titles, B).

**Feature.** `./node` additions:

```ts
export interface LineWritable {
  write(chunk: string): unknown
}
export function streamSink(stream: LineWritable): (line: string) => void
export function fileSink(path: string, opts?: { readonly flags?: string }): (line: string) => void
// usage: configure({ sink: streamSink(process.stdout) })
```

A structural `LineWritable` keeps the shipped d.ts free of `@types/node`. `fileSink` opens `fs.createWriteStream(path, { flags: opts?.flags ?? 'a' })` through `process.getBuiltinModule('node:fs')` inside the call. `./node` keeps one static import, `node:async_hooks`, so workerd with `nodejs_als` only still loads it (17.9). Appends only; no rotation, no buffering beyond the stream's own.

**Hardening.** Node 27 becomes Current on 2027-04-22 (R5, A): its verify legs turn blocking then.

**Debt.** Re-test the documented "Alias + ESM" divergence (`import debug from 'debug'` under the override) on the then-current Node lines; keep or close it in divergence.md.

**Size.** `./node` ≤ 448 together with 1.1.0 (C).

| Layer   | Tool                  | What                                                 |
| ------- | --------------------- | ---------------------------------------------------- |
| unit    | vitest node, temp dir | one line per record, newline-terminated, append mode |
| workerd | tests-workers         | `./node` loads with `nodejs_als` only                |
| smoke   | Bun, Deno             | `streamSink(process.stdout)`                         |

**Gate.** Standard gate, plus `./node` ≤ 448.

**Risks.** Over 448 B → fallback: a `./node-sinks` entry with its own cap (amends LD-01) → kill: owner keeps the §1 Non-Goal "no file targets"; `streamSink` ships alone.

**Owner.** Amends the spec §1 Non-Goal "no file targets" via G-NN.

### 6.10 · 1.10.0 · Distribution and longevity

**Why.** Deno users install from JSR (R1: @std/log lives there, B). Node 22 reaches EOL on 2027-04-30 (R5, A).

**Feature.** A JSR publish of a scoped name, from a release.yml job with `id-token: write` and `contents: read` running `npx jsr publish`, after the owner links the repo in JSR settings (L, B). `jsr.json` takes its version from package.json in a script. The `exports` conditions are reviewed against measured need: a condition (for example `browser` or `workerd`, as obug ships) is added only when a fixture shows a bundler resolving the wrong file.

**Hardening.** The JSR job holds `id-token: write` alone, like npm `publish`.

**Debt.** A 1.x API-freeze audit: every public symbol has a test, a docs page line and a d.ts snapshot (`toMatchFileSnapshot` over `dist/*.d.ts`). The ledger reaches zero open items for 1.x.

**Size.** No entry grows. All eight budgets hold.

**Gate.** Standard gate, plus a JSR dry run green (the flag is not on the page read 2026-10-31; C, checked at plan time) and the d.ts snapshot test.

**Risks.** JSR rejects the dist shape or slow types (C) → fallback: skip JSR, record why.

**Owner.** The JSR scope. A written 2.0.0 engines decision; default: stay on Node ≥ 22.13.0 until the 2027-04-30 EOL. 2.0.0 itself is out of scope here.

## 7 · Milestones

Windows are the orchestrator's guess, not promises (§2).

| #      | Outcome                                                | Gate               | Window (guess)                                     |
| ------ | ------------------------------------------------------ | ------------------ | -------------------------------------------------- |
| 1.0.0  | published with provenance; §12 crosswalk closed        | §1.4 all rows done | once the owner runs §1.3                           |
| 1.1.0  | records on `modern-debug:record`; `nodeDebugPattern()` | §6.1               | first release after 1.0.0 publishes                |
| 1.2.0  | OTel Logs bridge; Scorecard                            | §6.2               | after the LD-08 decision                           |
| 1.3.0  | `./browser`                                            | §6.3               | after 1.2.0 and the "One sink function" decision   |
| 1.4.0  | compat complete; 5 dependents; codemods                | §6.4               | after 1.3.0                                        |
| 1.5.0  | `.info`, `.fatal`, `level`                             | §6.5               | after the LD-07/LD-16 decision                     |
| 1.6.0  | epoch re-bind; `./sample`; bench re-baseline           | §6.6               | after 1.5.0, or before it if 1.5.0 needs the bytes |
| 1.7.0  | `./redact`                                             | §6.7               | after the §1 Non-Goal decision                     |
| 1.8.0  | `./workers`; Dependabot                                | §6.8               | after 1.7.0 and the "One sink function" decision   |
| 1.9.0  | `streamSink`, `fileSink`                               | §6.9               | after Node 27 turns Current (2027-04-22)           |
| 1.10.0 | JSR; API-freeze audit; 2.0.0 engines memo              | §6.10              | before Node 22 EOL (2027-04-30)                    |

## 8 · Rejected for 1.x

- **TC39 AsyncContext.** Rejected: it is Stage 2, with no portable engine support; context stays on AsyncLocalStorage in `./node` (R1, R6: A).
- **A dependency on `@opentelemetry/sdk-logs`.** Rejected: the bridge needs only the API peer, and the SDK is the application's choice (LD-08; R6).
- **A CJS build.** Rejected: LD-01; CJS consumers use `require(esm)` through the G-12 condition.
- **WASM or Rust.** Rejected: LD-03, the boundary costs more than it saves. The standing directive says Rust beta 1.98 if Rust ever enters; it does not enter.
- **`supports-color` or any runtime dependency.** Rejected: LD-02; the 256-colour palette is fixed.
- **Vendor transports (Logtail, Datadog SDKs).** Rejected: a pluggable sink covers them; vendor SDKs carry their own deps (R1: @logtail/node has 4).
- **`util.styleText` hex colours in place of the LD-06 palette.** Rejected: hex needs Node 26.1.0 while engines is Node ≥ 22.13.0 (R5, A), and LD-06 fixes the palette.
- **`Promise.try`, `using`, `Error.isError` in core.** Rejected: Node 23.0, 24.0 and 24.3 per BCD (R6, A); the floor is 22.13.0, and ES2025 lib would type `Promise.try` (17.10).
- **A new parity oracle.** Rejected: debug has had no behaviour change since 2025-09-13 and has no 5.x plan (R1, R2: A). Re-check only if 4.4.4 or 4.5 ships.

## 9 · Deliberately unresolved, with defaults

| Question                                                                                                                                | Default                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Bootstrap: staged or manual publish                                                                                                     | staged, left unapproved (§1.3)                                                             |
| Does a pending stage block or interact with the OIDC 1.0.0 publish                                                                      | check `npm stage list` after step 4; ask npm support if 1.0.0 fails                        |
| Does the `0.0.0-stage` placeholder hold the `latest` tag until 1.0.0                                                                    | assume yes; step 5 checks `dist-tags`                                                      |
| One trusted-publisher config per package or up to 10 (L npm-trust vs L trusted-publishers, both 2026-10-31, disagree: one vs up to 10)  | plan for one                                                                               |
| `NODE_DEBUG` case handling                                                                                                              | lowercase; matching namespaces must be lowercase                                           |
| Severity of the plain call in the OTel bridge                                                                                           | 5, `DEBUG`                                                                                 |
| One OTel logger or one per namespace                                                                                                    | one, named `modern-debug`                                                                  |
| Fifth alias-fixture dependent                                                                                                           | the top direct `debug` dependent from a live query at plan time (R2: ranking not queried)  |
| Sev ≥ 50 bypasses sampling                                                                                                              | yes                                                                                        |
| Record pipeline ordering mechanism                                                                                                      | the cheaper of stage rank or slot per kind, by measured bytes                              |
| SHA pins for actions                                                                                                                    | pin by SHA, tag in a comment                                                               |
| Dependabot or Renovate                                                                                                                  | Dependabot; Renovate if exact pins break it                                                |
| JSR scope                                                                                                                               | owner picks                                                                                |
| Optional peer floor for the OTel bridge (LD-08)                                                                                         | raise to `^1.10.0` via G-NN                                                                |
| GitHub ruleset on main                                                                                                                  | after the App token (owner step 2) is wired                                                |
| LD-07 and LD-16 for 1.5.0 levels                                                                                                        | amend via G-NN when 1.5.0 measures green                                                   |
| LD-01 for each new entry                                                                                                                | one G-NN per new entry                                                                     |
| The two spec §1 Non-Goals (no file targets, no redaction engine)                                                                        | amend §1 to "not in core; entries may carry them"                                          |
| The spec §1 Non-Goal "One sink function" (1.3.0 groupSink, 1.8.0 structuredConsole)                                                     | amend via G-NN: output stages are opt-in and bypass the sink only when called              |
| G-07 interpretation of LD-05 for the 1.6.0 epoch                                                                                        | amend via G-NN if the ≤ 1.05× disabled gate holds                                          |
| Module state outside the G-08 restatement of LD-15 (hook slots and stage state; precedent: the unrecorded `ctxFields`/`traceIds` slots) | a G-NN entry restates LD-15 to include hook slots and stage state, or the owner rejects it |
| 2.0.0 engines                                                                                                                           | stay on Node ≥ 22.13.0 until 2027-04-30                                                    |

## 10 · Exit gate for the series

"1.10.0 shipped" means: every release in §6 published with provenance from release.yml; all entry budgets green at their recorded caps; the debug 4.4.3 golden suite at 100 %; the bench gates enforced and PASS on the then-current Node lines; and the ledger with zero open 1.x items.

This roadmap does NOT authorize:

- any publish to npm or JSR, or any push. Nothing here is a publish authorization;
- any Locked Decision change. Each one named here needs its own G-NN entry and the owner;
- treating main as production. main is not prod;
- any release landing without the owner's explicit word. Every release lands only then.
