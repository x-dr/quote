import { useEffect, useMemo, useState } from 'react'
import { Alert, Card, Col, Empty, Row, Tag, Typography } from 'antd'
import { TXQUOTE_SSE_API } from '../config/api'
import './StockMarketModule.css'

const DEFAULT_STOCK_CODES = ['sh000001', 'sz399001', 'hkHSI', 'usDJI', 'usIXIC', 'usINX']

const MARKET_SECTIONS = [
  {
    key: 'cn',
    title: 'A股',
    description: '上证与深证核心指数',
  },
  {
    key: 'hk',
    title: '港股',
    description: '恒生指数',
  },
  {
    key: 'us',
    title: '美股',
    description: '三大指数',
  },
]

const FALLBACK_CURRENCY_MAP = {
  cn: 'CNY',
  hk: 'HKD',
  us: 'USD',
}

const QUOTE_DECIMAL_MAP = {
  cn: 2,
  hk: 2,
  us: 2,
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function parseCompactTimestamp(value) {
  const text = String(value || '').trim()

  if (/^\d{14}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)} ${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}`
  }

  return ''
}

function normalizePlainTimestamp(value) {
  const text = String(value || '').trim()

  if (/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return text.replaceAll('/', '-')
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) {
    return text
  }

  return ''
}

function formatTimestamp(value) {
  if (!value) {
    return ''
  }

  const text = String(value).trim()
  const compact = parseCompactTimestamp(value)
  if (compact) {
    return compact
  }

  const plain = normalizePlainTimestamp(value)
  if (plain) {
    return plain
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(text)) {
    const parsed = Date.parse(text)
    return new Date(parsed).toLocaleString('zh-CN', { hour12: false })
  }

  return ''
}

function formatNowTimestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function detectMarketKey(symbol, marketType) {
  const symbolText = String(symbol || '').toLowerCase()
  const marketTypeText = String(marketType || '').toLowerCase()

  if (symbolText.startsWith('sh') || symbolText.startsWith('sz')) {
    return 'cn'
  }

  if (symbolText.startsWith('hk') || marketTypeText === 'hk') {
    return 'hk'
  }

  if (symbolText.startsWith('us') || marketTypeText === 'us') {
    return 'us'
  }

  if (marketTypeText === 'index') {
    return 'cn'
  }

  return 'cn'
}

function detectCurrency(data, marketKey) {
  if (typeof data?.currency === 'string' && /^[A-Z]{3}$/.test(data.currency)) {
    return data.currency
  }

  if (Array.isArray(data?.raw)) {
    const rawCurrency = data.raw.find((item) => typeof item === 'string' && /^[A-Z]{3}$/.test(item))
    if (rawCurrency) {
      return rawCurrency
    }
  }

  return FALLBACK_CURRENCY_MAP[marketKey] || 'CNY'
}

function mergeCodeOrder(incomingCodes, previousCodes) {
  const merged = []
  const seen = new Set()

  for (const code of [...incomingCodes, ...previousCodes]) {
    const normalized = String(code || '').trim()
    if (!normalized || seen.has(normalized)) {
      continue
    }

    seen.add(normalized)
    merged.push(normalized)
  }

  return merged
}

function extractQuoteEntries(payload) {
  if (Array.isArray(payload?.quotes)) {
    return payload.quotes
  }

  if (payload?.quotes && typeof payload.quotes === 'object') {
    return Object.values(payload.quotes)
  }

  if (payload?.quote) {
    return [payload.quote]
  }

  if (payload?.data && payload?.symbol) {
    return [payload]
  }

  return []
}

function extractQuoteTimestamp(data) {
  const directCandidates = [
    data?.updateTime,
    data?.tradeDateTime,
    data?.time,
    data?.timestamp,
  ]

  for (const candidate of directCandidates) {
    const formatted = formatTimestamp(candidate)
    if (formatted) {
      return formatted
    }
  }

  const rawList = Array.isArray(data?.raw) ? data.raw : []

  for (const item of rawList) {
    const formatted = formatTimestamp(item)
    if (formatted) {
      return formatted
    }
  }

  return ''
}

function normalizeTxQuoteEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const data = entry?.data && typeof entry.data === 'object' ? entry.data : entry
  const symbol = String(entry?.symbol || data?.symbol || '').trim()
  const code = String(data?.code || symbol || '').trim()

  if (!symbol && !code) {
    return null
  }

  const marketKey = detectMarketKey(symbol, data?.marketType)
  const displaySymbol = symbol || code

  return {
    id: displaySymbol,
    symbol: displaySymbol,
    code,
    name: String(data?.name || displaySymbol),
    marketKey,
    marketType: String(data?.marketType || ''),
    currency: detectCurrency(data, marketKey),
    price: toNumberOrNull(data?.price ?? data?.price4),
    change: toNumberOrNull(data?.change),
    changePercent: toNumberOrNull(data?.changePercent),
    open: toNumberOrNull(data?.open),
    high: toNumberOrNull(data?.high),
    low: toNumberOrNull(data?.low),
    prevClose: toNumberOrNull(data?.prevClose),
    amount: toNumberOrNull(data?.amount),
    volume: toNumberOrNull(data?.volume),
    amplitude: toNumberOrNull(data?.amplitude),
    avgPrice: toNumberOrNull(data?.avgPrice),
    volumeRatio: toNumberOrNull(data?.volumeRatio),
    turnoverRate: toNumberOrNull(data?.turnoverRate),
    updatedAt: extractQuoteTimestamp(data),
  }
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

function formatSignedNumber(value, digits = 2) {
  if (value === null || value === undefined) {
    return '--'
  }

  const formatted = formatNumber(Math.abs(value), digits)

  if (value > 0) {
    return `+${formatted}`
  }

  if (value < 0) {
    return `-${formatted}`
  }

  return formatted
}

function formatPercent(value, digits = 2, withSign = true) {
  if (value === null || value === undefined) {
    return '--'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }

  const formatted = formatNumber(Math.abs(numeric), digits)
  const prefix = withSign && numeric > 0 ? '+' : numeric < 0 ? '-' : ''
  return `${prefix}${formatted}%`
}

function formatCompactNumber(value) {
  if (value === null || value === undefined) {
    return '--'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }

  const absValue = Math.abs(numeric)

  if (absValue >= 1000000000000) {
    return `${formatNumber(numeric / 1000000000000, 2)}万亿`
  }

  if (absValue >= 100000000) {
    return `${formatNumber(numeric / 100000000, 2)}亿`
  }

  if (absValue >= 10000) {
    return `${formatNumber(numeric / 10000, 2)}万`
  }

  return formatNumber(numeric, 2)
}

function getTrend(change) {
  if (change === null || change === undefined || Number(change) === 0) {
    return 'flat'
  }

  return Number(change) > 0 ? 'up' : 'down'
}

function orderQuotes(quoteMap, codeOrder) {
  const rows = Object.values(quoteMap)
  const orderIndexMap = new Map(codeOrder.map((code, index) => [code, index]))

  return rows.sort((left, right) => {
    const leftIndex = orderIndexMap.get(left.symbol)
    const rightIndex = orderIndexMap.get(right.symbol)

    if (leftIndex !== undefined || rightIndex !== undefined) {
      if (leftIndex === undefined) {
        return 1
      }

      if (rightIndex === undefined) {
        return -1
      }

      return leftIndex - rightIndex
    }

    if (left.marketKey !== right.marketKey) {
      return left.marketKey.localeCompare(right.marketKey, 'en')
    }

    return left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
}

function buildSections(orderedQuotes) {
  return MARKET_SECTIONS.map((section) => ({
    ...section,
    rows: orderedQuotes.filter((item) => item.marketKey === section.key),
  }))
}

function SummaryMetric({ label, value }) {
  return (
    <div className="stock-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StockQuoteCard({ quote }) {
  const trend = getTrend(quote.change)
  const priceDigits = QUOTE_DECIMAL_MAP[quote.marketKey] || 2

  return (
    <Card size="small" className={`stock-quote-card trend-${trend}`}>
      <div className="stock-quote-head">
        <div>
          <Typography.Title level={4} className="stock-quote-name">
            {quote.name}
          </Typography.Title>
          <Typography.Text className="stock-quote-symbol">{quote.symbol}</Typography.Text>
        </div>
        <Tag bordered={false} className="stock-market-tag">
          {quote.currency}
        </Tag>
      </div>

      <div className="stock-price-row">
        <div className={`stock-price-value trend-${trend}`}>
          {formatNumber(quote.price, priceDigits)}
        </div>
        <div className={`stock-price-change trend-${trend}`}>
          <strong>{formatSignedNumber(quote.change, priceDigits)}</strong>
          <span>{formatPercent(quote.changePercent, 2)}</span>
        </div>
      </div>

      <div className="stock-stat-grid">
        <SummaryMetric label="今开" value={formatNumber(quote.open, priceDigits)} />
        <SummaryMetric label="最高" value={formatNumber(quote.high, priceDigits)} />
        <SummaryMetric label="最低" value={formatNumber(quote.low, priceDigits)} />
        <SummaryMetric label="昨收" value={formatNumber(quote.prevClose, priceDigits)} />
        <SummaryMetric label="成交量" value={formatCompactNumber(quote.volume)} />
        <SummaryMetric label="成交额" value={formatCompactNumber(quote.amount)} />
        <SummaryMetric label="振幅" value={formatPercent(quote.amplitude, 2, false)} />
        <SummaryMetric label="币种" value={quote.currency || '--'} />
      </div>

      <div className="stock-card-foot">
        <span>代码 {quote.code || '--'}</span>
        <span>更新时间 {quote.updatedAt || '--'}</span>
      </div>
    </Card>
  )
}

function StockMarketModule() {
  const [quoteMap, setQuoteMap] = useState({})
  const [codeOrder, setCodeOrder] = useState(DEFAULT_STOCK_CODES)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [streamUpdatedAt, setStreamUpdatedAt] = useState('')

  useEffect(() => {
    if (!TXQUOTE_SSE_API) {
      return undefined
    }

    let eventSource = null
    let closed = false

    const safeParse = (text) => {
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    const applyPayload = (payload, replaceAll = false) => {
      const nextEntries = extractQuoteEntries(payload).map(normalizeTxQuoteEntry).filter(Boolean)

      if (!nextEntries.length) {
        return
      }

      if (Array.isArray(payload?.codes) && payload.codes.length) {
        setCodeOrder((previous) => mergeCodeOrder(payload.codes, previous))
      }

      if (replaceAll) {
        const nextMap = {}
        nextEntries.forEach((item) => {
          nextMap[item.symbol] = item
        })
        setQuoteMap(nextMap)
      } else {
        setQuoteMap((previous) => {
          const nextMap = { ...previous }
          nextEntries.forEach((item) => {
            nextMap[item.symbol] = item
          })
          return nextMap
        })
      }

      setStreamUpdatedAt(formatTimestamp(payload?.timestamp) || formatNowTimestamp())
      setConnected(true)
      setError('')
    }

    const handleInit = (event) => {
      const payload = safeParse(event?.data)
      if (!payload) {
        return
      }

      applyPayload(payload, true)
    }

    const handleQuote = (event) => {
      const payload = safeParse(event?.data)
      if (!payload) {
        return
      }

      applyPayload(payload, false)
    }

    try {
      eventSource = new EventSource(TXQUOTE_SSE_API)
      eventSource.addEventListener('init', handleInit)
      eventSource.addEventListener('quote', handleQuote)
      eventSource.onmessage = handleQuote
      eventSource.onopen = () => {
        if (closed) {
          return
        }

        setConnected(true)
        setError('')
      }
      eventSource.onerror = () => {
        if (closed) {
          return
        }

        setConnected(false)
        setError('股票实时行情连接异常，正在等待服务自动重连')
      }
    } catch {
      window.setTimeout(() => {
        if (closed) {
          return
        }

        setConnected(false)
        setError('股票实时行情初始化失败')
      }, 0)
    }

    return () => {
      closed = true

      if (eventSource) {
        eventSource.removeEventListener('init', handleInit)
        eventSource.removeEventListener('quote', handleQuote)
        eventSource.close()
      }
    }
  }, [])

  const orderedQuotes = useMemo(() => orderQuotes(quoteMap, codeOrder), [quoteMap, codeOrder])
  const sections = useMemo(() => buildSections(orderedQuotes), [orderedQuotes])

  return (
    <div className="stock-layout">
      <Card className="stock-overview-card" variant="borderless">
        <div className="stock-overview-head">
          <div className="stock-overview-copy">
            <Typography.Title level={3} className="stock-overview-title">
              全球指数看板
            </Typography.Title>
            <Typography.Paragraph className="stock-overview-desc">
              接入 `txquote` 实时 SSE，当前展示 A 股、港股与美股核心指数。
            </Typography.Paragraph>
          </div>
          <div className="stock-overview-tags">
            <Tag color={connected ? 'success' : 'default'}>{connected ? '已连接' : '未连接'}</Tag>
            <Tag>{orderedQuotes.length} 只</Tag>
            <Tag>源 `txquote/stream`</Tag>
            {streamUpdatedAt ? <Tag>SSE 更新时间 {streamUpdatedAt}</Tag> : null}
          </div>
        </div>

        {error ? (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message={error}
          />
        ) : null}

        <Row gutter={[12, 12]} className="stock-summary-grid-row">
          {MARKET_SECTIONS.map((section) => {
            const rows = sections.find((item) => item.key === section.key)?.rows || []

            return (
              <Col xs={24} md={8} key={section.key}>
                <div className="stock-summary-tile">
                  <Typography.Text className="stock-summary-title">
                    {section.title}
                  </Typography.Text>
                  <Typography.Paragraph className="stock-summary-desc">
                    {section.description}
                  </Typography.Paragraph>
                  <strong>{rows.length}</strong>
                  <span>只标的</span>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>

      {orderedQuotes.length ? (
        sections.map((section) =>
          section.rows.length ? (
            <Card
              key={section.key}
              className="stock-section-card"
              title={section.title}
              extra={<span className="stock-section-extra">{section.rows.length} 只</span>}
            >
              <Typography.Paragraph className="stock-section-desc">
                {section.description}
              </Typography.Paragraph>
              <Row gutter={[12, 12]}>
                {section.rows.map((quote) => (
                  <Col xs={24} md={12} key={quote.id}>
                    <StockQuoteCard quote={quote} />
                  </Col>
                ))}
              </Row>
            </Card>
          ) : null,
        )
      ) : (
        <Card className="stock-section-card">
          <Empty description="等待股票行情推送" />
        </Card>
      )}
    </div>
  )
}

export default StockMarketModule
