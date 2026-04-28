import {
  cfgetTimeSharingDots,
  cfGetKlineInfo,
  cfGetMinKlineInfo,
  getRangeTimeSharingDotsByNums,
} from '../../services/quoteApi'
import { WS_STATUS } from '../../services/wsClient'

export const CHART_WIDTH = 680
export const CHART_HEIGHT = 300
export const CHART_PADDING_X = 10
export const CHART_PADDING_Y = 12
export const DATA_CHART_WIDTH = 660
export const DATA_CHART_HEIGHT = 230
export const DATA_CHART_PADDING_X = 10
export const DATA_CHART_PADDING_Y = 12

export const GOLD_SKU_OPTIONS = [
  { label: '京东黄金', value: 'WG-JDAU' },
  { label: '伦敦金', value: 'WG-XAUUSD' },
  { label: '黄金9999', value: 'SGE-Au99.99' },
]

export const SKU_UNIQUE_CODE_MAP = {
  'WG-JDAU': 'WG-JDAU',
  'WG-XAUUSD': 'WG-XAUUSD',
  'SGE-Au99.99': 'SGE-Au99.99',
}

export const DEFAULT_CHART_UCODE = 'WG-JDAU'

export const SKU_CHART_UCODE_MAP = {
  'WG-JDAU': 'WG-JDAU',
  'WG-XAUUSD': 'WG-XAUUSD',
  'SGE-Au99.99': 'SGE-Au99.99',
}

export const QUOTE_KEYS = {
  KLINE: 'WG-JDAU',
  LONDON: 'WG-XAUUSD',
  GOLD_9999: 'SGE-Au99.99',
}

export const DEFAULT_PRIMARY_WS_KEY = QUOTE_KEYS.KLINE
export const FIXED_WS_QUOTE_KEYS = [QUOTE_KEYS.LONDON, QUOTE_KEYS.GOLD_9999]

export const CHART_POINT_LIMIT = 600
export const TIME_INCREMENT_INTERVAL_MS = 4000
export const TIME_INCREMENT_BATCH_SIZE = 3
export const DAY_INCREMENT_INTERVAL_MS = 10000
export const MIN_KLINE_INCREMENT_INTERVAL_MS = 4000

export const MIN_KLINE_TIMEFRAME_TYPE_MAP = {
  m1: 1,
  m5: 5,
  m15: 15,
  m30: 30,
  m60: 60,
  m120: 120,
}

export const TIMEFRAME_OPTIONS = [
  { label: '分时', value: 'time' },
  { label: '日K', value: 'day' },
  { label: '1分', value: 'm1' },
  { label: '5分', value: 'm5' },
  { label: '15分', value: 'm15' },
  { label: '更多', value: 'more' },
]

export const MORE_MIN_TIMEFRAME_OPTIONS = [
  { label: '30分', value: 'm30' },
  { label: '60分', value: 'm60' },
  { label: '120分', value: 'm120' },
]

export const BOARD_OPTIONS = [
  { label: 'RTJ实时行情', value: 'rtj' },
  { label: '投机情绪', value: 'sentiment' },
  { label: '数据图表', value: 'table' },
]

export const ETF_DEFAULT_COUNTRY = 'CHN'

export const RESERVE_METRIC_OPTIONS = [
  { label: '按重量计', value: 'weight' },
  { label: '按价值计', value: 'value' },
]

export const TIMEFRAME_LABEL_MAP = {
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

export const isMinKlineTimeframe = (timeframe) =>
  Object.prototype.hasOwnProperty.call(MIN_KLINE_TIMEFRAME_TYPE_MAP, timeframe)

export const getStatusMeta = (status) => {
  if (status === WS_STATUS.CONNECTED) {
    return { text: '实时连接中', color: 'success' }
  }

  if (status === WS_STATUS.CONNECTING || status === WS_STATUS.RECONNECTING) {
    return { text: '连接中', color: 'processing' }
  }

  return { text: '未连接', color: 'default' }
}

export const pickFirst = (source, candidates) => {
  for (const key of candidates) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return null
}

export const toNumber = (value) => {
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

export const toTimestamp = (value) => {
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

export const normalizeTime = (value) => {
  const normalized = toTimestamp(value)
  return normalized ?? Date.now()
}

export const normalizeQuote = (payload, meta = {}) => {
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

export const formatPrice = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

export const formatSigned = (value, digits = 2, suffix = '') => {
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

export const getTrendClass = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric === 0) {
    return 'flat'
  }

  return numeric > 0 ? 'up' : 'down'
}

export const formatClock = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour12: false,
  })

export const padTwo = (value) => String(value).padStart(2, '0')

export const formatDateForApi = (date = new Date()) =>
  `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`

export const buildRequestDateTime = (date = new Date()) =>
  `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}${padTwo(
    date.getHours(),
  )}${padTwo(date.getMinutes())}${padTwo(date.getSeconds())}`

export const buildRequestDate = (date = new Date()) =>
  `${date.getFullYear()}${padTwo(date.getMonth() + 1)}${padTwo(date.getDate())}`

export const formatDayLabel = (timestamp) => {
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

export const isSentimentPost = (item) => {
  const content = String(item?.content || '')
  return content.includes('投机情绪')
}

export const parseSentimentDays = (payload) => {
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

export const normalizeDateTimeValue = (value) => {
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

export const formatAxisLabel = (value, timeframe) => {
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

export const extractApiData = (payload) => payload?.resultData?.data || payload?.data || payload

export const parseTimeSharingDots = (payload, timeframe) => {
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

export const parseKlineRows = (payload, timeframe) => {
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

export const normalizeChartRows = (rows) => {
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

export const mergeRowsByTimestamp = (baseRows, incomingRows) => {
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

export const toChartSeriesModel = (rows) => {
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

export const buildTimeframeRequestPlan = (timeframe, chartUCode) => {
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

export const buildFallbackSeries = (basePrice, size = 120) => {
  let current = basePrice

  return Array.from({ length: size }, (_, index) => {
    const wave = Math.sin(index / 7) * 0.9 + Math.cos(index / 12) * 0.65
    const pulse = Math.sin(index / 3.8) * 0.25
    current += (wave + pulse) * 0.16
    return Number(current.toFixed(2))
  })
}

export const createChartGeometry = (values, referencePrice) => {
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

export const parseTupleSeries = (rows) => {
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

export const sortLabelRows = (rows, order = 'asc') => {
  const sortedRows = [...rows]

  sortedRows.sort((left, right) => {
    const leftTime = toTimestamp(left.label) ?? toTimestamp(`${left.label}-01`)
    const rightTime = toTimestamp(right.label) ?? toTimestamp(`${right.label}-01`)

    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
      return order === 'desc' ? rightTime - leftTime : leftTime - rightTime
    }

    if (left.label === right.label) {
      return 0
    }

    if (order === 'desc') {
      return left.label > right.label ? -1 : 1
    }

    return left.label > right.label ? 1 : -1
  })

  return sortedRows
}

export const toDataChartModel = (rows, fallbackSize = 180) => {
  const safeRows = rows.slice(-fallbackSize)

  return {
    series: safeRows.map((item) => item.value),
    labels: safeRows.map((item) => item.label),
  }
}

export const createDataChartGeometry = (values) => {
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

export const pickAxisLabels = (labels) => {
  if (!labels.length) {
    return ['--', '--', '--']
  }

  const middleIndex = Math.floor((labels.length - 1) / 2)
  return [labels[0] || '--', labels[middleIndex] || '--', labels[labels.length - 1] || '--']
}

export const formatDataValue = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '--'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
  }).format(Number(value))
}

export const getNiceTickStep = (range, desiredTicks = 8) => {
  const safeRange = Math.max(Number(range) || 0, 1)
  const rawStep = safeRange / Math.max(desiredTicks - 1, 1)
  const power = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / power

  let niceNormalized = 1
  if (normalized > 1) {
    niceNormalized = 2
  }
  if (normalized > 2) {
    niceNormalized = 2.5
  }
  if (normalized > 2.5) {
    niceNormalized = 5
  }
  if (normalized > 5) {
    niceNormalized = 10
  }

  return niceNormalized * power
}

export const formatChangeAxisTick = (value, step) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }

  const absStep = Math.abs(step)
  let digits = 0

  if (absStep > 0 && absStep < 1) {
    digits = absStep < 0.1 ? 2 : 1
  }

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(numeric)
}

export const createDivergingBarsModel = (rows) => {
  if (!rows.length) {
    return {
      barRows: [],
      zeroPercent: 50,
      tickValues: [],
      tickStep: 1,
    }
  }

  const values = rows.map((item) => Number(item.value) || 0)
  const rawMin = Math.min(...values, 0)
  const rawMax = Math.max(...values, 0)
  const rawRange = Math.max(rawMax - rawMin, 1)
  const tickStep = getNiceTickStep(rawRange, 8)

  let axisMin = Math.floor(rawMin / tickStep) * tickStep
  let axisMax = Math.ceil(rawMax / tickStep) * tickStep

  if (axisMin === axisMax) {
    axisMin -= tickStep
    axisMax += tickStep
  }

  const axisRange = Math.max(axisMax - axisMin, tickStep)
  const zeroPercent = ((0 - axisMin) / axisRange) * 100

  const tickValues = []
  for (let value = axisMin; value <= axisMax + tickStep / 2; value += tickStep) {
    tickValues.push(Number(value.toFixed(6)))
  }

  const barRows = rows.map((item) => {
    const numeric = Number(item.value) || 0
    const startValue = numeric >= 0 ? 0 : numeric
    const endValue = numeric >= 0 ? numeric : 0
    const leftPercent = ((startValue - axisMin) / axisRange) * 100
    const widthPercent = ((endValue - startValue) / axisRange) * 100

    return {
      ...item,
      numeric,
      trendClass: getTrendClass(numeric),
      leftPercent,
      widthPercent,
    }
  })

  return {
    barRows,
    zeroPercent,
    tickValues,
    tickStep,
  }
}

export const toDateString = (value) => {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    return `${text}-01`
  }

  const timestamp = toTimestamp(text)
  if (!Number.isFinite(timestamp)) {
    return ''
  }

  const date = new Date(timestamp)
  return `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}`
}

export const buildEtfChangeInitialFrom = (date = new Date()) => {
  const fromDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return formatDateForApi(fromDate)
}

export const buildPreviousMonthFrom = (fromText) => {
  const normalizedText = toDateString(fromText)
  if (!normalizedText) {
    return buildEtfChangeInitialFrom(new Date())
  }

  const timestamp = toTimestamp(normalizedText)
  if (!Number.isFinite(timestamp)) {
    return buildEtfChangeInitialFrom(new Date())
  }

  const date = new Date(timestamp)
  return formatDateForApi(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

export const mergeTupleRows = (baseRows, incomingRows) => {
  const rowMap = new Map()

  for (const row of baseRows) {
    rowMap.set(row.label, row)
  }

  for (const row of incomingRows) {
    rowMap.set(row.label, row)
  }

  return [...rowMap.values()]
}

export function SentimentGauge({ name, bull, bear }) {
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
