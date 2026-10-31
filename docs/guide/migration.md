# Migration from debug

::: warning Pre-release
modern-debug is not on npm yet (checked 2026-10-30). Until 1.0.0 ships, build and pack it
locally (see the [Quickstart](./quickstart)). The `npm:modern-debug@^1.0.0` alias below resolves
only after 1.0.0 is published. Until then, point the override at a built local checkout, the
form the in-repo fixture uses, in `pnpm-workspace.yaml` (build first: a `file:` install packs
only `dist`):

```yaml
overrides:
  debug: file:../modern-debug/packages/modern-debug
```

:::

Two paths: alias the whole dependency tree, or import the compat surface directly.

## The alias (recommended — migrates your transitive tree too)

::: code-group

```yaml [pnpm-workspace.yaml (pnpm)]
overrides:
  debug: npm:modern-debug@^1.0.0
```

```json [package.json (npm)]
{
  "overrides": {
    "debug": "npm:modern-debug@^1.0.0"
  }
}
```

```json [package.json (bun)]
{
  "overrides": {
    "debug": "npm:modern-debug@^1.0.0"
  }
}
```

```json [package.json (yarn, untested)]
{
  "resolutions": {
    "debug": "npm:modern-debug@^1.0.0"
  }
}
```

:::

| Package manager | Where the override lives                  | Tested in this repo             |
| --------------- | ----------------------------------------- | ------------------------------- |
| pnpm 12         | `overrides` in `pnpm-workspace.yaml`      | yes: `fixtures/alias-migration` |
| npm             | top-level `overrides` in `package.json`   | no                              |
| Bun             | top-level `overrides` in `package.json`   | no                              |
| Yarn            | top-level `resolutions` in `package.json` | no (untested)                   |

pnpm 12 reads overrides from `pnpm-workspace.yaml` and ignores `package.json#pnpm` (pnpm 12
changelog). An override nested under a `"pnpm"` key in `package.json` is not applied, so
`debug` stays unaliased.

Every `require('debug')` in your tree — express, send, socket.io, all of it — now resolves the
`modern-debug/compat` factory: default-export printf API, `%s %d %i %f %j %o %O %%`, custom
`debug.formatters`, `debug.formatArgs` overrides, `.enabled`, `.extend()`, `.log` overrides,
`enable/disable/names/skips`, the same color per namespace, the same output shape. Parity is
enforced by a golden differential suite that runs real `debug` 4.4.3 next to compat and
byte-compares. The gaps are listed in [Divergence notes](./divergence).

The in-repo fixture `fixtures/alias-migration` validates the pnpm recipe against real
dependents: express 5.3.0, send 1.2.1, socket.io 4.8.4 and socket.io-client 4.8.4 run
request and handshake cycles that log through the override. Its check asserts that `debug`
resolved from express, send, socket.io, socket.io-client, router, body-parser, finalhandler,
engine.io and socket.io-adapter is modern-debug's `dist/compat-cjs.js`, and that no registry
`debug` is installed.

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
