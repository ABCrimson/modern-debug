import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Coverage is a root-only option: it applies across projects, and `pnpm coverage` runs it
    // over the node project alone.
    coverage: {
      include: ['src/**/*.ts'], // not the hand-written compat-cjs.d.cts (v8 remap cannot parse its import attribute)
      // §8.7: ≥95% lines on matcher/env/formatters, ≥90% package-wide.
      thresholds: {
        lines: 90,
        'src/matcher.ts': { lines: 95 },
        'src/env.ts': { lines: 95 },
        'src/format-pretty.ts': { lines: 95 },
        'src/format-ndjson.ts': { lines: 95 },
      },
    },
    projects: [
      {
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/**/*.test.ts'],
          // --expose-gc powers the WeakRef-absent retention discriminator (test/registry.test.ts);
          // forks pinned explicitly — worker threads reject V8 flags in execArgv.
          pool: 'forks',
          execArgv: ['--expose-gc'],
        },
      },
      {
        // §8.4 browser leg: real chromium via playwright. Kept out of `pnpm verify` (the `test`
        // script selects `--project node`) — CI runs it as its own job (§10) after
        // `playwright install chromium`.
        test: {
          name: 'browser',
          include: ['test-browser/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
