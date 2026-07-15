import { afterEach, describe, expect, it, vi } from 'vitest'

/** LD-08 / §5.3: absent optional peer must fail at import time with a clear install hint. */
describe('/otel with the peer missing', () => {
  afterEach(() => {
    vi.doUnmock('@opentelemetry/api')
    vi.resetModules()
  })

  it('import rejects with an install hint naming the peer', async () => {
    vi.resetModules()
    vi.doMock('@opentelemetry/api', () => {
      throw new Error("Cannot find package '@opentelemetry/api'")
    })
    await expect(import('../src/otel.ts')).rejects.toThrow(/optional peer/)
  })
})
