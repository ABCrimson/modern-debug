// Hand-authored types for the "." require condition (copied verbatim into dist by tsdown).
// tsdown's generated compat-cjs.d.ts models Node's 'module.exports' unwrap via an
// arbitrary-string export name, which only TS >=5.9 can parse — the legacy-TS consumers the
// §7 alias recipe targets would get parse errors (<=5.5) or a non-callable namespace (5.8).
// export= describes the unwrapped runtime value; the resolution-mode attribute (TS >=5.3)
// lets this CJS declaration type-import the ESM surface. Gated by test/alias-types.test.ts
// against the pinned legacy compiler (G-14).
import type { CompatDebug } from './compat.js' with { 'resolution-mode': 'import' }

declare const compat: CompatDebug
export = compat
