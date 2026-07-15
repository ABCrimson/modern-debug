import { defineConfig } from 'vitest/config'

// Node-side harness driving RAW workerd via miniflare — the pool masks compat flags for its
// own runner, so the §5.4 nodejs_compat absence path can only be proven here.
export default defineConfig({
  test: {
    include: ['test-miniflare/**/*.test.ts'],
    testTimeout: 30000,
  },
})
