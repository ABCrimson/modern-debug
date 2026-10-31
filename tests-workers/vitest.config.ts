import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'
import { COMPATIBILITY_DATE } from './workerd-compat.ts'

// Two projects, one run. The plugin sits on the `pool` project only: it rewrites that
// project's pool, resolve conditions and SSR target, so a root-level plugin would leak
// into `miniflare`.
export default defineConfig({
  test: {
    projects: [
      {
        // Runs the suites inside workerd through the @cloudflare/vitest-plugin pool.
        plugins: [
          cloudflareTest({
            miniflare: {
              compatibilityDate: COMPATIBILITY_DATE,
              compatibilityFlags: ['nodejs_compat'],
            },
          }),
        ],
        test: {
          name: 'pool',
          include: ['test/**/*.test.ts'],
        },
      },
      {
        // Node-side harness driving RAW workerd via miniflare — the pool masks compat flags
        // for its own runner, so the §5.4 paths without nodejs_compat (nodejs_als only, and
        // neither) can only be proven here. The suites also pin the LD-11 default sink's
        // stream choice (process.stderr with Node.js compatibility, console.error without;
        // G-08).
        test: {
          name: 'miniflare',
          include: ['test-miniflare/**/*.test.ts'],
          testTimeout: 30000,
        },
      },
    ],
  },
})
