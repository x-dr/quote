import { GOLD_WS_API, PRICE_BIZ_TYPE } from '../config/api'

const WS_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
}

const toBizType = (marketTypeOrBizType = 'GOLD') => {
  if (PRICE_BIZ_TYPE[marketTypeOrBizType]) {
    return PRICE_BIZ_TYPE[marketTypeOrBizType]
  }

  return marketTypeOrBizType
}

const toChannel = (bizType, key) => `${bizType}__${key}`

export class QuoteWebSocketClient {
  constructor(options = {}) {
    this.url = options.url || GOLD_WS_API
    this.reconnectInterval = options.reconnectInterval || 1500
    this.maxReconnectAttempts = options.maxReconnectAttempts || 50
    this.heartbeatInterval = options.heartbeatInterval || 10000

    this.socket = null
    this.status = WS_STATUS.DISCONNECTED
    this.subscriptions = new Map()
    this.handlers = new Map()
    this.statusListeners = new Set()

    this.reconnectAttempts = 0
    this.manualClose = false
    this.reconnectTimer = null
    this.heartbeatTimer = null
  }

  onStatusChange(listener) {
    this.statusListeners.add(listener)
    listener(this.status)

    return () => {
      this.statusListeners.delete(listener)
    }
  }

  setStatus(nextStatus) {
    this.status = nextStatus
    this.statusListeners.forEach((listener) => listener(nextStatus))
  }

  connect() {
    if (
      this.status === WS_STATUS.CONNECTED ||
      this.status === WS_STATUS.CONNECTING ||
      this.status === WS_STATUS.RECONNECTING
    ) {
      return
    }

    this.manualClose = false
    this.setStatus(this.reconnectAttempts > 0 ? WS_STATUS.RECONNECTING : WS_STATUS.CONNECTING)

    this.socket = new WebSocket(this.url)

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0
      this.setStatus(WS_STATUS.CONNECTED)
      this.startHeartbeat()
      this.resubscribeAll()
    })

    this.socket.addEventListener('message', (event) => {
      this.handleMessage(event.data)
    })

    this.socket.addEventListener('close', () => {
      this.stopHeartbeat()
      this.setStatus(WS_STATUS.DISCONNECTED)

      if (!this.manualClose) {
        this.scheduleReconnect()
      }
    })

    this.socket.addEventListener('error', () => {
      this.socket?.close()
    })
  }

  disconnect() {
    this.manualClose = true
    this.clearReconnect()
    this.stopHeartbeat()

    if (this.socket) {
      try {
        this.socket.close(1000, 'manual close')
      } catch {
        // ignore
      }
      this.socket = null
    }

    this.setStatus(WS_STATUS.DISCONNECTED)
  }

  startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatTimer = window.setInterval(() => {
      this.send({ action: '1' })
    }, this.heartbeatInterval)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.clearReconnect()
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts += 1
      this.connect()
    }, this.reconnectInterval)
  }

  clearReconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  send(payload) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload))
    }
  }

  subscribe({ marketType = 'GOLD', key, onMessage }) {
    const bizType = toBizType(marketType)
    const channel = toChannel(bizType, key)

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set())
    }

    this.handlers.get(channel).add(onMessage)
    this.subscriptions.set(channel, { bizType, key })

    if (this.status !== WS_STATUS.CONNECTED) {
      this.connect()
    } else {
      this.send({ action: '2', bizType, keys: [key] })
    }

    return () => {
      this.unsubscribe({ marketType, key, onMessage })
    }
  }

  unsubscribe({ marketType = 'GOLD', key, onMessage }) {
    const bizType = toBizType(marketType)
    const channel = toChannel(bizType, key)
    const handlerSet = this.handlers.get(channel)

    if (!handlerSet) {
      return
    }

    handlerSet.delete(onMessage)

    if (handlerSet.size === 0) {
      this.handlers.delete(channel)
      this.subscriptions.delete(channel)
      this.send({ action: '3', bizType, keys: [key] })
    }
  }

  resubscribeAll() {
    this.subscriptions.forEach(({ bizType, key }) => {
      this.send({
        action: '2',
        bizType,
        keys: [key],
      })
    })
  }

  handleMessage(rawData) {
    let message

    try {
      message = JSON.parse(rawData)
    } catch {
      return
    }

    if (message?.action === '1') {
      return
    }

    const bizType = message?.bizType
    const key = message?.key

    if (!bizType || !key) {
      return
    }

    const channel = toChannel(bizType, key)
    const handlerSet = this.handlers.get(channel)

    if (!handlerSet || handlerSet.size === 0) {
      return
    }

    const packet = {
      bizType,
      key,
      payload: message?.data,
      tickTime: message?.tickTime,
      raw: message,
    }

    handlerSet.forEach((handler) => handler(packet))
  }
}

export { WS_STATUS }
