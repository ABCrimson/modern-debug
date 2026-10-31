// A diagnostic logger must never crash the caller over the shape of logged data:
// BigInt, circular refs, and throwing toJSON degrade to a marker instead of throwing.
// An own toJSON can also make stringify return a non-object (a string, an array, or
// undefined); that degrades to the same marker so the fields envelope is always an object.
export const safeJson = (value: unknown): string => {
  try {
    const s = JSON.stringify(value)
    if (s?.[0] === '{') return s
  } catch {}
  return '{"$fields":"unserializable"}'
}
