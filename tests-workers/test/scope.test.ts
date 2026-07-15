import { configure, createDebug, disable, enable } from 'modern-debug'
import { scope, scopeFields } from 'modern-debug/node'
import { describe, expect, it } from 'vitest'

/** §5.4 presence path: ALS scoping inside real workerd with nodejs_compat enabled. */
describe('/node scope on workerd', () => {
  it('scope fields flow into records emitted inside workerd', () => {
    const sunk: string[] = []
    configure({
      sink: (line) => {
        sunk.push(line)
      },
      format: 'ndjson',
    })
    enable('w')
    scope({ req: 'r1' }, () => {
      createDebug('w')('m')
      expect(scopeFields()).toEqual({ req: 'r1' })
    })
    configure({})
    disable()
    const record = JSON.parse(sunk[0] as string) as Record<string, unknown>
    expect(record.ns).toBe('w')
    expect(record.req).toBe('r1')
  })
})
