// §7 alias entry: `require('debug')` (aliased to modern-debug) must yield the factory
// itself, not a namespace object. Node ≥20.19 (LD-01's interop floor) unwraps the literal
// 'module.exports' export name in require(esm) — no CJS artifact is shipped.
import compat from './compat.ts'

export { compat as 'module.exports' }
