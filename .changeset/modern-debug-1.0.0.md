---
'modern-debug': major
---

Ship modern-debug 1.0.0: a sub-2KB ESM-only universal diagnostic logger with `debug` 4.4.3
namespace-grammar, matcher and color-hash parity (checked against golden fixtures from the real
package), structured NDJSON output, OpenTelemetry trace/span correlation via the `./otel`
subpath, and Node `AsyncLocalStorage` request scoping via the `./node` subpath. Includes the
`./compat` drop-in `debug`-compatible factory and a `require` condition on the `.` entry, so
legacy CJS consumers can install this package under the `debug` name through a package-manager
override with zero code changes.

This is the first stable release. The public API surface — `createDebug`,
`enable`/`disable`/`enabled`, `configure`, `.warn`/`.error` levels, `.extend`, `.fields`, and
the four subpath exports (`.`, `./compat`, `./otel`, `./node`) — is now frozen under semver.
Breaking changes from the 0.x line going forward require a major bump. Requires Node >=22.13.0.
