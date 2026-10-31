# modern-debug — executor notes (distilled from 01-modern-debug-CLAUDE.md)

Authority order: `01-modern-debug-CLAUDE.md` (the spec) → `DECISIONS.md` (append-only) → inline comments.
Nothing overrides a Locked Decision (LD-01…LD-18, spec §2).

## Operating rules

- Execute phases strictly in order (spec §9). Every phase ends with a gate that must exit 0.
- After every substantive change: `pnpm verify` (typecheck → lint → knip → test → size → publint/attw).
- Honesty rule: never delete or weaken a gate. If it cannot be met, record the measured number
  and blocking cause in `DECISIONS.md` and surface it.
- TDD: no production code without a failing test first.
- Version drift: adopt the newest release on any channel (latest, next, beta, canary, alpha) and
  log the delta in `DECISIONS.md` (amended per G-17). A newest build that is verifiably broken here
  is held with evidence beside the pin and in `.peak-modern-holds.json`. Oracle pins are exempt:
  `debug` 4.4.3 (LD-04/06) and `typescript-legacy` = `npm:typescript@5.8.3` (G-14).

## Hard constraints (memorize)

- ESM-only, `"type": "module"`, no CJS anywhere (LD-01). Zero runtime deps (LD-02). No WASM (LD-03).
- Engines (LD-01, amended per G-17): published package `node >=22.13.0`; repo root `node >=24.22.2`.
- Size gates (size-limit 14.3.0, rolldown, min+brotli, 2026-10-30; method amended per G-17):

  | Entry                                | Budget | Measured |
  | ------------------------------------ | ------ | -------- |
  | `.` (`import { createDebug }`, G-10) | 1536 B | 1460 B   |
  | `./compat`                           | 1800 B | 1753 B   |
  | `./otel`                             | 512 B  | 249 B    |
  | `./node` (platform node)             | 448 B  | 132 B    |

- `debug` 4.4.3 grammar/color-hash parity is defined by golden fixtures, not prose (LD-04/06, §8.3).
- One vitest line repo-wide: 5.1.0-beta.1, including `tests-workers/` through
  `@cloudflare/vitest-plugin` 1.4.11 (LD-13 amended per G-17: the workers island is retired).
- All devDependencies exact-pinned (no `^`/`~`); the only range is the optional peer
  `@opentelemetry/api ^1.9.1` (LD-08).
- Rust is not used anywhere (LD-03). Standing user directive: if Rust ever enters, use Rust beta 1.98.

## Layout

- `packages/modern-debug/` — the only publishable package (4 subpath entries).
- `tests-workers/` — workerd tests. `bench/` — mitata suites (phase 0.7.0). `docs/` — VitePress (phase 0.9.0).
- `fixtures/debug-golden/` — captured `debug` 4.4.3 outputs for the differential suite.
- `fixtures/alias-migration/` — standalone pnpm root; real `debug` dependents behind the override.
