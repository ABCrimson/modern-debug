// Cross-entry hook slots (§5.3/§5.4). /node and /otel register providers here; core reads
// them per emit. A dedicated tiny module keeps the subpath bundles from pulling core in —
// rolldown splits this into a shared chunk all entries import (live bindings).
import type { DebugFields } from './index.ts'

export let ctxFields: (() => DebugFields | undefined) | undefined
export let traceIds: (() => readonly [traceId: string, spanId: string] | undefined) | undefined

export function setCtxFields(provider: () => DebugFields | undefined): void {
  ctxFields = provider
}

export function setTraceIds(provider: () => readonly [string, string] | undefined): void {
  traceIds = provider
}
