// LD-07: hand-rolled NDJSON envelope serializer. Envelope keys in fixed order
// (t, ns, msg, sev?, trace_id?, span_id?), user fields spread flat after — reserved
// keys in user fields are dropped so the envelope always wins on parse.
import type { DebugFields } from './index.ts'
import { safeJson } from './json.ts'

// Escape fast path (§6): charCode scan; strings without quotes/backslash/control chars or
// surrogates pass through untouched, everything else falls back to JSON.stringify (whose
// ES2019 well-formed mode escapes lone surrogates — the fast path must never diverge).
const esc = (s: string): string => {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 32 || c === 34 || c === 92 || (c >= 55296 && c <= 57343)) {
      return JSON.stringify(s).slice(1, -1)
    }
  }
  return s
}

export function formatNdjson(
  ns: string,
  msg: string,
  sev: number | undefined,
  traceId: string | undefined,
  spanId: string | undefined,
  fields: DebugFields | undefined,
): string {
  let line = `{"t":${Date.now()},"ns":"${esc(ns)}","msg":"${esc(msg)}"`
  if (sev !== undefined) line += `,"sev":${sev}`
  if (traceId !== undefined) line += `,"trace_id":"${traceId}","span_id":"${spanId}"`
  if (fields != null) {
    // Rest-destructure drops reserved envelope keys so the envelope always wins on parse.
    // try/catch: destructuring invokes user getters — a logger never crashes over data shape.
    let body: string
    try {
      const { t: _t, ns: _n, msg: _m, sev: _s, trace_id: _a, span_id: _b, ...clean } = fields
      body = safeJson(clean)
    } catch {
      body = '{"$fields":"unserializable"}'
    }
    if (body.length > 2) line += `,${body.slice(1, -1)}`
  }
  return `${line}}`
}
