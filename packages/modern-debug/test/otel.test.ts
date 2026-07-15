import { type Span, trace } from '@opentelemetry/api'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configure, createDebug, disable, enable } from '../src/index.ts'
import { traceFields, withTraceContext } from '../src/otel.ts'

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c'
const SPAN_ID = 'b7ad6b7169203331'
const fakeSpan = {
  spanContext: () => ({ traceId: TRACE_ID, spanId: SPAN_ID, traceFlags: 1 }),
} as unknown as Span

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

describe('/otel (§5.3) — ordering matters: pre-install tests first', () => {
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
})
