import { configure, createDebug, disable, enable } from 'modern-debug'
import { afterEach, describe, expect, it } from 'vitest'

describe('workers island scaffold', () => {
  it('runs inside workerd', () => {
    // Workers-specific globals prove the pool is real, not a Node fallback.
    expect(new Response('ok').status).toBe(200)
    expect(globalThis.caches).toBeDefined()
  })
})

describe('isolate reuse on workerd', () => {
  afterEach(() => {
    configure({})
    disable()
  })

  it('exposes WeakRef at the island compatibility date', () => {
    expect(typeof WeakRef).toBe('function')
  })

  // workerd reuses one isolate: a logger created once must follow later toggles via the re-bind registry.
  it('a long-lived instance re-binds on every enable()/disable() toggle', () => {
    const sunk: string[] = []
    configure({ sink: (line) => sunk.push(line), format: 'ndjson' })
    const log = createDebug('iso:long')
    for (let i = 0; i < 1_000; i++) {
      if (i % 2 === 0) enable('iso:*')
      else disable()
      log('tick', { i })
    }
    expect(sunk).toHaveLength(500)
    expect(JSON.parse(sunk.at(-1) as string)).toMatchObject({ ns: 'iso:long', msg: 'tick', i: 998 })
  })
})
