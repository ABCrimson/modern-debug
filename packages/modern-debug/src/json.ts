// A diagnostic logger must never crash the caller over the shape of logged data:
// BigInt, circular refs, and throwing toJSON degrade to a marker instead of throwing.
export const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return '{"$fields":"unserializable"}'
  }
}
