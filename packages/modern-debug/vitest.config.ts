import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // --expose-gc powers the WeakRef-absent retention discriminator (test/registry.test.ts);
    // forks pinned explicitly — worker threads reject V8 flags in execArgv. execArgv is a
    // top-level option on the vitest 5 line.
    pool: 'forks',
    execArgv: ['--expose-gc'],
    coverage: {
      include: ['src/**'],
      // §8.7: ≥95% lines on matcher/env/formatters, ≥90% package-wide.
      thresholds: {
        lines: 90,
        'src/matcher.ts': { lines: 95 },
        'src/env.ts': { lines: 95 },
        'src/format-pretty.ts': { lines: 95 },
        'src/format-ndjson.ts': { lines: 95 },
      },
    },
  },
})
