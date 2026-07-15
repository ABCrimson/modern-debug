# modern-debug — executor notes (distilled from 01-modern-debug-CLAUDE.md)

Authority order: `01-modern-debug-CLAUDE.md` (the spec) → `DECISIONS.md` (append-only) → inline comments.
Nothing overrides a Locked Decision (LD-01…LD-18, spec §2).

## Operating rules
- Execute phases strictly in order (spec §9). Every phase ends with a gate that must exit 0.
- After every substantive change: `pnpm verify` (typecheck → lint → test → size → publint/attw).
- Honesty rule: never delete or weaken a gate. If it cannot be met, record the measured number
  and blocking cause in `DECISIONS.md` and surface it.
- TDD: no production code without a failing test first.
- Version drift: adopt newer versions within the same channel, log delta in `DECISIONS.md`.

## Hard constraints (memorize)
- ESM-only, `"type": "module"`, no CJS anywhere (LD-01). Zero runtime deps (LD-02). No WASM (LD-03).
- Size gates (min+brotli): `.` ≤1024 B · `./compat` ≤1800 B · `./otel` ≤512 B · `./node` ≤448 B.
- `debug` 4.4.3 grammar/color-hash parity is defined by golden fixtures, not prose (LD-04/06, §8.3).
- Workers island `tests-workers/` stays on vitest 4.1.10 (pool-workers peer `^4.1.0`, LD-13);
  everything else runs vitest 5.0.0-beta.6.
- All devDependencies exact-pinned (no `^`/`~`); the only range is the optional peer
  `@opentelemetry/api ^1.9.1` (LD-08).
- Rust is not used anywhere (LD-03). Standing user directive: if Rust ever enters, use Rust beta 1.98.

## Layout
- `packages/modern-debug/` — the only publishable package (4 subpath entries).
- `tests-workers/` — workerd island. `bench/` — mitata suites (0.7.0). `docs/` — VitePress (0.9.0).
- `fixtures/debug-golden/` — captured `debug` 4.4.3 outputs for the differential suite.
