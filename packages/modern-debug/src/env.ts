// LD-09: environment resolution ladder, every rung feature-detected and exception-guarded,
// empty strings skipped. process.env.DEBUG (Node/Bun/Deno) > globalThis.DEBUG (Workers
// escape hatch) > localStorage.debug (browsers, privacy modes) > undefined. The storage
// rung is browser-scoped (G-14): where process.env exists it is never consulted — Node ≥26
// emits ExperimentalWarning on bare localStorage access, and debug's node build is env-only.

const pick = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined

const readEnv = (key: string): string | undefined => {
  try {
    if (typeof process !== 'undefined') return pick(process.env?.[key])
  } catch {
    // no env access (Deno without --allow-env) — treat as unset.
  }
  return undefined
}

export function resolveEnvPattern(): string | undefined {
  const fromEnv = readEnv('DEBUG')
  if (fromEnv !== undefined) return fromEnv
  try {
    const fromGlobal = pick((globalThis as Record<string, unknown>).DEBUG)
    if (fromGlobal !== undefined) return fromGlobal
  } catch {
    // hostile DEBUG accessor — next rung.
  }
  try {
    if (typeof process === 'undefined' || !process.env) {
      return pick(
        (
          globalThis as { localStorage?: { getItem(key: string): string | null } }
        ).localStorage?.getItem('debug'),
      )
    }
  } catch {
    // localStorage blocked (privacy mode) — disabled.
  }
  return undefined
}

// LD-10: MODERN_DEBUG_FORMAT env override; only exact valid values count.
export function resolveEnvFormat(): 'pretty' | 'ndjson' | undefined {
  const value = readEnv('MODERN_DEBUG_FORMAT')
  return value === 'pretty' || value === 'ndjson' ? value : undefined
}
