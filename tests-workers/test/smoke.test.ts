import { describe, expect, it } from 'vitest'

describe('workers island scaffold', () => {
  it('runs inside workerd', () => {
    // Workers-specific globals prove the pool is real, not a Node fallback.
    expect(new Response('ok').status).toBe(200)
    expect(globalThis.caches).toBeDefined()
  })
})
