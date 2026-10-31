#!/usr/bin/env node
// docs/resolve-dts.mjs
//
// tsdown emits two kinds of `.d.ts` per entry: a stable-named 2-line re-export barrel
// (dist/index.d.ts, dist/compat.d.ts — just `import { a as createDebug, ... } from
// "./index-<hash>.js"; export { ... }`) and the REAL declarations in a content-hashed
// chunk file (dist/index-<hash>.d.ts, dist/compat-<hash>.d.ts) whose hash changes every
// build. docs/api/index.md wants the real declarations for `.` and `/compat`, so this
// script locates each entry's current hashed chunk and copies it to a stable path under
// `.vitepress/cache/` that the markdown `<<<` includes reference.
//
// The chunk ends with a minifier alias list (`export { createDebug as a, ... };`), so each
// copy drops that last line and appends the barrel's own public `export { ... };` line.
// `dist/node.d.ts` is routed through the same script with its hashed chunk import rewritten
// to `import type { DebugFields } from "modern-debug";`. Any residual `as <letter>` alias or
// hashed chunk path in an output fails the run.
//
// Runs before `vitepress dev` and `vitepress build` (docs/package.json "predev" and "build").
// Fails loudly (nonzero exit) if it cannot find exactly one matching chunk per entry —
// silently falling back to the barrel (or the wrong chunk) would ship a broken API reference
// with no build-time signal. See DECISIONS.md G-14.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = join(here, '..', 'packages', 'modern-debug', 'dist')
const outDir = join(here, '.vitepress', 'cache', 'api-dts')

if (!existsSync(distDir)) {
  console.error(
    `[resolve-dts] ${distDir} does not exist. Build packages/modern-debug (turbo run build) before building docs.`,
  )
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

const targets = [
  { entry: 'index', barrel: 'index.d.ts', out: 'index.d.ts' },
  { entry: 'compat', barrel: 'compat.d.ts', out: 'compat.d.ts' },
]

// Residual minifier alias (`createDebug as a`) or hashed chunk path (`index-<8 chars>.js`).
const leaks = [/\bas [a-z]\b/, /-[A-Za-z0-9_-]{8}\.js/]
const exportLine = /^export \{[^}]*\};?\s*$/m

const files = readdirSync(distDir)
let failed = false

for (const { entry, barrel, out } of targets) {
  // The hashed chunk matches `<entry>-<hash>.d.ts`. Excludes the stable barrel
  // (`<entry>.d.ts`) itself and, for `compat`, the unrelated `compat-cjs.d.ts` /
  // `compat-cjs.d.cts` require-condition declarations (which always start with the
  // literal `compat-cjs`, never a bare content hash). Rolldown's base64 hash alphabet
  // includes `-` and `_`.
  const chunkPattern = new RegExp(`^${entry}-(?!cjs)[A-Za-z0-9_-]+\\.d\\.ts$`)
  const matches = files.filter((f) => f !== barrel && chunkPattern.test(f))

  if (matches.length !== 1) {
    console.error(
      `[resolve-dts] expected exactly one hashed .d.ts chunk for "${entry}" in ${distDir}, ` +
        `found ${matches.length}: ${JSON.stringify(matches)}. ` +
        `(Looked for files matching ${chunkPattern} other than the "${barrel}" barrel.)`,
    )
    failed = true
    continue
  }

  const chunk = readFileSync(join(distDir, matches[0]), 'utf8').trimEnd()
  const lastExport = chunk.lastIndexOf('\nexport {')
  const publicExport = readFileSync(join(distDir, barrel), 'utf8').match(exportLine)
  if (lastExport === -1 || !publicExport) {
    console.error(`[resolve-dts] "${entry}": no trailing alias export or barrel export line found.`)
    failed = true
    continue
  }
  const text = `${chunk.slice(0, lastExport)}\n${publicExport[0].trim()}\n`
  writeFileSync(join(outDir, out), text)
  if (leaks.some((re) => re.test(text))) {
    console.error(`[resolve-dts] "${out}" still contains a minifier alias or hashed chunk path.`)
    failed = true
  }
  console.log(`[resolve-dts] ${entry}: ${matches[0]} -> .vitepress/cache/api-dts/${out}`)
}

// node.d.ts: one import of the shared chunk; point it at the public package instead.
const nodeText = readFileSync(join(distDir, 'node.d.ts'), 'utf8').replace(
  /^import \{ \w+ as DebugFields \} from "\.\/index-[A-Za-z0-9_-]+\.js";/m,
  'import type { DebugFields } from "modern-debug";',
)
writeFileSync(join(outDir, 'node.d.ts'), nodeText)
console.log('[resolve-dts] node: node.d.ts -> .vitepress/cache/api-dts/node.d.ts')
if (leaks.some((re) => re.test(nodeText))) {
  console.error('[resolve-dts] "node.d.ts" still contains a minifier alias or hashed chunk path.')
  failed = true
}

if (failed) {
  console.error('[resolve-dts] aborting docs build: API reference d.ts resolution failed.')
  process.exit(1)
}
