import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Round-three P2 (DECISIONS G-14): the "." require condition must typecheck for the
 * legacy-TS consumers the §7 alias targets. tsdown's generated compat-cjs.d.ts uses an
 * arbitrary-string export name that only TS ≥5.9 parses/models, so we ship a hand-authored
 * export= declaration (src/compat-cjs.d.cts, copied into dist) and gate it here against the
 * pinned legacy compiler (typescript-legacy = npm:typescript@5.8.3 — an oracle pin like
 * debug 4.4.3, not a channel pin).
 */
const selfRequire = createRequire(import.meta.url)
const pkgRoot = fileURLToPath(new URL('..', import.meta.url))
const legacyTsc = selfRequire.resolve('typescript-legacy/lib/tsc.js')

const dir = mkdtempSync(join(tmpdir(), 'md-alias-types-'))
const junction = join(dir, 'node_modules', 'modern-debug')

afterAll(() => {
  // Remove the link itself first — never recurse through it into the real package.
  // Windows junctions are directories (rmdirSync); POSIX symlinks are files (unlinkSync).
  try {
    if (process.platform === 'win32') rmdirSync(junction)
    else unlinkSync(junction)
  } catch {
    // link never got created — the test body failed first; nothing to protect.
  }
  rmSync(dir, { recursive: true, force: true })
})

describe('require("modern-debug") types on legacy TypeScript', () => {
  // Cold tsc 5.8 takes ~6 s on shared CI runners — well past vitest's 5 s default.
  it('a CJS consumer on TS 5.8 typechecks the factory as callable', { timeout: 120_000 }, () => {
    mkdirSync(join(dir, 'node_modules'))
    symlinkSync(pkgRoot, junction, 'junction')
    writeFileSync(
      join(dir, 'probe.cts'),
      [
        "import createDebug = require('modern-debug')",
        "const d = createDebug('probe:ns')",
        "d('hello %s', 'world')",
        'const on: boolean = d.enabled',
        "createDebug.enable('probe:*')",
        "const child = d.extend('sub')",
        "child('x')",
        '',
      ].join('\n'),
    )
    const r = spawnSync(
      process.execPath,
      [
        legacyTsc,
        '--strict',
        '--noEmit',
        '--module',
        'node16',
        '--moduleResolution',
        'node16',
        '--target',
        'es2022',
        join(dir, 'probe.cts'),
      ],
      { encoding: 'utf8' },
    )
    // tsc prints diagnostics on stdout; surface them in the assertion message.
    expect(r.stdout).toBe('')
    expect(r.status).toBe(0)
  })
})
