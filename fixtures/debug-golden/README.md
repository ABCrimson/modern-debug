# fixtures/debug-golden

Captured outputs from `debug` 4.4.3 — the oracle for the differential suite (spec §8.3).

- Color assignments per namespace (LD-06 hash → ANSI-256 palette index)
- Printf formatter outputs (`%s %d %i %f %j %o %O %%` + custom)
- Diff-timing shape with timestamps normalized

Captured at 0.2.0 (colors) and 0.5.0 (full compat surface) by scripts committed alongside the
fixtures. `/compat` output must byte-match these after timestamp normalization.
