import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const selfRequire = createRequire(import.meta.url)

/**
 * §7 alias recipe: with `"debug": "npm:modern-debug@^1"` in overrides, the transitive CJS
 * install base calls require('debug'). That resolves our "." require condition, which must
 * unwrap (via Node's 'module.exports' named export) to the debug-shaped compat factory.
 * Uses package self-reference, so this exercises the REAL exports map + built dist.
 */
describe('require("modern-debug") — the alias path', () => {
  it('yields the compat factory, not a module namespace', () => {
    const factory = selfRequire('modern-debug')
    expect(typeof factory).toBe('function')
    expect(typeof factory.humanize).toBe('function')
    expect(typeof factory.enable).toBe('function')
    expect(typeof factory.disable).toBe('function')
    const d = factory('alias:probe')
    expect(d.namespace).toBe('alias:probe')
    expect(typeof d.extend).toBe('function')
  })
})
