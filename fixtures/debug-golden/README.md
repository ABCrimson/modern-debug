# fixtures/debug-golden

Captured outputs from `debug` 4.4.3 (the LD-04 oracle) and the case table for the differential suite (spec §8.3).

- `colors.json` (`node capture-colors.mjs`): color assignments per namespace (LD-06 hash → ANSI-256 palette index). Gates LD-06 in `packages/modern-debug/test/format-pretty.test.ts`.
- `format-cases.ts`: printf formatter cases (`%s %d %i %f %j %o %O %%` + custom). Feeds `packages/modern-debug/test/compat-golden.test.ts`, which byte-compares `/compat` against LIVE `debug` 4.4.3 (DEBUG_HIDE_DATE, fresh instance per case, so the diff is always +0ms).
- `format-golden.json` (`node capture-format.ts`): a non-gating review snapshot of those outputs (DECISIONS G-11).
