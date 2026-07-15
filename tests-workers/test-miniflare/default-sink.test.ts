import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * G-08 OPEN item — workerd process.stderr fidelity, proven empirically on raw workerd.
 *
 * Every other worker test injects configure({sink}); this one exercises the LD-11 DEFAULT
 * sink. The feature-detect runs at module load of dist/index.js, so the worker installs a
 * console.error spy FIRST and only then dynamic-imports the dist — if the default sink picks
 * the process.stderr.write branch, the spy must not see the debug line.
 *
 * Measured behavior (2026-07-11, workerd via miniflare 4.20260708.1, compat date 2026-07-01):
 * - WITH nodejs_compat: process.stderr.write is a callable function → stderr branch selected.
 *   The bytes DO surface, but as a `stderr: <line>` labeled log line on the workerd process's
 *   STDOUT (captured via handleRuntimeStdio) — nothing arrives on the runtime's real stderr fd.
 *   isTTY is undefined → LD-10 auto-detect emits NDJSON.
 * - WITHOUT nodejs_compat: no `process` global at all → console.error branch, spy receives the
 *   NDJSON line.
 */
const distDir = fileURLToPath(new URL('../../packages/modern-debug/dist/', import.meta.url))
const distModules = readdirSync(distDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({
    type: 'ESModule' as const,
    path: f,
    contents: readFileSync(`${distDir}${f}`, 'utf8'),
  }))

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

interface Captured {
  stdout: string
  stderr: string
}

const boot = (compatFlags: string[]): { mf: Miniflare; captured: Captured } => {
  const captured: Captured = { stdout: '', stderr: '' }
  const mf = new Miniflare({
    compatibilityDate: '2026-07-01',
    compatibilityFlags: compatFlags,
    modules: [{ type: 'ESModule', path: 'worker.mjs', contents: WORKER }, ...distModules],
    // Raw workerd child-process streams — replaces miniflare's default pipeOutput.
    handleRuntimeStdio: (stdout, stderr) => {
      stdout.on('data', (c: Buffer) => {
        captured.stdout += c.toString()
      })
      stderr.on('data', (c: Buffer) => {
        captured.stderr += c.toString()
      })
    },
  })
  return { mf, captured }
}

const waitFor = async (predicate: () => boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  while (!predicate() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50))
  }
  return predicate()
}

const instances: Miniflare[] = []

afterAll(async () => {
  await Promise.all(instances.map((mf) => mf.dispose()))
})

describe('raw workerd — LD-11 default sink, no configure({sink}) (G-08 OPEN item)', () => {
  it('with nodejs_compat: detect selects process.stderr.write; line surfaces as a labeled stdout log, not real stderr bytes', async () => {
    const { mf, captured } = boot(['nodejs_compat'])
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

    // Fidelity: workerd routes process.stderr writes to the runtime's STDOUT as a labeled
    // `stderr: <content>` log line; the real stderr fd stays silent.
    const surfaced = await waitFor(() => captured.stdout.includes(MARKER), 5000)
    expect(surfaced).toBe(true)
    expect(captured.stderr).not.toContain(MARKER)

    const labeled = captured.stdout.split('\n').find((l) => l.includes(MARKER))
    expect(labeled).toMatch(/^stderr: \{/)
    const line = JSON.parse((labeled as string).slice('stderr: '.length)) as {
      ns: string
      msg: string
    }
    expect(line.ns).toBe('mf')
    expect(line.msg).toBe(MARKER)
  })

  it('without nodejs_compat: no process global; console.error branch emits the NDJSON line', async () => {
    const { mf, captured } = boot([])
    instances.push(mf)
    const res = await mf.dispatchFetch('http://x/')
    const body = (await res.json()) as WorkerReport

    // No process at all without the flag — the detect cannot pick the stderr branch.
    expect(body.probe.hasProcess).toBe(false)
    expect(body.probe.writeType).toBe('absent')

    // The spy received exactly the canary plus the NDJSON debug line.
    expect(body.calls).toHaveLength(2)
    expect(body.calls[0]).toBe('spy-canary')
    const line = JSON.parse(body.calls[1] as string) as { ns: string; msg: string }
    expect(line.ns).toBe('mf')
    expect(line.msg).toBe(MARKER)

    // The spy swallowed the line, so nothing reaches the runtime's stdio.
    await new Promise((r) => setTimeout(r, 300))
    expect(captured.stdout).not.toContain(MARKER)
    expect(captured.stderr).not.toContain(MARKER)
  })
})
