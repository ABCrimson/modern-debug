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

Works on Node, Bun and Deno 2 out of the box. On Cloudflare Workers it requires the
`nodejs_compat` compatibility flag — without it, importing `modern-debug/node` fails loudly
(the core keeps working; it needs no Node built-ins). Both paths are exercised against raw
workerd in CI.
