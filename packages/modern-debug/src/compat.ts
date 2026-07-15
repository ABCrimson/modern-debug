// §5.2: debug 4.4.3 API surface. Behavioral parity is defined by the golden differential
// suite (§8.3), which runs the live debug oracle next to this module. The printf second
// pass and %o/%O go through node:util (via process.getBuiltinModule) where available —
// exactly what debug does on Node; elsewhere a minimal JSON fallback applies (documented
// divergence: debug itself splits behavior per platform the same way).
import { COLORS } from './format-pretty.ts'
import { compile, type Matcher, matches } from './matcher.ts'

export interface CompatDebugger {
  (...args: unknown[]): void
  namespace: string
  // Reads are always boolean (@types/debug parity); assigning null clears the override
  // internally, exactly like debug 4.4.3's enableOverride.
  enabled: boolean
  useColors: boolean
  color: number | string
  inspectOpts: Record<string, unknown>
  diff: number
  prev: number | undefined
  curr: number | undefined
  log?: ((...args: unknown[]) => unknown) | undefined
  extend(namespace: string, delimiter?: string): CompatDebugger
  destroy(): void
}

type Formatter = (this: CompatDebugger, val: unknown) => string

export interface CompatDebug {
  (namespace: string): CompatDebugger
  debug: CompatDebug
  default: CompatDebug
  coerce(val: unknown): unknown
  enable(namespaces: string): void
  disable(): string
  enabled(name: string): boolean
  humanize(ms: number): string
  names: string[]
  skips: string[]
  formatters: Record<string, Formatter | undefined>
  selectColor(namespace: string): number | string
  colors: (number | string)[]
  inspectOpts: Record<string, unknown>
  log(...args: unknown[]): unknown
  save(namespaces: string): void
  load(): string | undefined
  useColors(): boolean
}

const nodeUtil = (() => {
  try {
    return (
      process as unknown as { getBuiltinModule?: (id: string) => typeof import('node:util') }
    ).getBuiltinModule?.('node:util')
  } catch {
    return undefined
  }
})()

// inspectOpts from DEBUG_* env vars, coerced exactly like debug/src/node.js.
const inspectOpts: Record<string, unknown> = {}
try {
  if (typeof process !== 'undefined' && process.env) {
    for (const key of Object.keys(process.env)) {
      if (!/^debug_/i.test(key)) continue
      const prop = key
        .substring(6)
        .toLowerCase()
        .replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())
      const raw = process.env[key] as string
      let val: unknown
      if (/^(yes|on|true|enabled)$/i.test(raw)) val = true
      else if (/^(no|off|false|disabled)$/i.test(raw)) val = false
      else if (raw === 'null') val = null
      else val = Number(raw)
      inspectOpts[prop] = val
    }
  }
} catch {
  // no env access — defaults apply.
}

function coerce(val: unknown): unknown {
  if (val instanceof Error) return val.stack || val.message
  return val
}

// ms fmtShort, inlined (§5.2: humanize without the ms package).
const SEC = 1000
const MIN = 60000
const HOUR = 3600000
const DAY = 86400000
function humanize(ms: number): string {
  const abs = Math.abs(ms)
  if (abs >= DAY) return `${Math.round(ms / DAY)}d`
  if (abs >= HOUR) return `${Math.round(ms / HOUR)}h`
  if (abs >= MIN) return `${Math.round(ms / MIN)}m`
  if (abs >= SEC) return `${Math.round(ms / SEC)}s`
  return `${ms}ms`
}

function useColors(): boolean {
  if ('colors' in createDebug.inspectOpts) return Boolean(createDebug.inspectOpts.colors)
  try {
    return typeof process !== 'undefined' && process.stderr?.isTTY === true
  } catch {
    return false
  }
}

function selectColor(namespace: string): number | string {
  let hash = 0
  for (let i = 0; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i)
    hash |= 0
  }
  const palette = createDebug.colors
  return palette[Math.abs(hash) % palette.length] as number | string
}

function getDate(): string {
  if (createDebug.inspectOpts.hideDate) return ''
  return `${new Date().toISOString()} `
}

function formatArgs(this: CompatDebugger, args: unknown[]): void {
  const name = this.namespace
  if (this.useColors) {
    const c = this.color
    const colorCode = `[3${typeof c === 'number' && c < 8 ? c : `8;5;${c}`}`
    const prefix = `  ${colorCode};1m${name} [0m`
    args[0] = prefix + String(args[0]).split('\n').join(`\n${prefix}`)
    args.push(`${colorCode}m+${humanize(this.diff)}[0m`)
  } else {
    args[0] = `${getDate()}${name} ${args[0]}`
  }
}

function log(...args: unknown[]): unknown {
  if (nodeUtil) {
    return process.stderr.write(
      `${nodeUtil.formatWithOptions(createDebug.inspectOpts as never, ...(args as [string]))}\n`,
    )
  }
  // Non-Node runtimes: hand args to the console like debug's browser build does.
  console.error(...args)
  return true
}

function save(namespaces: string): void {
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (namespaces) process.env.DEBUG = namespaces
      else delete process.env.DEBUG
      return
    }
  } catch {
    // fall through to storage.
  }
  try {
    const storage = (
      globalThis as {
        localStorage?: { setItem(k: string, v: string): void; removeItem(k: string): void }
      }
    ).localStorage
    if (namespaces) storage?.setItem('debug', namespaces)
    else storage?.removeItem('debug')
  } catch {
    // nowhere to persist.
  }
}

function load(): string | undefined {
  try {
    // debug's node build reads only the env var — never storage (Node ≥26 emits
    // ExperimentalWarning on bare localStorage access). Storage is the non-Node
    // fallback, mirroring save().
    if (typeof process !== 'undefined' && process.env) return process.env.DEBUG
  } catch {
    // fall through to storage.
  }
  try {
    return (
      (
        globalThis as { localStorage?: { getItem(k: string): string | null } }
      ).localStorage?.getItem('debug') ?? undefined
    )
  } catch {
    return undefined
  }
}

function destroy(): void {
  console.warn('debug.destroy() is a deprecated no-op')
}

let matcher: Matcher = compile('')
let namespaces: string | undefined

function enable(pattern: string): void {
  createDebug.save(pattern)
  namespaces = pattern
  matcher = compile(typeof pattern === 'string' ? pattern : '')
  createDebug.names = matcher.allow as string[]
  createDebug.skips = matcher.deny as string[]
}

function disable(): string {
  const previous = [...createDebug.names, ...createDebug.skips.map((s) => `-${s}`)].join(',')
  createDebug.enable('')
  return previous
}

function createDebugger(namespace: string): CompatDebugger {
  let prevTime: number | undefined
  let enableOverride: boolean | null = null
  let namespacesCache: string | undefined
  let enabledCache = false

  const debug = ((...args: unknown[]): void => {
    const self = debug
    if (!self.enabled) return

    const curr = Number(new Date())
    const ms = curr - (prevTime ?? curr)
    self.diff = ms
    self.prev = prevTime
    self.curr = curr
    prevTime = curr

    args[0] = createDebug.coerce(args[0])
    if (typeof args[0] !== 'string') args.unshift('%O')

    let index = 0
    args[0] = (args[0] as string).replace(/%([a-zA-Z%])/g, (match, format: string) => {
      if (match === '%%') return '%'
      index++
      const formatter = createDebug.formatters[format]
      if (typeof formatter === 'function') {
        const val = args[index]
        match = formatter.call(self, val)
        args.splice(index, 1)
        index--
      }
      return match
    })

    formatArgs.call(self, args)
    const logFn = self.log || createDebug.log
    logFn.apply(self, args)
  }) as CompatDebugger

  debug.namespace = namespace
  debug.useColors = createDebug.useColors()
  debug.color = createDebug.selectColor(namespace)
  debug.inspectOpts = { ...createDebug.inspectOpts }
  debug.extend = extend
  debug.destroy = destroy

  Object.defineProperty(debug, 'enabled', {
    enumerable: true,
    configurable: false,
    get(): boolean {
      if (enableOverride !== null) return enableOverride
      if (namespacesCache !== namespaces) {
        namespacesCache = namespaces
        enabledCache = matches(matcher, namespace)
      }
      return enabledCache
    },
    set(v: boolean | null) {
      enableOverride = v
    },
  })

  return debug
}

function extend(this: CompatDebugger, namespace: string, delimiter?: string): CompatDebugger {
  const child = createDebugger(
    this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace,
  )
  child.log = this.log
  return child
}

const formatters: Record<string, Formatter | undefined> = {}
if (nodeUtil) {
  formatters.o = function (this: CompatDebugger, v: unknown): string {
    this.inspectOpts.colors = this.useColors
    return nodeUtil
      .inspect(v, this.inspectOpts as never)
      .split('\n')
      .map((str) => str.trim())
      .join(' ')
  }
  formatters.O = function (this: CompatDebugger, v: unknown): string {
    this.inspectOpts.colors = this.useColors
    return nodeUtil.inspect(v, this.inspectOpts as never)
  }
} else {
  // Minimal universal fallback (debug's own browser build diverges here too).
  const json = (v: unknown): string => {
    try {
      return JSON.stringify(v) ?? String(v)
    } catch {
      return String(v)
    }
  }
  formatters.j = json
  formatters.o = json
  formatters.O = json
}

const createDebug = Object.assign(createDebugger, {
  coerce,
  enable,
  disable,
  enabled: (name: string): boolean => matches(matcher, name),
  humanize,
  names: [] as string[],
  skips: [] as string[],
  formatters,
  selectColor,
  colors: [...COLORS] as (number | string)[],
  inspectOpts,
  log,
  save,
  load,
  useColors,
}) as CompatDebug

createDebug.debug = createDebug
createDebug.default = createDebug

createDebug.enable(createDebug.load() ?? '')

export default createDebug
