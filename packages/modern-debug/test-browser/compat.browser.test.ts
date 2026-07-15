import { describe, expect, it } from 'vitest'
import compat from '../src/compat.ts'

/** Browser leg for /compat: exercises the non-Node fallback path (no node:util). */
describe('compat in the browser', () => {
  it('factory, grammar, and log override work', () => {
    compat.enable('c:*')
    const d = compat('c:x')
    expect(d.enabled).toBe(true)
    const logs: unknown[][] = []
    d.log = (...args: unknown[]) => {
      logs.push(args)
    }
    d('msg %j end', { a: 1 })
    compat.disable()
    expect(String(logs[0]?.[0])).toContain('c:x')
    expect(String(logs[0]?.[0])).toContain('msg {"a":1} end')
  })

  it('persists patterns through localStorage (debug browser parity)', () => {
    compat.enable('persist:*')
    expect(localStorage.getItem('debug')).toBe('persist:*')
    compat.disable()
    expect(localStorage.getItem('debug')).toBeNull()
  })
})
