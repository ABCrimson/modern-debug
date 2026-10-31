# Request scoping

`modern-debug/node` gives every log line inside a request that request's fields, via
`AsyncLocalStorage` — no logger passing, no parameter drilling.

```ts
import { scope } from 'modern-debug/node'

http.createServer((req, res) => {
  scope({ requestId: req.headers['x-request-id'] }, () => {
    handle(req, res) // every record emitted anywhere below carries requestId
  })
})
```

```ts
import { scopeFields } from 'modern-debug/node'

scopeFields() // the active scope's fields, or undefined outside any scope
```

## Semantics

- `scope()` returns whatever the callback returns — `async` callbacks work; fields survive
  `await` boundaries.
- Nested scopes merge; inner keys win.
- Field precedence (lowest → highest): scope fields → `.fields()` base → call-site fields.

## Runtime support

Works on Node, Bun and Deno 2 out of the box. On Cloudflare Workers it needs Node.js
compatibility (on by default from compatibility date 2026-08-04; nodejs_compat before that) or
the nodejs_als flag alone for modern-debug/node (workerd 1.20261023.1, 2026-10-30). The subpath
imports only `AsyncLocalStorage` from `node:async_hooks`. With neither, importing
`modern-debug/node` fails loudly; the core keeps working, because it needs no Node built-ins.

`tests-workers` (the CI `workers` job) checks this on workerd 1.20261023.1:

| Suite                                 | Flags                                                   | Result                                          |
| ------------------------------------- | ------------------------------------------------------- | ----------------------------------------------- |
| @cloudflare/vitest-plugin 1.4.11 pool | `nodejs_compat`                                         | scope fields reach the emitted NDJSON record    |
| raw miniflare 5.20261023.3-beta       | `nodejs_compat`                                         | `/node` resolves; scope fields cross an `await` |
| raw miniflare                         | none (on by default at compatibility date 2026-10-23)   | `/node` resolves; scope fields cross an `await` |
| raw miniflare                         | `no_nodejs_compat`, `no_nodejs_compat_v2`, `nodejs_als` | `/node` resolves; scope fields cross an `await` |
| raw miniflare                         | `no_nodejs_compat`, `no_nodejs_compat_v2`               | the core works; importing `/node` rejects       |
