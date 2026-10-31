import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Miniflare, type WorkerdStructuredLog } from 'miniflare'
import { afterAll, describe, expect, it } from 'vitest'
import { COMPATIBILITY_DATE } from '../workerd-compat.ts'

/**
 * G-08 OPEN item — workerd process.stderr fidelity, proven empirically on raw workerd.
 *
 * Every other worker test injects configure({sink}); this one exercises the LD-11 DEFAULT
 * sink. The feature-detect runs at module load of dist/index.js, so the worker installs a
 * console.error spy FIRST and only then dynamic-imports the dist — if the default sink picks
 * the process.stderr.write branch, the spy must not see the debug line.
 *
 * Measured behavior (2026-10-30, miniflare 5.20261023.3-beta, workerd 1.20261023.1, compat
 * date 2026-10-23 from workerd-compat.ts), captured with miniflare's handleStructuredLogs,
 * the only runtime-output hook miniflare 5 has (handleRuntimeStdio is gone):
 * - WITH nodejs_compat: process.stderr.write is a callable function → stderr branch selected.
 *   The bytes surface as one structured log entry with level 'log', not 'error', and the
 *   message keeps the `stderr: ` prefix: `stderr: {"t":…,"ns":"mf","msg":"…"}`. That prefix
 *   is the only trace of which stream was written. isTTY is undefined → LD-10 auto-detect
 *   emits NDJSON.
 * - WITHOUT Node.js compatibility (no_nodejs_compat + no_nodejs_compat_v2, because workerd
 *   turns it on by default from compat date 2026-08-04): no `process` global at all →
 *   console.error branch, the spy receives the NDJSON line, and no log entry carries it.
 */
const distDir = fileURLToPath(new URL('../../packages/modern-debug/dist/', import.meta.url))
const distModules = Object.fromEntries(
  readdirSync(distDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => [f, { type: 'esm' as const, contents: readFileSync(`${distDir}${f}`, 'utf8') }]),
)

const MARKER = 'ld11-default-sink-empirical'

const WORKER = `
export default {
  async fetch() {
    const calls = []
    console.error = (...a) => { calls.push(a.map(String).join(' ')) }
    console.error('spy-canary')
    const probe = {
      hasProcess: typeof process !== 'undefined',
      writeType: typeof process !== 'undefined' && process.stderr ? typeof process.stderr.write : 'absent',
      isTTY: typeof process !== 'undefined' && process.stderr ? String(process.stderr.isTTY) : 'absent',
    }
    const { createDebug, enable } = await import('./index.js')
    enable('mf')
    createDebug('mf')('${MARKER}')
    return new Response(JSON.stringify({ probe, calls }))
  }
}
`

interface WorkerReport {
  probe: { hasProcess: boolean; writeType: string; isTTY: string }
  calls: string[]
}

const boot = (compatFlags: string[]): { mf: Miniflare; logs: WorkerdStructuredLog[] } => {
  const logs: WorkerdStructuredLog[] = []
  const mf = new Miniflare({
    workers: [
      {
        config: {
          name: 'default-sink',
          compatibilityDate: COMPATIBILITY_DATE,
          compatibilityFlags: compatFlags,
          manifest: {
            mainModule: 'worker.mjs',
            modules: { 'worker.mjs': { type: 'esm', contents: WORKER }, ...distModules },
          },
        },
      },
    ],
    // Every runtime log line, already parsed by miniflare into {timestamp, level, message}.
    handleStructuredLogs: (log) => {
      logs.push(log)
    },
  })
  return { mf, logs }
}

const waitFor = async (predicate: () => boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  while (!predicate() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50))
  }
  return predicate()
}

const STDERR_PREFIX = 'stderr: '

const instances: Miniflare[] = []

afterAll(async () => {
  await Promise.all(instances.map((mf) => mf.dispose()))
})

describe('raw workerd — LD-11 default sink, no configure({sink}) (G-08 OPEN item)', () => {
  it('with nodejs_compat: detect selects process.stderr.write; line surfaces as a level-log `stderr: ` entry, never level error', async () => {
    const { mf, logs } = boot(['nodejs_compat'])
    instances.push(mf)
    const res = await mf.dispatchFetch('http://x/')
    const body = (await res.json()) as WorkerReport

    // The LD-11 detect condition holds on real workerd with the flag.
    expect(body.probe.hasProcess).toBe(true)
    expect(body.probe.writeType).toBe('function')
    // No TTY → LD-10 auto-detect must land on ndjson.
    expect(body.probe.isTTY).toBe('undefined')

    // Branch proof: the spy caught only its canary — the debug line did NOT go to console.error.
    expect(body.calls).toEqual(['spy-canary'])

    // Fidelity: workerd reports process.stderr writes as a level 'log' entry whose message
    // keeps the `stderr: ` prefix; no level 'error' entry carries the line.
    const isLabeled = (l: WorkerdStructuredLog): boolean =>
      l.level === 'log' && l.message.startsWith(`${STDERR_PREFIX}{`) && l.message.includes(MARKER)
    const surfaced = await waitFor(() => logs.some(isLabeled), 5000)
    expect(surfaced).toBe(true)
    expect(logs.filter((l) => l.level === 'error' && l.message.includes(MARKER))).toEqual([])

    const labeled = logs.find(isLabeled) as WorkerdStructuredLog
    const line = JSON.parse(labeled.message.slice(STDERR_PREFIX.length)) as {
      ns: string
      msg: string
    }
    expect(line.ns).toBe('mf')
    expect(line.msg).toBe(MARKER)
  })

  it('without Node.js compatibility: no process global; console.error branch emits the NDJSON line', async () => {
    const { mf, logs } = boot(['no_nodejs_compat', 'no_nodejs_compat_v2'])
    instances.push(mf)
    const res = await mf.dispatchFetch('http://x/')
    const body = (await res.json()) as WorkerReport

    // No process at all without Node.js compatibility — the detect cannot pick stderr.
    expect(body.probe.hasProcess).toBe(false)
    expect(body.probe.writeType).toBe('absent')

    // The spy received exactly the canary plus the NDJSON debug line.
    expect(body.calls).toHaveLength(2)
    expect(body.calls[0]).toBe('spy-canary')
    const line = JSON.parse(body.calls[1] as string) as { ns: string; msg: string }
    expect(line.ns).toBe('mf')
    expect(line.msg).toBe(MARKER)

    // The spy swallowed the line, so no runtime log entry carries it.
    await new Promise((r) => setTimeout(r, 300))
    expect(logs.filter((l) => l.message.includes(MARKER))).toEqual([])
  })
})
