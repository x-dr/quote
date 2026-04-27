import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Segmented,
  Select,
  Spin,
  Typography,
  message,
} from 'antd'
import { InfoCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  cfgetTimeSharingDots,
  cfGetKlineInfo,
  cfGetMinKlineInfo,
  cfGetSimpleQuote,
  getGoldCountryList,
  getHistoryETFSpreads,
  getHistoryGoldCentralBankReserve,
  getRangeTimeSharingDotsByNums,
  homeFeedFlow,
} from '../services/quoteApi'
import { QuoteWebSocketClient, WS_STATUS } from '../services/wsClient'
import './GoldMarketModule.css'

const CHART_WIDTH = 680
const CHART_HEIGHT = 300
const CHART_PADDING_X = 10
const CHART_PADDING_Y = 12
const DATA_CHART_WIDTH = 660
const DATA_CHART_HEIGHT = 230
const DATA_CHART_PADDING_X = 10
const DATA_CHART_PADDING_Y = 12

const GOLD_SKU_OPTIONS = [
  { label: '京东黄金', value: 'WG-JDAU' },
  { label: '伦敦金', value: 'WG-XAUUSD' },
  { label: '黄金9999', value: 'SGE-Au99.99' },
]

const SKU_UNIQUE_CODE_MAP = {
  'WG-JDAU': 'WG-JDAU',
  'WG-XAUUSD': 'WG-XAUUSD',
  'SGE-Au99.99': 'SGE-Au99.99',
}

const DEFAULT_CHART_UCODE = 'WG-JDAU'

const SKU_CHART_UCODE_MAP = {
  'WG-JDAU': 'WG-JDAU',
  'WG-XAUUSD': 'WG-XAUUSD',
  'SGE-Au99.99': 'SGE-Au99.99',
}

const QUOTE_KEYS = {
  KLINE: 'WG-JDAU',
  LONDON: 'WG-XAUUSD',
  GOLD_9999: 'SGE-Au99.99',
}

const DEFAULT_PRIMARY_WS_KEY = QUOTE_KEYS.KLINE
const FIXED_WS_QUOTE_KEYS = [QUOTE_KEYS.LONDON, QUOTE_KEYS.GOLD_9999]

const CHART_POINT_LIMIT = 600
const TIME_INCREMENT_INTERVAL_MS = 4000
const TIME_INCREMENT_BATCH_SIZE = 3
const DAY_INCREMENT_INTERVAL_MS = 10000
const MIN_KLINE_INCREMENT_INTERVAL_MS = 4000

const MIN_KLINE_TIMEFRAME_TYPE_MAP = {
  m1: 1,
  m5: 5,
  m15: 15,
  m30: 30,
  m60: 60,
  m120: 120,
}

const TIMEFRAME_OPTIONS = [
  { label: '分时', value: 'time' },
  { label: '日K', value: 'day' },
  { label: '1分', value: 'm1' },
  { label: '5分', value: 'm5' },
  { label: '15分', value: 'm15' },
  { label: '更多', value: 'more' },
]

const MORE_MIN_TIMEFRAME_OPTIONS = [
  { label: '30分', value: 'm30' },
  { label: '60分', value: 'm60' },
  { label: '120分', value: 'm120' },
]

const BOARD_OPTIONS = [
  { label: '投机情绪', value: 'sentiment' },
  { label: '数据图表', value: 'table' },
]

const RESERVE_METRIC_OPTIONS = [
  { label: '按重量计', value: 'weight' },
  { label: '按价值计', value: 'value' },
]

const TIMEFRAME_LABEL_MAP = {
  time: '分时',
  day: '日K',
  m1: '1分',
  m5: '5分',
  m15: '15分',
  m30: '30分',
  m60: '60分',
  m120: '120分',
  more: '更多',
}

const isMinKlineTimeframe = (timeframe) =>
  Object.prototype.hasOwnProperty.call(MIN_KLINE_TIMEFRAME_TYPE_MAP, timeframe)

const getStatusMeta = (status) => {
  if (status === WS_STATUS.CONNECTED) {
    return { text: '实时连接中', color: 'success' }
  }

  if (status === WS_STATUS.CONNECTING || status === WS_STATUS.RECONNECTING) {
    return { text: '连接中', color: 'processing' }
  }

  return { text: '未连接', color: 'default' }
}

const pickFirst = (source, candidates) => {
  for (const key of candidates) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return null
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = String(value).replaceAll(',', '').replace('%', '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const toTimestamp = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? (value > 9999999999 ? value : value * 1000) : null
  }

  const text = String(value).trim()

  if (/^\d{14}$/.test(text)) {
    const year = Number(text.slice(0, 4))
    const month = Number(text.slice(4, 6))
    const day = Number(text.slice(6, 8))
    const hour = Number(text.slice(8, 10))
    const minute = Number(text.slice(10, 12))
    const second = Number(text.slice(12, 14))

    return new Date(year, month - 1, day, hour, minute, second).getTime()
  }

  if (/^\d{8}$/.test(text)) {
    const year = Number(text.slice(0, 4))
    const month = Number(text.slice(4, 6))
    const day = Number(text.slice(6, 8))

    return new Date(year, month - 1, day, 0, 0, 0).getTime()
  }

  const parsedTime = Date.parse(text.includes('T') ? text : text.replace(' ', 'T'))
  if (Number.isFinite(parsedTime)) {
    return parsedTime
  }

  const numericValue = Number(text)
  if (Number.isFinite(numericValue)) {
    return numericValue > 9999999999 ? numericValue : numericValue * 1000
  }

  return null
}

const normalizeTime = (value) => {
  const normalized = toTimestamp(value)
  return normalized ?? Date.now()
}

const normalizeQuote = (payload, meta = {}) => {
  const source = Array.isArray(payload?.datas)
    ? payload.datas[0]
    : payload?.datas || payload?.data || payload

  if (!source || typeof source !== 'object') {
    return null
  }

  const latestPrice = toNumber(
    pickFirst(source, ['latestPrice', 'lastPrice', 'price', 'newPrice', 'currentPrice']),
  )
  const changeAmount = toNumber(
    pickFirst(source, ['changeAmount', 'riseAmount', 'increaseAmount', 'change', 'raise']),
  )
  const changePercent = toNumber(
    pickFirst(source, [
      'changePercent',
      'riseRate',
      'increaseRate',
      'changeRatio',
      'raisePercent',
    ]),
  )
  const openPrice = toNumber(pickFirst(source, ['openPrice', 'open']))
  const preClosePrice = toNumber(
    pickFirst(source, ['preClose', 'preClosePrice', 'closePrice', 'yesClose']),
  )
  const highPrice = toNumber(pickFirst(source, ['highPrice', 'high', 'maxPrice']))
  const lowPrice = toNumber(pickFirst(source, ['lowPrice', 'low', 'minPrice']))

  return {
    code: pickFirst(source, ['uniqueCode', 'productSku', 'symbol', 'code']) || meta.code || '-',
    latestPrice,
    changeAmount,
    changePercent,
    openPrice,
    preClosePrice,
    highPrice,
    lowPrice,
    updateTime: normalizeTime(
      pickFirst(source, ['tradeDateTime', 'tradeTime', 'quoteTime', 'time', 'updateTime']) ||
        meta.tickTime,
    ),
    sourceRaw: source,
  }
}

const formatPrice = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

const formatSigned = (value, digits = 2, suffix = '') => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  const numeric = Number(value)
  const sign = numeric > 0 ? '+' : ''
  const formatted = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric)
  return `${sign}${formatted}${suffix}`
}

const getTrendClass = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric === 0) {
    return 'flat'
  }

  return numeric > 0 ? 'up' : 'down'
}

const formatClock = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
  })

const padTwo = (value) => String(value).padStart(2, '0')

const formatDateForApi = (date = new Date()) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`

const buildRequestDateTime = (date = new Date()) =>
  `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}${padTwo(
    date.getHours(),
  )}${padTwo(date.getMinutes())}${padTwo(date.getSeconds())}`

const buildRequestDate = (date = new Date()) =>
  `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}`

const formatDayLabel = (timestamp) => {
  if (!Number.isFinite(timestamp)) {
    return '--'
  }

  const date = new Date(timestamp)
  const monthDay = `${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
  const now = new Date()

  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return `今天 ${monthDay}`
  }

  return monthDay
}

const isSentimentPost = (item) => {
  const content = String(item?.content || '')
  return content.includes('投机情绪')
}

const parseSentimentDays = (payload) => {
  const rows = payload?.resultData?.resultList

  if (!Array.isArray(rows)) {
    return []
  }

  const grouped = new Map()

  for (const row of rows) {
    if (!isSentimentPost(row)) {
      continue
    }

    const timestamp = toTimestamp(row?.publishTime)
    if (!Number.isFinite(timestamp)) {
      continue
    }

    const dayKeyDate = new Date(timestamp)
    const dayKey = `${dayKeyDate.getFullYear()}-${padTwo(dayKeyDate.getMonth() + 1)}-${padTwo(dayKeyDate.getDate())}`
    const current = grouped.get(dayKey) || {
      key: dayKey,
      dateLabel: formatDayLabel(timestamp),
      dayTimestamp: new Date(dayKeyDate.getFullYear(), dayKeyDate.getMonth(), dayKeyDate.getDate()).getTime(),
      entries: [],
    }

    current.entries.push({
      id: String(row?.contentId || `${dayKey}-${timestamp}`),
      time: formatClock(timestamp),
      title: String(row?.content || '投机情绪'),
      imageUrl: Array.isArray(row?.imgUrlList) ? row.imgUrlList[0] || '' : '',
      jumpUrl: row?.jumpData?.jumpUrl || '',
      publishTime: timestamp,
      gauges: [],
    })

    grouped.set(dayKey, current)
  }

  const days = [...grouped.values()]
  days.sort((left, right) => right.dayTimestamp - left.dayTimestamp)
  for (const day of days) {
    day.entries.sort((left, right) => right.publishTime - left.publishTime)
  }

  return days
}

const normalizeDateTimeValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'object') {
    const year = Number(value.year)
    const month = Number(value.monthValue)
    const day = Number(value.dayOfMonth)
    const hour = Number(value.hour)
    const minute = Number(value.minute)
    const second = Number(value.second ?? 0)

    if ([year, month, day, hour, minute, second].every(Number.isFinite)) {
      return `${year}-${padTwo(month)}-${padTwo(day)} ${padTwo(hour)}:${padTwo(minute)}:${padTwo(second)}`
    }
  }

  return null
}

const formatAxisLabel = (value, timeframe) => {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const text = String(value).trim()

  if (/^\d{14}$/.test(text)) {
    if (timeframe === 'day') {
      return `${text.slice(4, 6)}-${text.slice(6, 8)}`
    }

    return `${text.slice(8, 10)}:${text.slice(10, 12)}`
  }

  if (/^\d{8}$/.test(text)) {
    return `${text.slice(4, 6)}-${text.slice(6, 8)}`
  }

  if (text.includes(' ')) {
    const [dateText, timeText = ''] = text.split(' ')
    if (timeframe === 'day') {
      return dateText.slice(5)
    }

    return timeText.slice(0, 5) || dateText.slice(5)
  }

  const parsedTime = toTimestamp(text)
  if (parsedTime) {
    const date = new Date(parsedTime)
    if (timeframe === 'day') {
      return `${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
    }

    return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`
  }

  return text
}

const extractApiData = (payload) => payload?.resultData?.data || payload?.data || payload

const parseTimeSharingDots = (payload, timeframe) => {
  const source = extractApiData(payload)
  const rows = source?.timeSharingDots || source?.timeSharingDotItemDTOList

  if (!Array.isArray(rows)) {
    return []
  }

  return rows
    .map((row, index) => {
      const price = toNumber(
        pickFirst(row, ['lastPrice', 'latestPrice', 'price', 'newPrice', 'closePrice']),
      )

      if (price === null) {
        return null
      }

      const tradeTime = normalizeDateTimeValue(pickFirst(row, ['tradeDateTime', 'time']))
      const viewTime = normalizeDateTimeValue(pickFirst(row, ['viewDateTime']))
      const rawTime = tradeTime || viewTime

      if (!rawTime) {
        return null
      }

      return {
        id: `${index}-${rawTime || 'time-dot'}`,
        timestamp: toTimestamp(rawTime),
        label: formatAxisLabel(rawTime, timeframe),
        price: Number(price.toFixed(2)),
      }
    })
    .filter(Boolean)
}

const parseKlineRows = (payload, timeframe) => {
  const source = extractApiData(payload)
  const rows = source?.klineInfo

  if (!Array.isArray(rows)) {
    return []
  }

  return rows
    .map((row, index) => {
      if (Array.isArray(row)) {
        const price = toNumber(row[5] ?? row[2] ?? row[1])
        const rawTime = row[0]

        if (price === null) {
          return null
        }

        return {
          id: `${index}-${rawTime || 'kline-row'}`,
          timestamp: toTimestamp(rawTime),
          label: formatAxisLabel(rawTime, timeframe),
          price: Number(price.toFixed(2)),
        }
      }

      const price = toNumber(
        pickFirst(row, ['closePrice', 'close', 'lastPrice', 'latestPrice', 'newPrice']),
      )
      const rawTime = pickFirst(row, ['tradeDateTime', 'viewDateTime', 'dateTime', 'date', 'time'])

      if (price === null) {
        return null
      }

      return {
        id: `${index}-${rawTime || 'kline-object'}`,
        timestamp: toTimestamp(rawTime),
        label: formatAxisLabel(rawTime, timeframe),
        price: Number(price.toFixed(2)),
      }
    })
    .filter(Boolean)
}

const normalizeChartRows = (rows) => {
  const normalized = rows.map((row, index) => ({ ...row, order: index }))
  normalized.sort((left, right) => {
    const leftHasTime = Number.isFinite(left.timestamp)
    const rightHasTime = Number.isFinite(right.timestamp)

    if (leftHasTime && rightHasTime) {
      return left.timestamp - right.timestamp
    }

    if (leftHasTime) {
      return -1
    }

    if (rightHasTime) {
      return 1
    }

    return left.order - right.order
  })

  return normalized.slice(-CHART_POINT_LIMIT)
}

const mergeRowsByTimestamp = (baseRows, incomingRows) => {
  if (!incomingRows.length) {
    return normalizeChartRows(baseRows)
  }

  const rowMap = new Map()
  const buildKey = (row) => {
    if (Number.isFinite(row.timestamp)) {
      return `t-${row.timestamp}`
    }

    return `l-${row.label || ''}`
  }

  for (const row of baseRows) {
    rowMap.set(buildKey(row), row)
  }

  for (const row of incomingRows) {
    rowMap.set(buildKey(row), row)
  }

  return normalizeChartRows([...rowMap.values()])
}

const toChartSeriesModel = (rows) => {
  if (!rows.length) {
    return {
      series: [],
      labels: [],
    }
  }

  const clipped = normalizeChartRows(rows)
  return {
    series: clipped.map((item) => item.price),
    labels: clipped.map((item) => item.label),
  }
}

const buildTimeframeRequestPlan = (timeframe, chartUCode) => {
  const dateTime = buildRequestDateTime()

  if (timeframe === 'time') {
    return [
      {
        fetcher: () =>
          cfgetTimeSharingDots({
            uniqueCode: chartUCode,
            type: 'm1',
            dateTime,
          }),
        parser: parseTimeSharingDots,
      },
      {
        fetcher: () =>
          getRangeTimeSharingDotsByNums({
            uniqueCode: chartUCode,
            type: 'm1',
            nums: 120,
            dateTime,
          }),
        parser: parseTimeSharingDots,
      },
    ]
  }

  if (timeframe === 'day') {
    return [
      {
        fetcher: () =>
          cfGetKlineInfo({
            type: 1,
            fq: 1,
            uCode: chartUCode,
          }),
        parser: parseKlineRows,
      },
    ]
  }

  if (isMinKlineTimeframe(timeframe)) {
    const minType = MIN_KLINE_TIMEFRAME_TYPE_MAP[timeframe]

    return [
      {
        fetcher: () =>
          cfGetMinKlineInfo({
            type: minType,
            fq: 1,
            uCode: chartUCode,
          }),
        parser: parseKlineRows,
      },
    ]
  }

  return [
    {
      fetcher: () =>
        cfGetMinKlineInfo({
          type: 15,
          fq: 1,
          uCode: chartUCode,
        }),
      parser: parseKlineRows,
    },
    {
      fetcher: () =>
        cfGetKlineInfo({
          type: 1,
          fq: 1,
          uCode: chartUCode,
        }),
      parser: parseKlineRows,
    },
  ]
}

const buildFallbackSeries = (basePrice, size = 120) => {
  let current = basePrice

  return Array.from({ length: size }, (_, index) => {
    const wave = Math.sin(index / 7) * 0.9 + Math.cos(index / 12) * 0.65
    const pulse = Math.sin(index / 3.8) * 0.25
    current += (wave + pulse) * 0.16
    return Number(current.toFixed(2))
  })
}

const createChartGeometry = (values, referencePrice) => {
  const safeValues = values.length > 1 ? values : [referencePrice, referencePrice]

  const minPrice = Math.min(...safeValues, referencePrice)
  const maxPrice = Math.max(...safeValues, referencePrice)
  const range = Math.max(maxPrice - minPrice, 1)
  const innerWidth = CHART_WIDTH - CHART_PADDING_X * 2
  const innerHeight = CHART_HEIGHT - CHART_PADDING_Y * 2

  const points = safeValues.map((price, index) => {
    const progress = safeValues.length === 1 ? 0 : index / (safeValues.length - 1)
    const x = CHART_PADDING_X + innerWidth * progress
    const y = CHART_PADDING_Y + ((maxPrice - price) / range) * innerHeight

    return { x, y }
  })

  const linePath = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = `${points[0].x},${CHART_HEIGHT - CHART_PADDING_Y} ${linePath} ${points[points.length - 1].x},${CHART_HEIGHT - CHART_PADDING_Y}`
  const referenceY =
    CHART_PADDING_Y + ((maxPrice - referencePrice) / range) * innerHeight

  return {
    minPrice,
    maxPrice,
    referenceY,
    linePath,
    areaPath,
  }
}

const parseTupleSeries = (rows) => {
  if (!Array.isArray(rows)) {
    return []
  }

  return rows
    .map((row, index) => {
      const label = Array.isArray(row) ? row[0] : pickFirst(row, ['date', 'time', 'label'])
      const numeric = toNumber(Array.isArray(row) ? row[1] : pickFirst(row, ['value', 'amount']))

      if (!label || numeric === null) {
        return null
      }

      return {
        id: `${label}-${index}`,
        label: String(label),
        value: Number(numeric),
      }
    })
    .filter(Boolean)
}

const toDataChartModel = (rows, fallbackSize = 180) => {
  const safeRows = rows.slice(-fallbackSize)

  return {
    series: safeRows.map((item) => item.value),
    labels: safeRows.map((item) => item.label),
  }
}

const createDataChartGeometry = (values) => {
  const safeValues = values.length > 1 ? values : [values[0] || 0, values[0] || 0]
  const minValue = Math.min(...safeValues)
  const maxValue = Math.max(...safeValues)
  const range = Math.max(maxValue - minValue, 1)
  const innerWidth = DATA_CHART_WIDTH - DATA_CHART_PADDING_X * 2
  const innerHeight = DATA_CHART_HEIGHT - DATA_CHART_PADDING_Y * 2

  const points = safeValues.map((value, index) => {
    const progress = safeValues.length === 1 ? 0 : index / (safeValues.length - 1)
    const x = DATA_CHART_PADDING_X + innerWidth * progress
    const y = DATA_CHART_PADDING_Y + ((maxValue - value) / range) * innerHeight

    return { x, y }
  })

  const linePath = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = `${points[0].x},${DATA_CHART_HEIGHT - DATA_CHART_PADDING_Y} ${linePath} ${points[points.length - 1].x},${DATA_CHART_HEIGHT - DATA_CHART_PADDING_Y}`

  const tickValues = Array.from({ length: 5 }, (_, index) => maxValue - (range / 4) * index)

  return {
    linePath,
    areaPath,
    tickValues,
    tickY: Array.from({ length: 5 }, (_, index) =>
      DATA_CHART_PADDING_Y + (innerHeight / 4) * index,
    ),
  }
}

const pickAxisLabels = (labels) => {
  if (!labels.length) {
    return ['--', '--', '--']
  }

  const middleIndex = Math.floor((labels.length - 1) / 2)
  return [labels[0] || '--', labels[middleIndex] || '--', labels[labels.length - 1] || '--']
}

const formatDataValue = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function SentimentGauge({ name, bull, bear }) {
  const pointer = Math.max(0, Math.min(180, bull * 1.8))

  return (
    <div className="sentiment-gauge">
      <div className="sentiment-gauge-name">{name}</div>
      <div className="sentiment-gauge-arc">
        <div
          className="sentiment-gauge-needle"
          style={{ transform: `rotate(${pointer - 90}deg)` }}
        ></div>
      </div>
      <div className="sentiment-gauge-values">
        <span className="bull">多头 {formatPrice(bull)}%</span>
        <span className="bear">空头 {formatPrice(bear)}%</span>
      </div>
    </div>
  )
}

function GoldMarketModule() {
  const clientRef = useRef(null)
  const snapshotRequestRef = useRef(0)
  const chartRequestRef = useRef(0)
  const timeSeriesRowsRef = useRef([])
  const daySeriesRowsRef = useRef([])
  const minKlineSeriesRowsRef = useRef([])

  const [productSku, setProductSku] = useState(GOLD_SKU_OPTIONS[0].value)
  const [wsStatus, setWsStatus] = useState(WS_STATUS.DISCONNECTED)
  const [snapshot, setSnapshot] = useState(null)
  const [ticks, setTicks] = useState([])
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState('')
  const [chartSeries, setChartSeries] = useState([])
  const [chartLabels, setChartLabels] = useState([])
  const [externalQuoteMap, setExternalQuoteMap] = useState({})
  const [wsPrimaryKey, setWsPrimaryKey] = useState(DEFAULT_PRIMARY_WS_KEY)
  const [timeframe, setTimeframe] = useState('time')
  const [moreTimeframe, setMoreTimeframe] = useState('m30')
  const [boardTab, setBoardTab] = useState('sentiment')
  const [sentimentDays, setSentimentDays] = useState([])
  const [sentimentLoading, setSentimentLoading] = useState(false)
  const [sentimentError, setSentimentError] = useState('')
  const [dataChartLoading, setDataChartLoading] = useState(false)
  const [dataChartError, setDataChartError] = useState('')
  const [countryOptions, setCountryOptions] = useState([])
  const [selectedCountry, setSelectedCountry] = useState('CHN')
  const [reserveMetric, setReserveMetric] = useState('weight')
  const [reserveData, setReserveData] = useState({
    updateAt: '',
    tag: '',
    weightRows: [],
    valueRows: [],
  })
  const [etfData, setEtfData] = useState({
    updateAt: '',
    rows: [],
  })

  const uniqueCode = useMemo(() => SKU_UNIQUE_CODE_MAP[productSku] || 'AU9999', [productSku])
  const chartUCode = useMemo(
    () => SKU_CHART_UCODE_MAP[productSku] || DEFAULT_CHART_UCODE,
    [productSku],
  )
  const wsSubscribeKeys = useMemo(
    () => [...new Set([wsPrimaryKey || DEFAULT_PRIMARY_WS_KEY, ...FIXED_WS_QUOTE_KEYS])],
    [wsPrimaryKey],
  )
  const activeTimeframe = useMemo(
    () => (timeframe === 'more' ? moreTimeframe : timeframe),
    [moreTimeframe, timeframe],
  )

  const activeCountryOption = useMemo(
    () =>
      countryOptions.find((item) => item.value === selectedCountry) ||
      countryOptions[0] ||
      null,
    [countryOptions, selectedCountry],
  )

  const reserveRows = useMemo(
    () => (reserveMetric === 'weight' ? reserveData.weightRows : reserveData.valueRows),
    [reserveData.valueRows, reserveData.weightRows, reserveMetric],
  )

  const reserveChartModel = useMemo(() => toDataChartModel(reserveRows), [reserveRows])
  const etfChartModel = useMemo(() => toDataChartModel(etfData.rows), [etfData.rows])
  const reserveCurrentValue = useMemo(
    () => reserveChartModel.series[reserveChartModel.series.length - 1] ?? null,
    [reserveChartModel.series],
  )
  const etfCurrentValue = useMemo(
    () => etfChartModel.series[etfChartModel.series.length - 1] ?? null,
    [etfChartModel.series],
  )
  const reserveGeometry = useMemo(
    () => createDataChartGeometry(reserveChartModel.series),
    [reserveChartModel.series],
  )
  const etfGeometry = useMemo(() => createDataChartGeometry(etfChartModel.series), [etfChartModel.series])
  const reserveAxisLabels = useMemo(
    () => pickAxisLabels(reserveChartModel.labels),
    [reserveChartModel.labels],
  )
  const etfAxisLabels = useMemo(() => pickAxisLabels(etfChartModel.labels), [etfChartModel.labels])

  const handleProductSkuChange = useCallback((nextSku) => {
    setProductSku(nextSku)
    setWsPrimaryKey(nextSku || DEFAULT_PRIMARY_WS_KEY)
    setSnapshot(null)
    setTicks([])
    setChartSeries([])
    setChartLabels([])
    setSnapshotError('')
    setChartError('')
    timeSeriesRowsRef.current = []
    daySeriesRowsRef.current = []
    minKlineSeriesRowsRef.current = []
  }, [])

  useEffect(() => {
    const client = new QuoteWebSocketClient()
    clientRef.current = client

    const offStatus = client.onStatusChange((nextStatus) => {
      setWsStatus(nextStatus)
    })

    client.connect()

    return () => {
      offStatus()
      client.disconnect()
      clientRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!clientRef.current) {
      return undefined
    }

    const onWsMessage = (packet) => {
      const normalized = normalizeQuote(packet.payload, {
        code: packet.key,
        tickTime: packet.tickTime,
      })

      if (!normalized) {
        return
      }

      setExternalQuoteMap((previous) => ({
        ...previous,
        [packet.key]: {
          ...(previous[packet.key] || {}),
          ...normalized,
          source: 'ws',
        },
      }))

      if (packet?.key !== wsPrimaryKey) {
        return
      }

      setSnapshot((previous) => ({ ...previous, ...normalized, source: 'ws' }))
      setTicks((previous) => {
        const next = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            ...normalized,
            source: 'ws',
          },
          ...previous,
        ]

        return next.slice(0, 200)
      })
    }

    const unsubs = wsSubscribeKeys.map((key) =>
      clientRef.current.subscribe({
        marketType: '2',
        key,
        onMessage: onWsMessage,
      }),
    )

    return () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
    }
  }, [wsPrimaryKey, wsSubscribeKeys])

  const fetchSnapshot = useCallback(
    async (showToast = true) => {
      const requestId = snapshotRequestRef.current + 1
      snapshotRequestRef.current = requestId

      setSnapshotLoading(true)
      setSnapshotError('')

      try {
        const [response, londonResponse, gold9999Response] = await Promise.all([
          cfGetSimpleQuote({ uniqueCode }),
          cfGetSimpleQuote({ uniqueCode: QUOTE_KEYS.LONDON }),
          cfGetSimpleQuote({ uniqueCode: QUOTE_KEYS.GOLD_9999 }),
        ])

        const normalized = normalizeQuote(response, {
          code: uniqueCode,
        })
        const londonQuote = normalizeQuote(londonResponse, {
          code: QUOTE_KEYS.LONDON,
        })
        const gold9999Quote = normalizeQuote(gold9999Response, {
          code: QUOTE_KEYS.GOLD_9999,
        })

        if (!normalized) {
          throw new Error('快照接口未返回可识别数据')
        }

        if (requestId !== snapshotRequestRef.current) {
          return
        }

        setSnapshot((previous) => ({ ...previous, ...normalized, source: 'rest' }))
        setTicks((previous) => [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            ...normalized,
            source: 'rest',
          },
          ...previous,
        ])
        setExternalQuoteMap((previous) => {
          const next = { ...previous }

          if (londonQuote) {
            next[QUOTE_KEYS.LONDON] = {
              ...(previous[QUOTE_KEYS.LONDON] || {}),
              ...londonQuote,
              source: 'rest',
            }
          }

          if (gold9999Quote) {
            next[QUOTE_KEYS.GOLD_9999] = {
              ...(previous[QUOTE_KEYS.GOLD_9999] || {}),
              ...gold9999Quote,
              source: 'rest',
            }
          }

          return next
        })

        if (showToast) {
          message.success('报价已刷新')
        }
      } catch (error) {
        if (requestId !== snapshotRequestRef.current) {
          return
        }

        const text = error instanceof Error ? error.message : '快照请求失败'
        setSnapshotError(text)

        if (showToast) {
          message.error(text)
        }
      } finally {
        if (requestId === snapshotRequestRef.current) {
          setSnapshotLoading(false)
        }
      }
    },
    [uniqueCode],
  )

  const fetchChartSeries = useCallback(
    async (targetTimeframe = 'time', showToast = false) => {
      const requestId = chartRequestRef.current + 1
      chartRequestRef.current = requestId

      setChartLoading(true)
      setChartError('')

      const activeTimeframe = targetTimeframe || 'time'
      const timeframeLabel = TIMEFRAME_LABEL_MAP[activeTimeframe] || activeTimeframe
      const requestPlan = buildTimeframeRequestPlan(activeTimeframe, chartUCode)

      let lastError = null

      try {
        for (const requestItem of requestPlan) {
          try {
            const response = await requestItem.fetcher()
            const rows = requestItem.parser(response, activeTimeframe)
            const model = toChartSeriesModel(rows)

            if (model.series.length >= 2) {
              if (requestId !== chartRequestRef.current) {
                return
              }

              if (activeTimeframe === 'time') {
                timeSeriesRowsRef.current = normalizeChartRows(rows)
                daySeriesRowsRef.current = []
                minKlineSeriesRowsRef.current = []
              } else if (activeTimeframe === 'day') {
                daySeriesRowsRef.current = normalizeChartRows(rows)
                timeSeriesRowsRef.current = []
                minKlineSeriesRowsRef.current = []
              } else if (isMinKlineTimeframe(activeTimeframe)) {
                minKlineSeriesRowsRef.current = normalizeChartRows(rows)
                timeSeriesRowsRef.current = []
                daySeriesRowsRef.current = []
              } else {
                timeSeriesRowsRef.current = []
                daySeriesRowsRef.current = []
                minKlineSeriesRowsRef.current = []
              }

              setChartSeries(model.series)
              setChartLabels(model.labels)

              if (showToast) {
                message.success(`${timeframeLabel}图线已刷新`)
              }

              return
            }

            lastError = new Error(`${timeframeLabel}接口暂无可用数据`)
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(`${timeframeLabel}请求失败`)
          }
        }

        if (requestId !== chartRequestRef.current) {
          return
        }

        const text = lastError instanceof Error ? lastError.message : `${timeframeLabel}请求失败`
        setChartError(text)
        setChartSeries([])
        setChartLabels([])

        if (showToast) {
          message.error(text)
        }
      } finally {
        if (requestId === chartRequestRef.current) {
          setChartLoading(false)
        }
      }
    },
    [chartUCode],
  )

  const fetchTimeIncremental = useCallback(async () => {
    if (activeTimeframe !== 'time') {
      return
    }

    try {
      const response = await getRangeTimeSharingDotsByNums({
        uniqueCode: chartUCode,
        type: 'm1',
        nums: TIME_INCREMENT_BATCH_SIZE,
        dateTime: buildRequestDateTime(),
      })

      const incomingRows = parseTimeSharingDots(response, 'time')
      if (!incomingRows.length) {
        return
      }

      const mergedRows = mergeRowsByTimestamp(timeSeriesRowsRef.current, incomingRows)
      const model = toChartSeriesModel(mergedRows)

      timeSeriesRowsRef.current = mergedRows
      setChartSeries(model.series)
      setChartLabels(model.labels)
      setChartError('')
    } catch {
      // 增量轮询失败时静默，不覆盖首屏已加载数据
    }
  }, [activeTimeframe, chartUCode])

  const fetchDayIncremental = useCallback(async () => {
    if (activeTimeframe !== 'day') {
      return
    }

    try {
      const response = await cfGetKlineInfo({
        type: 1,
        fq: 1,
        uCode: chartUCode,
        count: 100,
        date: buildRequestDate(),
      })

      const incomingRows = parseKlineRows(response, 'day')
      if (!incomingRows.length) {
        return
      }

      const mergedRows = mergeRowsByTimestamp(daySeriesRowsRef.current, incomingRows)
      const model = toChartSeriesModel(mergedRows)

      daySeriesRowsRef.current = mergedRows
      setChartSeries(model.series)
      setChartLabels(model.labels)
      setChartError('')
    } catch {
      // 日K增量失败时静默，不覆盖首屏已加载数据
    }
  }, [activeTimeframe, chartUCode])

  const fetchMinKlineIncremental = useCallback(async () => {
    if (!isMinKlineTimeframe(activeTimeframe)) {
      return
    }

    try {
      const minType = MIN_KLINE_TIMEFRAME_TYPE_MAP[activeTimeframe]
      const response = await cfGetMinKlineInfo({
        type: minType,
        uCode: chartUCode,
        count: 100,
        dateTime: buildRequestDateTime(),
      })

      const incomingRows = parseKlineRows(response, activeTimeframe)
      if (!incomingRows.length) {
        return
      }

      const mergedRows = mergeRowsByTimestamp(minKlineSeriesRowsRef.current, incomingRows)
      const model = toChartSeriesModel(mergedRows)

      minKlineSeriesRowsRef.current = mergedRows
      setChartSeries(model.series)
      setChartLabels(model.labels)
      setChartError('')
    } catch {
      // 分钟K增量失败时静默，不覆盖首屏已加载数据
    }
  }, [activeTimeframe, chartUCode])

  const fetchSentiment = useCallback(
    async (showToast = false) => {
      setSentimentLoading(true)
      setSentimentError('')

      try {
        const response = await homeFeedFlow({
          lastId: '',
          tagId: 20826,
          invokeSource: 'lego',
          extParams: {
            requestFrom: 'h5',
          },
        })

        const days = parseSentimentDays(response)
        setSentimentDays(days)

        if (!days.length) {
          const emptyText = '投机情绪接口暂无数据'
          setSentimentError(emptyText)
          if (showToast) {
            message.warning(emptyText)
          }
          return
        }

        if (showToast) {
          message.success('投机情绪已刷新')
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : '投机情绪请求失败'
        setSentimentError(text)
        if (showToast) {
          message.error(text)
        }
      } finally {
        setSentimentLoading(false)
      }
    },
    [],
  )

  const fetchCountryOptions = useCallback(async () => {
    const response = await getGoldCountryList({})
    const rows = response?.resultData?.data?.countryList || response?.data?.countryList || []

    if (!Array.isArray(rows)) {
      return []
    }

    return rows
      .map((item) => ({
        value: String(item?.code || ''),
        label: String(item?.cn || item?.en || item?.code || ''),
        icon: String(item?.icon || ''),
      }))
      .filter((item) => item.value && item.label)
  }, [])

  const fetchDataCharts = useCallback(
    async (countryCode = selectedCountry, showToast = false) => {
      setDataChartLoading(true)
      setDataChartError('')

      try {
        const [countries, reserveResponse, etfResponse] = await Promise.all([
          fetchCountryOptions(),
          getHistoryGoldCentralBankReserve({
            country: countryCode || 'CHN',
            from: '2026-04-01',
            num: -1000,
          }),
          getHistoryETFSpreads({
            from: formatDateForApi(new Date()),
            num: -200,
          }),
        ])

        if (countries.length) {
          setCountryOptions(countries)
          if (!countries.some((item) => item.value === countryCode)) {
            setSelectedCountry(countries[0].value)
          }
        }

        const reservePayload = reserveResponse?.resultData?.data || reserveResponse?.data || {}
        const etfPayload = etfResponse?.resultData?.data || etfResponse?.data || {}

        const parsedWeightRows = parseTupleSeries(reservePayload?.weightReserveList)
        const parsedValueRows = parseTupleSeries(reservePayload?.valueReserveList)
        const parsedEtfRows = parseTupleSeries(etfPayload?.etfDataList)

        setReserveData({
          updateAt: String(reservePayload?.updateAt || ''),
          tag: String(reservePayload?.tag || ''),
          weightRows: parsedWeightRows,
          valueRows: parsedValueRows,
        })
        setEtfData({
          updateAt: String(etfPayload?.updateAt || ''),
          rows: parsedEtfRows,
        })

        if (showToast) {
          message.success('数据图表已刷新')
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : '数据图表请求失败'
        setDataChartError(text)
        if (showToast) {
          message.error(text)
        }
      } finally {
        setDataChartLoading(false)
      }
    },
    [fetchCountryOptions, selectedCountry],
  )

  const handleRefresh = useCallback(() => {
    void fetchSnapshot(true)
    void fetchChartSeries(activeTimeframe)
    void fetchSentiment(true)
    void fetchDataCharts(selectedCountry, true)
  }, [activeTimeframe, fetchSnapshot, fetchChartSeries, fetchSentiment, fetchDataCharts, selectedCountry])

  const handleTimeframeChange = useCallback((nextTimeframe) => {
    setTimeframe(nextTimeframe)
  }, [])

  const handleMoreTimeframeChange = useCallback((nextMoreTimeframe) => {
    setMoreTimeframe(nextMoreTimeframe)
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchSnapshot(false)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [fetchSnapshot])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchChartSeries(activeTimeframe)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [activeTimeframe, fetchChartSeries])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchSentiment(false)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [fetchSentiment])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void fetchDataCharts(selectedCountry)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [fetchDataCharts, selectedCountry])

  useEffect(() => {
    if (activeTimeframe !== 'time') {
      return undefined
    }

    const timerId = setInterval(() => {
      void fetchTimeIncremental()
    }, TIME_INCREMENT_INTERVAL_MS)

    return () => {
      clearInterval(timerId)
    }
  }, [activeTimeframe, fetchTimeIncremental])

  useEffect(() => {
    if (activeTimeframe !== 'day') {
      return undefined
    }

    const timerId = setInterval(() => {
      void fetchDayIncremental()
    }, DAY_INCREMENT_INTERVAL_MS)

    return () => {
      clearInterval(timerId)
    }
  }, [activeTimeframe, fetchDayIncremental])

  useEffect(() => {
    if (!isMinKlineTimeframe(activeTimeframe)) {
      return undefined
    }

    const timerId = setInterval(() => {
      void fetchMinKlineIncremental()
    }, MIN_KLINE_INCREMENT_INTERVAL_MS)

    return () => {
      clearInterval(timerId)
    }
  }, [activeTimeframe, fetchMinKlineIncremental])

  const statusMeta = useMemo(() => getStatusMeta(wsStatus), [wsStatus])

  const rawSeries = useMemo(() => {
    if (chartSeries.length >= 2) {
      return chartSeries
    }

    const fromTicks = [...ticks]
      .reverse()
      .map((item) => item.latestPrice)
      .filter((value) => value !== null && value !== undefined)
      .map((value) => Number(value))

    if (fromTicks.length >= 16) {
      return fromTicks.slice(-120)
    }

    return buildFallbackSeries(snapshot?.latestPrice ?? 1035.45, 120)
  }, [chartSeries, ticks, snapshot?.latestPrice])

  const quoteData = useMemo(() => {
    const openPrice = snapshot?.openPrice ?? rawSeries[0]
    const closePrice = snapshot?.preClosePrice ?? rawSeries[rawSeries.length - 1]
    const latestPrice = snapshot?.latestPrice ?? closePrice
    const highPrice = snapshot?.highPrice ?? Math.max(...rawSeries)
    const lowPrice = snapshot?.lowPrice ?? Math.min(...rawSeries)
    const changeAmount = snapshot?.changeAmount ?? latestPrice - openPrice
    const changePercent =
      snapshot?.changePercent ?? (openPrice ? (changeAmount / openPrice) * 100 : 0)
    const londonQuote = externalQuoteMap[QUOTE_KEYS.LONDON]
    const gold9999Quote = externalQuoteMap[QUOTE_KEYS.GOLD_9999]

    return {
      latestPrice,
      openPrice,
      closePrice,
      highPrice,
      lowPrice,
      changeAmount,
      changePercent,
      londonPrice: londonQuote?.latestPrice ?? latestPrice * 4.54,
      londonPercent: londonQuote?.changePercent ?? changePercent / 3,
      gold9999Price: gold9999Quote?.latestPrice ?? latestPrice + 0.17,
      gold9999Percent: gold9999Quote?.changePercent ?? changePercent + 0.23,
    }
  }, [externalQuoteMap, rawSeries, snapshot])

  const displaySeries = useMemo(() => rawSeries, [rawSeries])
  const quoteTrendClass = getTrendClass(quoteData.changeAmount)
  const londonTrendClass = getTrendClass(quoteData.londonPercent)
  const gold9999TrendClass = getTrendClass(quoteData.gold9999Percent)

  const chartAxisLabels = useMemo(() => {
    if (chartLabels.length >= 3) {
      const middleIndex = Math.floor((chartLabels.length - 1) / 2)
      return [
        chartLabels[0] || '--',
        chartLabels[middleIndex] || '--',
        chartLabels[chartLabels.length - 1] || '--',
      ]
    }

    if (activeTimeframe === 'day') {
      return ['较早', '中段', '最新']
    }

    return ['00:00', '12:00', '23:59']
  }, [activeTimeframe, chartLabels])

  const chartGeometry = useMemo(
    () => createChartGeometry(displaySeries, quoteData.openPrice),
    [displaySeries, quoteData.openPrice],
  )

  const chartMetrics = useMemo(() => {
    const base = quoteData.openPrice || 1
    const topPercent = ((chartGeometry.maxPrice - base) / base) * 100
    const bottomPercent = ((chartGeometry.minPrice - base) / base) * 100

    return {
      topPercent,
      bottomPercent,
    }
  }, [chartGeometry.maxPrice, chartGeometry.minPrice, quoteData.openPrice])

  const countrySelectOptions = useMemo(
    () =>
      countryOptions.map((item) => ({
        value: item.value,
        label: (
          <span className="data-country-label">
            {item.icon ? <img src={item.icon} alt={item.label} /> : null}
            <span>{item.label}</span>
          </span>
        ),
      })),
    [countryOptions],
  )

  const metricSelectOptions = useMemo(
    () => RESERVE_METRIC_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    [],
  )

  return (
    <div className="gold-layout">
      <div className="quote-toolbar">
        <Select
          value={productSku}
          options={GOLD_SKU_OPTIONS}
          onChange={handleProductSkuChange}
          variant="filled"
          style={{ width: 142 }}
        />

        <div className="quote-toolbar-actions">
          <Badge status={statusMeta.color} text={statusMeta.text} />
          <Button
            size="small"
            loading={snapshotLoading}
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              clientRef.current?.disconnect()
              clientRef.current?.connect()
            }}
          >
            重连
          </Button>
        </div>
      </div>

      <Card className="quote-top-card" variant="borderless">
        <div className="price-main-row">
          <div className="price-main-block">
            <div className={`price-main-value ${quoteTrendClass}`}>
              {formatPrice(quoteData.latestPrice)}
            </div>
            <div className={`price-main-change ${quoteTrendClass}`}>
              <span>{formatSigned(quoteData.changeAmount)}</span>
              <span>{formatSigned(quoteData.changePercent, 2, '%')}</span>
            </div>
          </div>

          <div className="price-reference">
            <span>仅供参考</span>
            <InfoCircleOutlined />
          </div>
        </div>

        <div className="price-stats-grid">
          <div className="price-stat-item">
            <span>今开</span>
            <strong>{formatPrice(quoteData.openPrice)}</strong>
          </div>
          <div className="price-stat-item">
            <span>昨收</span>
            <strong>{formatPrice(quoteData.closePrice)}</strong>
          </div>
          <div className="price-stat-item">
            <span>最高</span>
            <strong className="up">{formatPrice(quoteData.highPrice)}</strong>
          </div>
          <div className="price-stat-item">
            <span>最低</span>
            <strong className="down">{formatPrice(quoteData.lowPrice)}</strong>
          </div>
        </div>

        <div className="price-linked-row">
          <div className="linked-item">
            <span>伦敦金</span>
            <strong className={londonTrendClass}>{formatPrice(quoteData.londonPrice)}</strong>
            <em className={londonTrendClass}>{formatSigned(quoteData.londonPercent, 2, '%')}</em>
          </div>
          <div className="linked-item">
            <span>黄金9999</span>
            <strong className={gold9999TrendClass}>{formatPrice(quoteData.gold9999Price)}</strong>
            <em className={gold9999TrendClass}>{formatSigned(quoteData.gold9999Percent, 2, '%')}</em>
          </div>
        </div>
      </Card>

      {snapshotError ? <Alert showIcon type="error" title={snapshotError} /> : null}
      {chartError ? <Alert showIcon type="warning" title={chartError} /> : null}

      <Card className="quote-chart-card" variant="borderless">
        <Segmented
          className="timeframe-segmented"
          options={TIMEFRAME_OPTIONS}
          value={timeframe}
          onChange={handleTimeframeChange}
          block
        />

        {timeframe === 'more' ? (
          <div className="more-timeframe-row">
            <Select
              size="small"
              className="more-timeframe-select"
              value={moreTimeframe}
              options={MORE_MIN_TIMEFRAME_OPTIONS}
              onChange={handleMoreTimeframeChange}
              variant="filled"
            />
          </div>
        ) : null}

        <div className="intraday-chart-shell">
          {chartLoading ? <Spin size="small" className="chart-loading" /> : null}
          <div className="chart-label left-top">{formatPrice(chartGeometry.maxPrice)}</div>
          <div className="chart-label left-mid">{formatPrice(quoteData.openPrice)}</div>
          <div className="chart-label left-bottom">{formatPrice(chartGeometry.minPrice)}</div>
          <div className="chart-label right-top">{formatSigned(chartMetrics.topPercent, 2, '%')}</div>
          <div className="chart-label right-mid">0%</div>
          <div className="chart-label right-bottom">
            {formatSigned(chartMetrics.bottomPercent, 2, '%')}
          </div>

          <svg
            className="intraday-chart-svg"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 92, 92, 0.25)" />
                <stop offset="100%" stopColor="rgba(255, 92, 92, 0.02)" />
              </linearGradient>
            </defs>

            <line
              x1={CHART_PADDING_X}
              y1={chartGeometry.referenceY}
              x2={CHART_WIDTH - CHART_PADDING_X}
              y2={chartGeometry.referenceY}
              stroke="rgba(164, 164, 164, 0.45)"
              strokeDasharray="4 4"
            />

            <polygon points={chartGeometry.areaPath} fill="url(#priceFill)" />
            <polyline
              points={chartGeometry.linePath}
              fill="none"
              stroke="#ff4f59"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>

          <div className="chart-time-axis">
            <span>{chartAxisLabels[0]}</span>
            <span>{chartAxisLabels[1]}</span>
            <span>{chartAxisLabels[2]}</span>
          </div>
        </div>
      </Card>

      <section className="board-section">
        <Segmented
          className="board-segmented"
          options={BOARD_OPTIONS}
          value={boardTab}
          onChange={setBoardTab}
        />

        {boardTab === 'sentiment' ? (
          <div className="sentiment-list">
            {sentimentLoading ? <Spin size="small" className="sentiment-loading" /> : null}
            {sentimentError ? <Alert showIcon type="warning" title={sentimentError} /> : null}

            {sentimentDays.map((day) => (
              <div key={day.dateLabel} className="sentiment-day">
                <Typography.Title level={3} className="sentiment-day-title">
                  {day.dateLabel}
                </Typography.Title>

                {day.entries.map((entry) => (
                  <Card
                    key={`${day.dateLabel}-${entry.time}`}
                    className="sentiment-card"
                    variant="borderless"
                  >
                    <div className="sentiment-time-row">
                      <span className="dot"></span>
                      <span>{entry.time}</span>
                    </div>
                    <Typography.Paragraph className="sentiment-title">
                      {entry.title}
                    </Typography.Paragraph>
                    {entry.imageUrl ? (
                      <a href={entry.jumpUrl || entry.imageUrl} target="_blank" rel="noreferrer">
                        <img className="sentiment-image" src={entry.imageUrl} alt={entry.title} />
                      </a>
                    ) : null}
                    {entry.gauges.length ? (
                      <div className="sentiment-gauges">
                        {entry.gauges.map((gauge) => (
                          <SentimentGauge
                            key={`${entry.time}-${gauge.name}`}
                            name={gauge.name}
                            bull={gauge.bull}
                            bear={gauge.bear}
                          />
                        ))}
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            ))}

            {!sentimentLoading && !sentimentDays.length ? (
              <Card className="sentiment-empty" variant="borderless">
                暂无投机情绪内容
              </Card>
            ) : null}

            <div className="friend-circle">金友圈</div>
          </div>
        ) : (
          <div className="data-board-list">
            {dataChartError ? <Alert showIcon type="warning" title={dataChartError} /> : null}

            <Card className="data-panel-card" variant="borderless">
              <div className="data-panel-head">
                <Typography.Title level={3} className="data-panel-title">
                  全球官方黄金储备
                </Typography.Title>
                <span className="data-panel-detail">查看详情</span>
              </div>

              <div className="data-panel-select-row">
                <Select
                  value={activeCountryOption?.value || selectedCountry}
                  options={countrySelectOptions}
                  onChange={setSelectedCountry}
                  variant="filled"
                  className="data-select"
                  loading={dataChartLoading}
                  popupMatchSelectWidth={280}
                />

                <Select
                  value={reserveMetric}
                  options={metricSelectOptions}
                  onChange={setReserveMetric}
                  variant="filled"
                  className="data-select"
                />
              </div>

              <div className="data-panel-summary-row">
                <div>
                  <div className="data-summary-label">当前黄金储备</div>
                  <div className="data-summary-value">
                    {formatDataValue(reserveCurrentValue, 3)}
                    <span> 吨</span>
                    {reserveData.tag ? <em>{reserveData.tag}</em> : null}
                  </div>
                </div>
                <div className="data-update-text">更新时间:{reserveData.updateAt || '--'}</div>
              </div>

              <div className="data-mini-title">黄金储存总量-月度</div>
              <div className="data-chart-shell">
                {dataChartLoading ? <Spin size="small" className="chart-loading" /> : null}

                <div className="data-y-axis">
                  {reserveGeometry.tickValues.map((tickValue, index) => (
                    <span key={`reserve-tick-${tickValue}-${index}`}>{formatDataValue(tickValue, 3)}</span>
                  ))}
                </div>

                <svg
                  className="data-chart-svg"
                  viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="reserveFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(239, 133, 58, 0.22)" />
                      <stop offset="100%" stopColor="rgba(239, 133, 58, 0.02)" />
                    </linearGradient>
                  </defs>

                  {reserveGeometry.tickY.map((value) => (
                    <line
                      key={`reserve-grid-${value}`}
                      x1={DATA_CHART_PADDING_X}
                      y1={value}
                      x2={DATA_CHART_WIDTH - DATA_CHART_PADDING_X}
                      y2={value}
                      stroke="rgba(210, 212, 219, 0.75)"
                      strokeDasharray="3 4"
                    />
                  ))}

                  <polygon points={reserveGeometry.areaPath} fill="url(#reserveFill)" />
                  <polyline
                    points={reserveGeometry.linePath}
                    fill="none"
                    stroke="#ef853a"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="data-axis-labels">
                  <span>{reserveAxisLabels[0]}</span>
                  <span>{reserveAxisLabels[1]}</span>
                  <span>{reserveAxisLabels[2]}</span>
                </div>
              </div>
            </Card>

            <Card className="data-panel-card" variant="borderless">
              <div className="data-panel-head">
                <Typography.Title level={3} className="data-panel-title">
                  黄金ETF持仓
                </Typography.Title>
                <span className="data-panel-detail">查看详情</span>
              </div>

              <div className="data-panel-summary-row data-panel-summary-row-etf">
                <div>
                  <div className="data-summary-label">当前总持仓</div>
                  <div className="data-summary-value">
                    {formatDataValue(etfCurrentValue, 3)}
                    <span> 吨</span>
                  </div>
                </div>
                <div className="data-update-text">更新时间:{etfData.updateAt || '--'}</div>
              </div>

              <div className="data-mini-title">黄金ETF总持仓变化</div>
              <div className="data-chart-shell">
                {dataChartLoading ? <Spin size="small" className="chart-loading" /> : null}

                <div className="data-y-axis">
                  {etfGeometry.tickValues.map((tickValue, index) => (
                    <span key={`etf-tick-${tickValue}-${index}`}>{formatDataValue(tickValue, 3)}</span>
                  ))}
                </div>

                <svg
                  className="data-chart-svg"
                  viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="etfFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(239, 133, 58, 0.22)" />
                      <stop offset="100%" stopColor="rgba(239, 133, 58, 0.02)" />
                    </linearGradient>
                  </defs>

                  {etfGeometry.tickY.map((value) => (
                    <line
                      key={`etf-grid-${value}`}
                      x1={DATA_CHART_PADDING_X}
                      y1={value}
                      x2={DATA_CHART_WIDTH - DATA_CHART_PADDING_X}
                      y2={value}
                      stroke="rgba(210, 212, 219, 0.75)"
                      strokeDasharray="3 4"
                    />
                  ))}

                  <polygon points={etfGeometry.areaPath} fill="url(#etfFill)" />
                  <polyline
                    points={etfGeometry.linePath}
                    fill="none"
                    stroke="#ef853a"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>

                <div className="data-axis-labels">
                  <span>{etfAxisLabels[0]}</span>
                  <span>{etfAxisLabels[1]}</span>
                  <span>{etfAxisLabels[2]}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </section>
    </div>
  )
}

export default GoldMarketModule
