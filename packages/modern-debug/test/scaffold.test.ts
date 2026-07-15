import { describe, expect, it } from 'vitest'

describe('phase 0 scaffold', () => {
  it('all four entry modules load', async () => {
    await expect(import('../src/index.ts')).resolves.toBeDefined()
    await expect(import('../src/compat.ts')).resolves.toBeDefined()
    await expect(import('../src/otel.ts')).resolves.toBeDefined()
    await expect(import('../src/node.ts')).resolves.toBeDefined()
  })
})
