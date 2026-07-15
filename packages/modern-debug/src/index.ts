// Core API (§5.1): createDebug / enable / disable / enabled / configure.
// LD-05: disabled instances dispatch to one shared noop; re-evaluation only on
// enable()/configure(). LD-10: format = configure > MODERN_DEBUG_FORMAT > auto (TTY?).
// LD-15 (as documented in DECISIONS G-07/G-08): global-config module state is limited to
// the matcher singleton, the configure() snapshot, and the WeakRef re-bind registry.
import { resolveEnvFormat, resolveEnvPattern } from './env.ts'
import { formatNdjson } from './format-ndjson.ts'
import { prettyPrefix } from './format-pretty.ts'
import { ctxFields, traceIds } from './hooks.ts'
import { safeJson } from './json.ts'
import { compile, type Matcher, matches } from './matcher.ts'

export interface DebugFields {
  readonly [k: string]: unknown
}

export interface DebugFn {
  (msg: string, fields?: DebugFields): void
  warn(msg: string, fields?: DebugFields): void
  error(msg: string, fields?: DebugFields): void
  readonly ns: string
  readonly enabled: boolean
  extend(suffix: string, delimiter?: string): DebugFn
  fields(base: DebugFields): DebugFn
}

export interface Configure {
  format?: 'pretty' | 'ndjson' | 'auto'
  sink?: (line: string) => void
  time?: 'diff' | 'epoch' | 'none'
  colors?: boolean
}

type Emit = (sev: number | undefined, msg: string, fields?: DebugFields) => void
type Rebindable = DebugFn & { _r(): void }

const noop: Emit = () => {}

let matcher: Matcher | undefined
let cfg: Configure = {}

const current = (): Matcher => (matcher ??= compile(resolveEnvPattern() ?? ''))

const HAS_WEAKREF = typeof WeakRef !== 'undefined'

type FnRef = { deref(): Rebindable | undefined }
const registry = new Set<FnRef>()

const isTTY = (): boolean => typeof process !== 'undefined' && process.stderr?.isTTY === true

// LD-11 default sink, feature-detected once: real stderr where present, console elsewhere.
const defaultSink: (line: string) => void =
  typeof process !== 'undefined' && typeof process.stderr?.write === 'function'
    ? (line) => {
        process.stderr.write(`${line}\n`)
      }
    : (line) => {
        console.error(line)
      }

function makeFn(ns: string, base: DebugFields | undefined): DebugFn {
  let emit = noop
  let prev: number | undefined

  // Precedence (lowest → highest): ALS scope fields < fields() base < call fields (§5.4).
  // `?? undefined` normalizes null from untyped JS callers.
  const merge = (rawFields?: DebugFields): DebugFields | undefined => {
    const fields = rawFields ?? undefined
    const ctx = ctxFields?.()
    const low = base ? (ctx ? { ...ctx, ...base } : base) : ctx
    return low ? (fields ? { ...low, ...fields } : low) : fields
  }

  const rebind = (): void => {
    if (!matches(current(), ns)) {
      emit = noop
      return
    }
    const sink = cfg.sink ?? defaultSink
    const format =
      cfg.format && cfg.format !== 'auto'
        ? cfg.format
        : (resolveEnvFormat() ?? (isTTY() ? 'pretty' : 'ndjson'))
    if (format === 'ndjson') {
      emit = (sev, msg, fields) => {
        const ids = traceIds?.()
        sink(formatNdjson(ns, msg, sev, ids?.[0], ids?.[1], merge(fields)))
      }
    } else {
      // §6: prefix and diff decorations pre-concatenated here; per-call = one concat chain.
      const [pre, open] = prettyPrefix(ns, cfg.colors ?? isTTY())
      const mid = (msg: string, fields?: DebugFields): string => {
        const f = merge(fields)
        return f === undefined ? msg : `${msg} ${safeJson(f)}`
      }
      const time = cfg.time ?? 'diff'
      if (time === 'none') {
        emit = (_sev, msg, fields) => sink(pre + mid(msg, fields))
      } else if (time === 'epoch') {
        emit = (_sev, msg, fields) => sink(`${pre}${mid(msg, fields)} @${Date.now()}`)
      } else {
        const dOpen = open ? `${open}m+` : '+'
        const dClose = open ? 'ms[0m' : 'ms'
        emit = (_sev, msg, fields) => {
          const now = performance.now()
          const diff = now - (prev ?? now)
          prev = now
          sink(`${pre}${mid(msg, fields)} ${dOpen}${Math.round(diff)}${dClose}`)
        }
      }
    }
  }

  // §6 fallback: without WeakRef there is no registry entry — every call re-checks.
  // Last-resort guard: merge()'s spreads invoke user getters; a logger never crashes the
  // caller over data shape (G-08 rule), so a pathological throw drops the line instead.
  const send: Emit = (sev, msg, fields) => {
    if (!HAS_WEAKREF) rebind()
    try {
      emit(sev, msg, fields)
    } catch {}
  }

  const fn = Object.assign((msg: string, fields?: DebugFields) => send(undefined, msg, fields), {
    ns,
    warn: (msg: string, fields?: DebugFields): void => send(40, msg, fields),
    error: (msg: string, fields?: DebugFields): void => send(50, msg, fields),
    extend: (suffix: string, delimiter = ':'): DebugFn => makeFn(ns + delimiter + suffix, base),
    fields: (more: DebugFields): DebugFn => makeFn(ns, base ? { ...base, ...more } : more),
  })
  Object.defineProperties(fn, {
    enabled: { get: () => matches(current(), ns) },
    _r: { value: rebind },
  })

  const bound = fn as unknown as Rebindable
  if (HAS_WEAKREF) {
    registry.add(new WeakRef(bound))
    // Amortized sweep so dead refs cannot accumulate unboundedly in warm isolates
    // that never call enable()/configure() at runtime (DECISIONS G-08).
    if ((registry.size & 255) === 0) sweep(false)
  }
  bound._r()
  return bound
}

function sweep(rebind: boolean): void {
  for (const ref of registry) {
    const fn = ref.deref()
    if (!fn) {
      registry.delete(ref)
    } else if (rebind) {
      fn._r()
    }
  }
}

export function createDebug(ns: string): DebugFn {
  return makeFn(ns, undefined)
}

export function enable(pattern: string): void {
  matcher = compile(pattern)
  sweep(true)
}

export function disable(): string {
  const m = current()
  const previous = [...m.allow, ...m.deny.map((t) => `-${t}`)].join(',')
  enable('')
  return previous
}

export function enabled(ns: string): boolean {
  return matches(current(), ns)
}

/** Replace semantics: each call sets the whole config; configure({}) restores defaults. */
export function configure(opts: Configure): void {
  cfg = opts
  sweep(true)
}
