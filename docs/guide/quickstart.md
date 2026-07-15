# Quickstart

```sh
pnpm add modern-debug
```

```ts
import { createDebug } from 'modern-debug'

const log = createDebug('app:db')

log('connected', { host: 'db-1', pool: 8 })
log.warn('slow query', { ms: 240 })
log.error('connection lost')
```

Enable namespaces exactly like `debug`:

```sh
DEBUG=app:*,-app:secrets node server.js
```

On a TTY you get the classic colored output with `+Nms` diffs — same color per namespace as
`debug` gave you. Everywhere else (pipes, containers, CI) each line is one flat NDJSON record:

```json
{"t":1752170000000,"ns":"app:db","msg":"connected","host":"db-1","pool":8}
{"t":1752170000241,"ns":"app:db","msg":"slow query","sev":40,"ms":240}
```

## Configuring

```ts
import { configure } from 'modern-debug'

configure({
  format: 'ndjson', // 'pretty' | 'ndjson' | 'auto' (default: auto — TTY ⇒ pretty)
  sink: (line) => myTransport.push(line), // default: stderr
  time: 'diff', // pretty only: 'diff' | 'epoch' | 'none'
  colors: true, // pretty only: default TTY-detect
})
```

`configure()` replaces the whole configuration; `configure({})` restores every default.
`MODERN_DEBUG_FORMAT=pretty|ndjson` overrides auto-detection without touching code.

## Enablement resolution

Highest to lowest: explicit `enable(pattern)` → `process.env.DEBUG` → `globalThis.DEBUG`
(Workers escape hatch) → `localStorage.debug` (browsers) → disabled.

## Instances

```ts
const db = createDebug('app:db')
const q = db.extend('query') // app:db:query
const scoped = db.fields({ shard: 3 }) // every line carries shard:3
q.enabled // live boolean against the current pattern
```
