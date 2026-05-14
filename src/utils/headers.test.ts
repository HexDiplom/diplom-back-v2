import { describe, expect, test } from 'bun:test'
import { appendHeadersPreservingSetCookie } from './headers'

describe('header helpers', () => {
  test('preserves repeated set-cookie headers while copying other headers', () => {
    const source = new Headers()
    source.set('cache-control', 'no-store')
    source.append('set-cookie', 'session=abc; Path=/; HttpOnly')
    source.append('set-cookie', 'csrf=def; Path=/; HttpOnly')
    const target: Record<string, string | number | string[] | undefined> = {
      'set-cookie': 'existing=1; Path=/',
    }

    appendHeadersPreservingSetCookie(target, source)

    expect(target['cache-control']).toBe('no-store')
    expect(target['set-cookie']).toEqual([
      'existing=1; Path=/',
      'session=abc; Path=/; HttpOnly',
      'csrf=def; Path=/; HttpOnly',
    ])
  })
})
