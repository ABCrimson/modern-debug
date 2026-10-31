# Runtime matrix

CI: Node 24.22.2 and 26.13.0 on Ubuntu, Windows and macOS (blocking), Node 27.0.0-alpha.0.0.0
(non-blocking), a Node 22.13.0 floor job, Bun, Deno 2, Cloudflare workerd 1.20261023.1 and
Chromium (Playwright). Each row below is a job in `.github/workflows/ci.yml` (read 2026-10-30);
test counts come from the 2026-10-30 gate (vitest 5.1.0-beta.1).

| Runtime                                                 | Job       | How it is exercised                                                                                                                                                                                    |
| ------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node 24.22.2 (maintenance LTS) and 26.13.0 (Active LTS) | `verify`  | `pnpm verify` (typecheck, lint, knip, the package suite of 342 tests in 20 files, size, publint, attw), the runtime smoke and coverage, on Ubuntu, Windows and macOS                                   |
| Node 27.0.0-alpha.0.0.0                                 | `verify`  | the same steps on the same three OSes, non-blocking (`continue-on-error`)                                                                                                                              |
| Node 22.13.0 (published `engines.node` floor)           | `floor`   | builds on 26.13.0, then runs the ESM smoke and the alias fixture (CJS dependents loading `modern-debug/compat` through `require(esm)`) on 22.13.0                                                      |
| Bun                                                     | `bun`     | runtime smoke against the built dist (setup-bun)                                                                                                                                                       |
| Deno 2                                                  | `deno`    | runtime smoke against the built dist (setup-deno, `v2.x`)                                                                                                                                              |
| Cloudflare workerd 1.20261023.1                         | `workers` | @cloudflare/vitest-plugin 1.4.11 pool (4 tests in 2 files) plus raw miniflare 5.20261023.3-beta boots (6 tests in 2 files) with Node.js compatibility on, default-on, `nodejs_als` alone and opted out |
| Chromium                                                | `browser` | vitest browser mode with Playwright 1.65.0-alpha-2026-10-31 (6 tests in 2 files)                                                                                                                       |

Node versions are from nodejs.org/dist/index.json (read 2026-10-30): 26.13.0 has been Active LTS
since 2026-10-28, 24.22.2 is maintenance LTS, and 27.0.0-alpha.0.0.0 is the current alpha. The
published floor is 22.13.0 because it is the first 22.x with `require(esm)` unflagged and
warning-free (DECISIONS G-17).

## Per-runtime notes

- **Node / Bun / Deno 2** — everything works, including `/compat`'s byte-parity printf path
  (all three provide `process.getBuiltinModule('node:util')`).
- **Deno without `--allow-env`** — the env ladder treats denied permission as "unset" and
  falls through; no prompt, no crash.
- **Workers** — under Node.js compatibility, a `DEBUG` text binding (a `vars` entry) is
  `process.env.DEBUG` from module load (workerd 1.20261023.1, probed 2026-10-30); the core and
  `/compat` both read it. Without Node.js compatibility there is no `process`: set
  `globalThis.DEBUG` before the first logger is created. Only the core reads that rung;
  `/compat` reads only `process.env.DEBUG` or `localStorage.debug`, so call its `enable()`.
  The default sink uses `process.stderr.write` under Node.js compatibility and `console.error`
  without it. Requirement for the subpath: Node.js compatibility (on by default from
  compatibility date 2026-08-04; nodejs_compat before that) or the nodejs_als flag alone for
  modern-debug/node (workerd 1.20261023.1, 2026-10-30). The core needs no flag.
- **Browsers** — enable via `localStorage.debug = 'app:*'`, exactly like `debug`. `/compat`
  writes `<ISO date> ns msg` lines to `console.error` there, not `debug`'s browser format; see
  [Divergence notes](./divergence).
