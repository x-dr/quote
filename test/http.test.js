import assert from 'node:assert/strict'
import test from 'node:test'
import { gwPost } from '../src/services/http.js'

test('gwPost serializes payload and unwraps a successful gateway response', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://example.test/quote')
    assert.equal(options.method, 'POST')
    assert.deepEqual(
      JSON.parse(new URLSearchParams(options.body).get('reqData')),
      { symbol: 'AU9999' },
    )

    return new Response(
      JSON.stringify({ resultCode: 0, resultData: { price: 888.8 } }),
      { status: 200 },
    )
  }

  const result = await gwPost('https://example.test/quote', { symbol: 'AU9999' })
  assert.deepEqual(result, { price: 888.8 })
})

test('gwPost aborts requests that exceed the configured timeout', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      )
    })

  await assert.rejects(
    gwPost('https://example.test/slow', {}, { timeout: 5 }),
    /请求超时（5ms）/,
  )
})

test('gwPost turns low-level fetch failures into a useful message', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }

  await assert.rejects(
    gwPost('https://example.test/unreachable'),
    /网络请求失败，请检查服务或网络连接/,
  )
})
