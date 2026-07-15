# Migration from debug

Two paths: alias the whole dependency tree, or import the compat surface directly.

## The alias (recommended — migrates your transitive tree too)

::: code-group

```json [package.json (pnpm)]
{
  "pnpm": {
    "overrides": {
      "debug": "npm:modern-debug@^1"
    }
  }
}
```

```json [package.json (npm)]
{
  "overrides": {
    "debug": "npm:modern-debug@^1"
  }
}
```

```json [package.json (bun)]
{
  "overrides": {
    "debug": "npm:modern-debug@^1"
  }
}
```

:::

Bun ≥1.1 honors the same top-level `"overrides"` field as npm — the `"pnpm"`-nested shape
above is pnpm-specific and bun will not read it. Yarn's equivalent is the top-level
`"resolutions"` field; bun also understands `"resolutions"` if that's what your tree already
uses.

Every `require('debug')` in your tree — express, send, socket.io, all of it — now resolves the
`modern-debug/compat` factory: default-export printf API, `%s %d %i %f %j %o %O %%`, custom
`debug.formatters`, `.enabled`, `.extend()`, `.log` overrides, `enable/disable/names/skips`,
the same color per namespace, the same output shape. Parity is enforced by a golden
differential suite that runs real `debug` 4.4.3 next to compat and byte-compares.

This is validated against real dependents in-repo: express 5.2.1, send 1.2.1 and
socket.io 4.8.3 request/handshake cycles logging through the override.

::: warning ESM consumers of the alias
`import debug from 'debug'` under the alias is not supported in v1 — the alias serves CJS
`require` (which is how the `debug` ecosystem consumes it). ESM code should import
`modern-debug/compat` directly.
:::

## Direct compat import

```ts
import debug from 'modern-debug/compat'

const log = debug('app:db')
log('found %d rows in %s', 12, 'users')
```

::: warning Mixing the alias with a direct dependency (npm/yarn layouts)
If you use the alias above **and** add `modern-debug` as a direct dependency (e.g. for the
ESM import shown here), check your package manager's layout. Under **npm** or **yarn**,
the override materializes `modern-debug` as a physical copy at `node_modules/debug` and a
direct `modern-debug` dependency installs as a **second**, separate physical copy — two
compat instances, two matchers. The `DEBUG` env var still reaches both (each instance reads
it independently at load), but programmatic `enable()`/`disable()`/`configure()` calls made
on one instance are **not** visible to the other. **pnpm** dedupes both specifiers to a
single store entry, so this split does not happen there — control namespaces via `DEBUG`,
not cross-instance `enable()`, if your install can't guarantee a single instance.
:::

## Grammar guarantee

The `DEBUG` pattern grammar is exactly `debug` 4.4.3's: comma/whitespace separators, `*`
wildcards, `-` negation (checked first), everything else literal. It is enforced by an
81-row oracle table plus a 5000-pair random differential suite against the real package —
and the matcher is linear-time, so hostile multi-wildcard patterns cannot freeze your
process (a real ReDoS in naive regex ports).

## What you gain by moving to the core API

The core API (`createDebug`) drops printf in favor of structured fields — the record IS the
data. See [Structured logging](./structured-logging). Fully greppable migration:
`debug('user %s logged in', id)` becomes `log('user logged in', { id })`.
