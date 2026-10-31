/**
 * The one compatibility date for every workerd boot in this island: the
 * @cloudflare/vitest-plugin pool (vitest.config.ts) and both raw-miniflare suites
 * (test-miniflare/). It equals the bundled workerd's own date: miniflare
 * 5.20261023.3-beta ships workerd 1.20261023.1, which rejects any later date. Raise it
 * only together with the miniflare pin.
 */
export const COMPATIBILITY_DATE = '2026-10-23'
