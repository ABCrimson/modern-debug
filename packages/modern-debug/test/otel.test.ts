import { INVALID_SPAN_CONTEXT, type Span, trace } from '@opentelemetry/api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'
import { traceFields, withTraceContext } from '../src/otel.ts'

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c'
const SPAN_ID = 'b7ad6b7169203331'
const fakeSpan = {
  spanContext: () => ({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: 1 }),
} as unknown as Span
// What the API's NoopTracer makes active when a context manager runs without an SDK.
const invalidSpan = trace.wrapSpanContext(INVALID_SPAN_CONTEXT)
// wrapSpanContext does not check the hex contract; validation must reject this one too.
const nonHexSpan = trace.wrapSpanContext({ traceId: 'a"b', spanId: 'x\ny', traceFlags: 1 })

const sunk: string[] = []
const sink = (line: string): void => {
  sunk.push(line)
}

beforeEach(() => {
  sunk.length = 0
  configure({ sink, format: 'ndjson' })
  enable('otel')
})

afterEach(() => {
  configure({})
  disable()
  vi.restoreAllMocks()
})

const parsed = (): Record<string, unknown> => JSON.parse(sunk[0] as string)

// shuffle: false — the first test needs a fresh, uninstalled hook slot, and nothing resets
// it; an explicit suite option wins over a global --sequence.shuffle.
// biome-ignore lint/correctness/usePlaywrightValidDescribeCallback: vitest's describe(name, options, fn) overload; options can only go second
describe('/otel (§5.3) — pre-install test must run first', { shuffle: false }, () => {
  it('records carry no trace ids before withTraceContext() is installed', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(fakeSpan)
    createDebug('otel')('m')
    expect('trace_id' in parsed()).toBe(false)
  })

  it('traceFields() is empty without an active span', () => {
    expect(traceFields()).toEqual({})
  })

  it('traceFields() reads the active span context', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(fakeSpan)
    expect(traceFields()).toEqual({ trace_id: TRACE_ID, span_id: SPAN_ID })
  })

  it('withTraceContext() injects ids into NDJSON records in envelope order', () => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(fakeSpan)
    withTraceContext()
    createDebug('otel')('m')
    expect(sunk[0]).toContain(`"msg":"m","trace_id":"${TRACE_ID}","span_id":"${SPAN_ID}"`)
  })

  it('after installation, records without an active span carry no ids', () => {
    withTraceContext()
    createDebug('otel')('m')
    expect('trace_id' in parsed()).toBe(false)
  })

  it.for([
    ['the all-zero', invalidSpan],
    ['a non-hex', nonHexSpan],
  ] as const)('%s span context is ignored by traceFields() and records', ([, span]) => {
    vi.spyOn(trace, 'getActiveSpan').mockReturnValue(span)
    expect(traceFields()).toEqual({})
    withTraceContext()
    createDebug('otel')('m')
    expect('trace_id' in parsed()).toBe(false)
  })
})
