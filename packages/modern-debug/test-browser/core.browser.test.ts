import { afterEach, describe, expect, it } from 'vitest'
import { configure, createDebug, disable, enable, enabled } from '../src/index.ts'

/** Browser leg: core behavior in a real chromium page (no process, real localStorage). */
const sunk: string[] = []
const sink = (line: string): void => {
  sunk.push(line)
}

afterEach(() => {
  configure({})
  disable()
  sunk.length = 0
  localStorage.removeItem('debug')
})

describe('core in the browser', () => {
  it('matcher grammar works (wildcards, negation)', () => {
    enable('app:*,-app:secret')
    expect(enabled('app:db')).toBe(true)
    expect(enabled('app:secret')).toBe(false)
    expect(enabled('other')).toBe(false)
  })

  it('emits NDJSON records through a sink', () => {
    configure({ sink, format: 'ndjson' })
    enable('b')
    createDebug('b')('hello', { n: 1 })
    const rec = JSON.parse(sunk[0] as string) as Record<string, unknown>
    expect(rec.ns).toBe('b')
    expect(rec.msg).toBe('hello')
    expect(rec.n).toBe(1)
  })

  it('pretty mode and levels work', () => {
    configure({ sink, format: 'pretty', time: 'none' })
    enable('b')
    const d = createDebug('b')
    d('plain')
    expect(sunk[0]).toBe('b plain')
    configure({ sink, format: 'ndjson' })
    d.warn('careful')
    expect((JSON.parse(sunk[1] as string) as Record<string, unknown>).sev).toBe(40)
  })

  it('reads the REAL localStorage.debug rung (LD-09)', async () => {
    localStorage.setItem('debug', 'fromls:*')
    const { resolveEnvPattern } = await import('../src/env.ts')
    expect(resolveEnvPattern()).toBe('fromls:*')
  })
})
