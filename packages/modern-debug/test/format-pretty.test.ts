import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COLORS, selectColor } from '../src/format-pretty.ts'

const fixture = JSON.parse(
  readFileSync(new URL('../../../fixtures/debug-golden/colors.json', import.meta.url), 'utf8'),
) as { palette: number[]; picks: Record<string, number> }

describe('LD-06 color hash — golden fixture from debug 4.4.3', () => {
  it('palette is the debug 4.4.3 256-color palette, verbatim', () => {
    expect([...COLORS]).toEqual(fixture.palette)
  })

  it('selectColor matches every golden pick', () => {
    for (const [ns, color] of Object.entries(fixture.picks)) {
      expect(selectColor(ns), `ns=${JSON.stringify(ns)}`).toBe(color)
    }
  })

  it('implements the LD-06 hash formula verbatim', () => {
    for (const ns of ['app:db', 'worker', '🔥', 'x'.repeat(200)]) {
      let hash = 0
      for (let i = 0; i < ns.length; i++) {
        hash = (hash << 5) - hash + ns.charCodeAt(i)
        hash |= 0
      }
      expect(selectColor(ns)).toBe(COLORS[Math.abs(hash) % COLORS.length])
    }
  })
})
