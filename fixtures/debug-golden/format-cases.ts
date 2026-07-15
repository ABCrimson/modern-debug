// Shared golden case table (§8.3). Consumed by capture-format.ts (fixture artifact) and by
// the differential suite (live-oracle byte compare). Factories return FRESH args per run —
// debug's formatter pass mutates the args array in place.

export interface FormatCase {
  readonly id: string
  readonly ns: string
  readonly make: () => unknown[]
}

const circular = (): Record<string, unknown> => {
  const o: Record<string, unknown> = { name: 'circ' }
  o.self = o
  return o
}

const deterministicError = (): Error => {
  const err = new Error('boom')
  err.stack = 'Error: boom\n    at golden-fixture:1:1'
  return err
}

export const CASES: readonly FormatCase[] = [
  { id: 'plain', ns: 'app', make: () => ['hello world'] },
  { id: 'empty-string', ns: 'app', make: () => [''] },
  { id: 'multiline', ns: 'app', make: () => ['line1\nline2\nline3'] },
  { id: 'unicode', ns: 'app:ünï', make: () => ['emoji 🔥 and код'] },
  { id: 'namespace-nested', ns: 'a:b:c:d', make: () => ['deep'] },

  { id: 's-string', ns: 'app', make: () => ['val: %s', 'x'] },
  { id: 's-number', ns: 'app', make: () => ['val: %s', 42] },
  { id: 's-bool', ns: 'app', make: () => ['val: %s', true] },
  { id: 's-null', ns: 'app', make: () => ['val: %s', null] },
  { id: 's-undefined', ns: 'app', make: () => ['val: %s', undefined] },
  { id: 's-object', ns: 'app', make: () => ['val: %s', { a: 1 }] },
  { id: 's-array', ns: 'app', make: () => ['val: %s', [1, 'two', 3]] },
  { id: 's-error', ns: 'app', make: () => ['err: %s', deterministicError()] },
  { id: 's-twice', ns: 'app', make: () => ['%s and %s', 'first', 'second'] },
  { id: 's-missing-arg', ns: 'app', make: () => ['%s and %s', 'only'] },

  { id: 'd-int', ns: 'app', make: () => ['n=%d', 42] },
  { id: 'd-float', ns: 'app', make: () => ['n=%d', 3.14] },
  { id: 'd-string', ns: 'app', make: () => ['n=%d', '5'] },
  { id: 'd-nan', ns: 'app', make: () => ['n=%d', Number.NaN] },
  { id: 'd-infinity', ns: 'app', make: () => ['n=%d', Number.POSITIVE_INFINITY] },
  { id: 'i-float', ns: 'app', make: () => ['n=%i', 3.9] },
  { id: 'i-string', ns: 'app', make: () => ['n=%i', '42px'] },
  { id: 'f-float', ns: 'app', make: () => ['n=%f', 3.14159] },
  { id: 'f-string', ns: 'app', make: () => ['n=%f', '2.5'] },

  { id: 'j-object', ns: 'app', make: () => ['data: %j', { a: 1, b: 'x' }] },
  { id: 'j-nested', ns: 'app', make: () => ['data: %j', { deep: { er: [1, 2] } }] },
  { id: 'j-circular', ns: 'app', make: () => ['data: %j', circular()] },

  { id: 'o-object', ns: 'app', make: () => ['obj: %o', { a: 1, b: { c: 2 } }] },
  { id: 'o-array', ns: 'app', make: () => ['obj: %o', [1, { x: 'y' }]] },
  { id: 'O-object', ns: 'app', make: () => ['obj: %O', { a: 1, b: { c: 2 } }] },
  { id: 'O-deep', ns: 'app', make: () => ['obj: %O', { l1: { l2: { l3: { l4: 1 } } } }] },
  { id: 'O-map', ns: 'app', make: () => ['obj: %O', new Map([['k', 'v']])] },

  { id: 'pct-escape', ns: 'app', make: () => ['literal %% here'] },
  { id: 'pct-100', ns: 'app', make: () => ['100%% done %s', 'ok'] },
  { id: 'unknown-specifier', ns: 'app', make: () => ['what %x is this', 'arg'] },

  { id: 'extra-args-string', ns: 'app', make: () => ['msg', 'extra1', 'extra2'] },
  { id: 'extra-args-object', ns: 'app', make: () => ['msg', { obj: true }, 42] },
  { id: 'first-arg-object', ns: 'app', make: () => [{ topLevel: 'object' }] },
  { id: 'first-arg-number', ns: 'app', make: () => [123] },
  { id: 'first-arg-error', ns: 'app', make: () => [deterministicError()] },
  { id: 'error-with-extra', ns: 'app', make: () => [deterministicError(), 'context'] },
] as const

/** Colored subset — shape parity for the ANSI path (prefix, multiline re-prefix, +0ms suffix). */
export const COLOR_CASE_IDS: readonly string[] = [
  'plain',
  'multiline',
  's-string',
  'namespace-nested',
]
