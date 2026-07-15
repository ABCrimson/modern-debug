// Runtime-matrix smoke (§8.4): runs unchanged on Node, Bun, and Deno 2 against the BUILT
// dist. Exits non-zero on any mismatch. CI invokes:
//   node tests-runtimes/smoke.mjs · bun tests-runtimes/smoke.mjs · deno run -A tests-runtimes/smoke.mjs
import compat from '../packages/modern-debug/dist/compat.js'
import {
  configure,
  createDebug,
  disable,
  enable,
  enabled,
} from '../packages/modern-debug/dist/index.js'
import { scope, scopeFields } from '../packages/modern-debug/dist/node.js'

let failures = 0
const check = (name, cond) => {
  if (cond) {
    console.log('ok:', name)
  } else {
    failures++
    console.error('FAIL:', name)
  }
}

// matcher grammar
enable('app:*,-app:secret')
check('wildcard enabled', enabled('app:db'))
check('negation wins', !enabled('app:secret'))
check('non-match disabled', !enabled('other'))

// ndjson emit
const lines = []
configure({ sink: (l) => lines.push(l), format: 'ndjson' })
const d = createDebug('app:db')
d('hello', { n: 1 })
const rec = JSON.parse(lines[0])
check(
  'ndjson shape',
  rec.ns === 'app:db' && rec.msg === 'hello' && rec.n === 1 && typeof rec.t === 'number',
)

// levels
d.warn('careful')
check('warn sev 40', JSON.parse(lines[1]).sev === 40)

// pretty
configure({ sink: (l) => lines.push(l), format: 'pretty', time: 'none' })
d('plain')
check('pretty line', lines[2] === 'app:db plain')

// ALS scope (node:async_hooks on every matrix runtime)
configure({ sink: (l) => lines.push(l), format: 'ndjson' })
scope({ req: 'r1' }, () => {
  d('scoped')
  check('scopeFields inside', scopeFields()?.req === 'r1')
})
check('scope fields on record', JSON.parse(lines[3]).req === 'r1')

// compat surface — an overridden log receives PRE-format args (debug parity; the %s/%d pass
// happens in the default util-backed log)
compat.enable('c:*')
const cd = compat('c:x')
let raw = []
cd.log = (...args) => {
  raw = args
}
cd('value %s %d', 'str', 42)
check(
  'compat log override gets pre-format args',
  String(raw[0]).includes('c:x value %s %d') && raw[1] === 'str' && raw[2] === 42,
)

const hasUtil = typeof process.getBuiltinModule === 'function'
if (hasUtil) {
  const cd2 = compat('c:y')
  const original = process.stderr.write
  let out = ''
  process.stderr.write = (chunk) => {
    out += String(chunk)
    return true
  }
  try {
    cd2('fmt %s %d', 'str', 42)
  } finally {
    process.stderr.write = original
  }
  check('compat default log formats via util', out.includes('c:y fmt str 42'))
} else {
  console.log(
    'note: process.getBuiltinModule absent — compat default log is console passthrough here',
  )
}

configure({})
disable()
compat.disable()

const runtime = globalThis.Bun
  ? `bun ${globalThis.Bun.version}`
  : globalThis.Deno
    ? `deno ${globalThis.Deno.version.deno}`
    : `node ${process.version}`
if (failures > 0) {
  console.error(`${failures} smoke failures on ${runtime}`)
  process.exit(1)
}
console.log(`runtime smoke: all green on ${runtime}`)
