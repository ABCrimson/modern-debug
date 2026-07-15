# Runtime matrix

Identical behavior everywhere is proven in CI, not claimed:

| Runtime | How it is exercised |
| --- | --- |
| Node 24.18 LTS + 26.5 Current | full 148-test suite + smoke, on ubuntu/windows/macos |
| Bun | runtime smoke against the built dist (setup-bun) |
| Deno 2 | runtime smoke against the built dist (setup-deno) |
| Cloudflare workerd | in-workerd suite (vitest-pool-workers) + raw miniflare boots with `nodejs_compat` on **and** off |
| Evergreen browsers | chromium suite via vitest browser mode + playwright |

## Per-runtime notes

- **Node / Bun / Deno 2** — everything works, including `/compat`'s byte-parity printf path
  (all three provide `process.getBuiltinModule('node:util')`).
- **Deno without `--allow-env`** — the env ladder treats denied permission as "unset" and
  falls through; no prompt, no crash.
- **Workers** — set `DEBUG` via `globalThis.DEBUG` (bindings have no ambient env);
  the default sink uses `console.error`. `modern-debug/node` needs `nodejs_compat`.
- **Browsers** — enable via `localStorage.debug = 'app:*'`, exactly like `debug`.
  `/compat` uses console passthrough there, mirroring `debug`'s own browser build.
