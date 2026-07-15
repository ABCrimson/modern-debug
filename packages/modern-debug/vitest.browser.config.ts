import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

// §8.4 browser leg: real chromium via playwright. Kept out of `pnpm verify` — CI runs it as
// its own job (§10) after `playwright install chromium`.
export default defineConfig({
  test: {
    include: ['test-browser/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
})
