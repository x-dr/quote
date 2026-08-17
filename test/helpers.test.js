import assert from 'node:assert/strict'
import test from 'node:test'
import { createCandlestickGeometry } from '../src/modules/goldMarket/helpers.js'

test('candlestick extreme markers keep the matching date labels', () => {
  const rows = [
    {
      id: 'first',
      timestamp: 1,
      label: '08-14',
      open: 100,
      high: 108,
      low: 98,
      close: 104,
    },
    {
      id: 'highest',
      timestamp: 2,
      label: '08-15',
      open: 104,
      high: 115,
      low: 101,
      close: 112,
    },
    {
      id: 'lowest',
      timestamp: 3,
      label: '08-18',
      open: 112,
      high: 113,
      low: 94,
      close: 97,
    },
  ]

  const geometry = createCandlestickGeometry(rows)

  assert.equal(geometry.maxMarker.value, 115)
  assert.equal(geometry.maxMarker.label, '08-15')
  assert.equal(geometry.minMarker.value, 94)
  assert.equal(geometry.minMarker.label, '08-18')
})
