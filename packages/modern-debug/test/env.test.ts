import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveEnvPattern } from '../src/env.ts'

/**
 * LD-09 resolution ladder: process.env.DEBUG > globalThis.DEBUG > localStorage.debug > off.
 * (The explicit `enable()` rung above these lives in core, not here.) Every feature-detect
 * branch is mocked per spec §8.1. Empty strings do not occupy a rung. The storage rung is
 * browser-scoped (G-14): where process.env exists it is never consulted — Node ≥26 emits
 * ExperimentalWarning on bare localStorage access, and debug 4.4.3's node build is env-only.
 */
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function clearEnvRung(): void {
  vi.stubEnv('DEBUG', undefined)
}

describe('LD-09 env ladder', () => {
  it('returns undefined when no rung is set', () => {
    clearEnvRung()
    expect(resolveEnvPattern()).toBeUndefined()
  })

  it('reads process.env.DEBUG first', () => {
    vi.stubEnv('DEBUG', 'app:*')
    expect(resolveEnvPattern()).toBe('app:*')
  })

  it('process.env.DEBUG wins over globalThis.DEBUG and localStorage', () => {
    vi.stubEnv('DEBUG', 'env:*')
    vi.stubGlobal('DEBUG', 'global:*')
    vi.stubGlobal('localStorage', {
      getItem: (key: string): string | null => (key === 'debug' ? 'ls:*' : null),
    })
    expect(resolveEnvPattern()).toBe('env:*')
  })

  it('empty process.env.DEBUG falls through to the next rung', () => {
    vi.stubEnv('DEBUG', '')
    vi.stubGlobal('DEBUG', 'global:*')
    expect(resolveEnvPattern()).toBe('global:*')
  })

  it('falls back to globalThis.DEBUG when the env rung is empty', () => {
    clearEnvRung()
    vi.stubGlobal('DEBUG', 'global:*')
    expect(resolveEnvPattern()).toBe('global:*')
  })

  it('ignores non-string globalThis.DEBUG', () => {
    clearEnvRung()
    vi.stubGlobal('DEBUG', true)
    expect(resolveEnvPattern()).toBeUndefined()
  })

  it('globalThis.DEBUG wins over localStorage', () => {
    clearEnvRung()
    vi.stubGlobal('DEBUG', 'global:*')
    vi.stubGlobal('localStorage', {
      getItem: (): string => 'ls:*',
    })
    expect(resolveEnvPattern()).toBe('global:*')
  })

  it('falls back to localStorage.debug where process is absent (browsers)', () => {
    vi.stubGlobal('process', undefined)
    vi.stubGlobal('localStorage', {
      getItem: (key: string): string | null => (key === 'debug' ? 'ls:*' : null),
    })
    expect(resolveEnvPattern()).toBe('ls:*')
  })

  it('never consults storage while process.env exists — Node ≥26 warns on bare access', () => {
    clearEnvRung()
    const getItem = vi.fn((): string => 'ls:*')
    vi.stubGlobal('localStorage', { getItem })
    expect(resolveEnvPattern()).toBeUndefined()
    expect(getItem).not.toHaveBeenCalled()
  })

  it('survives a throwing localStorage (privacy mode)', () => {
    vi.stubGlobal('process', undefined)
    vi.stubGlobal('localStorage', {
      getItem: (): string => {
        throw new Error('SecurityError')
      },
    })
    expect(resolveEnvPattern()).toBeUndefined()
  })

  it('survives a throwing globalThis.DEBUG accessor and falls through', () => {
    vi.stubGlobal('process', undefined)
    Object.defineProperty(globalThis, 'DEBUG', {
      configurable: true,
      get() {
        throw new Error('hostile accessor')
      },
    })
    try {
      vi.stubGlobal('localStorage', {
        getItem: (key: string): string | null => (key === 'debug' ? 'ls:*' : null),
      })
      expect(resolveEnvPattern()).toBe('ls:*')
    } finally {
      Reflect.deleteProperty(globalThis, 'DEBUG')
    }
  })

  it('survives a missing process global (workers/browsers)', () => {
    vi.stubGlobal('process', undefined)
    vi.stubGlobal('DEBUG', 'global:*')
    expect(resolveEnvPattern()).toBe('global:*')
  })

  it('returns undefined when process is missing and nothing else is set', () => {
    vi.stubGlobal('process', undefined)
    expect(resolveEnvPattern()).toBeUndefined()
  })
})
