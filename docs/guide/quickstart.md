# Quickstart

## Install

::: warning Pre-release
modern-debug is not on npm yet (checked 2026-10-30). Until 1.0.0 ships, build and pack it
locally.
:::

Build and pack the package from the repository. Working on the repo needs Node ≥ 24.22.2 and
pnpm 12.17.0 (the `packageManager` pin; pnpm self-switches to it):

```sh
git clone https://github.com/ABCrimson/modern-debug
cd modern-debug
pnpm install
pnpm -C packages/modern-debug build
pnpm -C packages/modern-debug pack
```

`pack` writes a `modern-debug-<version>.tgz` tarball into `packages/modern-debug/`. Install that
file in your project:

```sh
pnpm add /path/to/modern-debug/packages/modern-debug/modern-debug-<version>.tgz
```

Your project needs Node ≥ 22.13.0 (`engines.node`). Once 1.0.0 is on npm, the install is
`pnpm add modern-debug`.

## First logger

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

On a TTY you get the classic colored output with `+Nms` diffs, colored by `debug`'s 256-color
namespace hash (the color `debug` picks when `supports-color` is installed). Everywhere else
(pipes, containers, CI) each line is one flat NDJSON record:

```jsonl
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
