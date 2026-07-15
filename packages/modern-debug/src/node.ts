// §5.4: AsyncLocalStorage request scoping. Works on Node/Bun/Deno; on workerd requires the
// nodejs_compat flag (documented; the workers island exercises the presence path).
// Importing this module wires the scope store into core emits via the hooks slot.
import { AsyncLocalStorage } from 'node:async_hooks'
import { setCtxFields } from './hooks.ts'
import type { DebugFields } from './index.ts'

const store = new AsyncLocalStorage<DebugFields>()

setCtxFields(() => store.getStore())

/** Nested scopes merge, inner keys win. Returns fn's result (Promise-transparent). */
export function scope<T>(fields: DebugFields, fn: () => T): T {
  const outer = store.getStore()
  return store.run(outer ? { ...outer, ...fields } : fields, fn)
}

export function scopeFields(): DebugFields | undefined {
  return store.getStore()
}
