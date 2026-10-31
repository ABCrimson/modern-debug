// §7 alias entry: `require('debug')` (aliased to modern-debug) must yield the factory
// itself, not a namespace object. Node ≥22.13.0 (LD-01 engines floor, amended per G-17)
// unwraps the literal 'module.exports' export name in require(esm), unflagged and
// warning-free — no CJS artifact is shipped.
import compat from './compat.ts'

export { compat as 'module.exports' }
