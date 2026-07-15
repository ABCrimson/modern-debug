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
// Run before `vitepress build` (wired into docs/package.json's "build" script). Fails
// loudly (nonzero exit) if it cannot find exactly one matching chunk per entry — silently
// falling back to the barrel (or the wrong chunk) would ship a broken API reference with
// no build-time signal. See review round three, confirmed[14].

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
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

const files = readdirSync(distDir)
let failed = false

for (const { entry, barrel, out } of targets) {
  // The hashed chunk matches `<entry>-<hash>.d.ts`. Excludes the stable barrel
  // (`<entry>.d.ts`) itself and, for `compat`, the unrelated `compat-cjs.d.ts` /
  // `compat-cjs.d.cts` require-condition declarations (which always start with the
  // literal `compat-cjs`, never a bare content hash).
  const chunkPattern = new RegExp(`^${entry}-(?!cjs)[A-Za-z0-9_]+\\.d\\.ts$`)
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

  copyFileSync(join(distDir, matches[0]), join(outDir, out))
  console.log(`[resolve-dts] ${entry}: ${matches[0]} -> .vitepress/cache/api-dts/${out}`)
}

if (failed) {
  console.error('[resolve-dts] aborting docs build: API reference d.ts resolution failed.')
  process.exit(1)
}
