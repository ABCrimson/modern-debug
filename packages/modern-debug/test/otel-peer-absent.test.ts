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
    const e = await import('../src/otel.ts').then(
      () => null,
      (x: unknown) => x,
    )
    expect(e).toBeInstanceOf(Error)
    expect((e as Error).message).toMatch(/optional peer/)
    // The original load failure survives as the cause; vitest wraps the mock factory's
    // error once more, hence cause.cause.
    expect(((e as Error).cause as Error | undefined)?.cause).toMatchObject({
      message: expect.stringMatching(/Cannot find package/),
    })
  })
})
