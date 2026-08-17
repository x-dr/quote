import assert from 'node:assert/strict'
import test from 'node:test'
import { QuoteWebSocketClient, WS_STATUS } from '../src/services/wsClient.js'

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 3
  static instances = []

  constructor(url) {
    this.url = url
    this.readyState = FakeWebSocket.CONNECTING
    this.listeners = new Map()
    this.sent = []
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type).add(listener)
  }

  emit(type, value = {}) {
    this.listeners.get(type)?.forEach((listener) => listener(value))
  }

  open() {
    this.readyState = FakeWebSocket.OPEN
    this.emit('open')
  }

  send(payload) {
    this.sent.push(JSON.parse(payload))
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
  }
}

function installBrowserStubs(t) {
  const originalWindow = globalThis.window
  const originalWebSocket = globalThis.WebSocket

  FakeWebSocket.instances = []
  globalThis.window = {
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
  }
  globalThis.WebSocket = FakeWebSocket

  t.after(() => {
    globalThis.window = originalWindow
    globalThis.WebSocket = originalWebSocket
  })
}

test('QuoteWebSocketClient subscribes and dispatches normalized packets', (t) => {
  installBrowserStubs(t)
  const packets = []
  const client = new QuoteWebSocketClient({ url: 'wss://example.test', heartbeatInterval: 60000 })
  const unsubscribe = client.subscribe({ marketType: '2', key: 'AU9999', onMessage: (packet) => packets.push(packet) })
  const socket = FakeWebSocket.instances[0]

  socket.open()
  assert.deepEqual(socket.sent[0], { action: '2', bizType: '2', keys: ['AU9999'] })

  socket.emit('message', {
    data: JSON.stringify({ bizType: '2', key: 'AU9999', data: { latestPrice: 888.8 } }),
  })
  assert.equal(packets.length, 1)
  assert.equal(packets[0].payload.latestPrice, 888.8)

  unsubscribe()
  assert.deepEqual(socket.sent.at(-1), { action: '3', bizType: '2', keys: ['AU9999'] })
  client.disconnect()
})

test('a stale socket close cannot overwrite a manually reconnected socket', (t) => {
  installBrowserStubs(t)
  const client = new QuoteWebSocketClient({ url: 'wss://example.test' })

  client.connect()
  const staleSocket = FakeWebSocket.instances[0]
  client.disconnect()
  client.connect()
  const activeSocket = FakeWebSocket.instances[1]

  staleSocket.emit('close')
  assert.equal(client.socket, activeSocket)
  assert.equal(client.status, WS_STATUS.CONNECTING)

  activeSocket.open()
  assert.equal(client.status, WS_STATUS.CONNECTED)
  client.disconnect()
})
