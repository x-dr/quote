import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { App } from 'antd'
import { RTJ_SSE_API } from '../config/api'
import {
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
import {
  DAY_INCREMENT_INTERVAL_MS,
  DEFAULT_CHART_UCODE,
  DEFAULT_PRIMARY_WS_KEY,
  FIXED_WS_QUOTE_KEYS,
  GOLD_SKU_OPTIONS,
  MIN_KLINE_INCREMENT_INTERVAL_MS,
  MIN_KLINE_TIMEFRAME_TYPE_MAP,
  RESERVE_METRIC_OPTIONS,
  QUOTE_KEYS,
  SKU_CHART_UCODE_MAP,
  SKU_UNIQUE_CODE_MAP,
  TIMEFRAME_LABEL_MAP,
  TIME_INCREMENT_BATCH_SIZE,
  TIME_INCREMENT_INTERVAL_MS,
  buildFallbackSeries,
  buildRequestDate,
  buildRequestDateTime,
  createChartGeometry,
  createDataChartGeometry,
  formatDateForApi,
  getStatusMeta,
  getTrendClass,
  isMinKlineTimeframe,
  mergeRowsByTimestamp,
  normalizeChartRows,
  normalizeQuote,
  parseKlineRows,
  parseSentimentDays,
  parseTimeSharingDots,
  parseTupleSeries,
  pickAxisLabels,
  toChartSeriesModel,
  toDataChartModel,
  buildTimeframeRequestPlan,
} from './goldMarket/helpers'
import BoardSection from './goldMarket/components/BoardSection'
import QuotePanel from './goldMarket/components/QuotePanel'
import { useGoldDetailDrawers } from './goldMarket/hooks/useGoldDetailDrawers'
import './GoldMarketModule.css'

const ReserveDetailDrawer = lazy(() => import('./goldMarket/components/ReserveDetailDrawer'))
const EtfDetailDrawer = lazy(() => import('./goldMarket/components/EtfDetailDrawer'))

function GoldMarketModule() {
  const { message } = App.useApp()
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
  const [boardTab, setBoardTab] = useState('rtj')
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
  const [rtjQuoteMap, setRtjQuoteMap] = useState({})
  const [rtjConnected, setRtjConnected] = useState(false)
  const [rtjError, setRtjError] = useState('')
  const [rtjUpdatedAt, setRtjUpdatedAt] = useState('')

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
  const rtjRows = useMemo(() => {
    const rows = Object.values(rtjQuoteMap || {})
    const customOrder = ['Au99.99', 'XAU', 'XAG', 'USDCNH', 'XAP', 'XPD']
    const orderMap = new Map(customOrder.map((code, index) => [code, index]))

    const rankCode = (code) => {
      const text = String(code || '')

      if (orderMap.has(text)) {
        return [0, orderMap.get(text)]
      }

      if (text.startsWith('JZJ_')) {
        return [1, text]
      }

      return [2, text]
    }

    rows.sort((left, right) => {
      const leftCode = String(left?.code || '')
      const rightCode = String(right?.code || '')
      const leftRank = rankCode(leftCode)
      const rightRank = rankCode(rightCode)

      if (leftRank[0] !== rightRank[0]) {
        return leftRank[0] - rightRank[0]
      }

      if (leftRank[0] === 0) {
        return leftRank[1] - rightRank[1]
      }

      return String(leftRank[1]).localeCompare(String(rightRank[1]), 'en')
    })

    return rows
  }, [rtjQuoteMap])

  const {
    reserveDetailVisible,
    reserveDetailLoading,
    reserveDetailError,
    reserveDetailData,
    reserveDetailCurrentValue,
    reserveDetailGeometry,
    reserveDetailAxisLabels,
    reserveDetailChangeDisplayRows,
    reserveDetailMaxChangeAbs,
    etfDetailVisible,
    etfDetailLoading,
    etfDetailError,
    etfDetailData,
    etfDetailCurrentValue,
    etfDetailGeometry,
    etfDetailAxisLabels,
    etfDetailPublisher,
    etfDetailChangeChartModel,
    handleOpenReserveDetail,
    handleCloseReserveDetail,
    handleRefreshReserveDetail,
    handleLoadMoreReserveChange,
    handleOpenEtfDetail,
    handleCloseEtfDetail,
    handleRefreshEtfDetail,
    handleLoadMoreEtfChange,
  } = useGoldDetailDrawers({
    selectedCountry,
    reserveMetric,
  })

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

  useEffect(() => {
    if (!RTJ_SSE_API) {
      return undefined
    }

    let eventSource = null
    let closed = false

    const toNumericOrNull = (value) => {
      if (value === null || value === undefined || value === '') {
        return null
      }

      const numeric = Number(value)
      return Number.isFinite(numeric) ? numeric : null
    }

    const toTimestampText = (value) => {
      if (!value) {
        return ''
      }

      const parsed = Date.parse(String(value))
      if (!Number.isFinite(parsed)) {
        return String(value)
      }

      return new Date(parsed).toLocaleString('zh-CN', { hour12: false })
    }

    const normalizeRtjQuote = (source) => {
      if (!source || typeof source !== 'object') {
        return null
      }

      const code = String(source.code || source.name || '')
      if (!code) {
        return null
      }

      return {
        id: code,
        code,
        name: String(source.name || source.code || ''),
        last: toNumericOrNull(source.last),
        bid: toNumericOrNull(source.bid),
        ask: toNumericOrNull(source.ask),
        high: toNumericOrNull(source.high),
        low: toNumericOrNull(source.low),
        preClose: toNumericOrNull(source.preClose),
        updown: toNumericOrNull(source.updown),
        updownRate: toNumericOrNull(source.updownRate),
        timestamp: String(source.timestamp || ''),
      }
    }

    const applyInitPayload = (payload) => {
      const quotes = payload?.quotes
      if (!quotes || typeof quotes !== 'object') {
        return
      }

      const entries = Object.values(quotes)
        .map((item) => normalizeRtjQuote(item))
        .filter(Boolean)

      if (!entries.length) {
        return
      }

      const nextMap = {}
      for (const row of entries) {
        nextMap[row.code] = row
      }

      setRtjQuoteMap(nextMap)
      setRtjConnected(Boolean(payload?.connected))
      setRtjUpdatedAt(toTimestampText(payload?.timestamp) || toTimestampText(entries[0]?.timestamp))
      setRtjError('')
    }

    const applyQuotePayload = (payload) => {
      const row = normalizeRtjQuote(payload?.quote)
      if (!row) {
        return
      }

      setRtjQuoteMap((previous) => ({
        ...previous,
        [row.code]: row,
      }))
      setRtjConnected(true)
      setRtjUpdatedAt(toTimestampText(payload?.timestamp) || toTimestampText(row.timestamp))
      setRtjError('')
    }

    const safeParse = (text) => {
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    const onInit = (event) => {
      const payload = safeParse(event?.data)
      if (!payload) {
        return
      }

      applyInitPayload(payload)
    }

    const onQuote = (event) => {
      const payload = safeParse(event?.data)
      if (!payload) {
        return
      }

      applyQuotePayload(payload)
    }

    try {
      eventSource = new EventSource(RTJ_SSE_API)
      eventSource.addEventListener('init', onInit)
      eventSource.addEventListener('quote', onQuote)
      eventSource.onopen = () => {
        if (closed) {
          return
        }

        setRtjConnected(true)
        setRtjError('')
      }
      eventSource.onerror = () => {
        if (closed) {
          return
        }

        setRtjConnected(false)
        setRtjError('RTJ 实时行情连接异常')
      }
    } catch {
      window.setTimeout(() => {
        if (closed) {
          return
        }

        setRtjError('RTJ 实时行情初始化失败')
      }, 0)
    }

    return () => {
      closed = true

      if (eventSource) {
        eventSource.removeEventListener('init', onInit)
        eventSource.removeEventListener('quote', onQuote)
        eventSource.close()
      }
    }
  }, [])

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
    [message, uniqueCode],
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
    [chartUCode, message],
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
    [message],
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
    [fetchCountryOptions, message, selectedCountry],
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
      <QuotePanel
        productSku={productSku}
        onProductSkuChange={handleProductSkuChange}
        statusMeta={statusMeta}
        snapshotLoading={snapshotLoading}
        onRefresh={handleRefresh}
        onReconnect={() => {
          clientRef.current?.disconnect()
          clientRef.current?.connect()
        }}
        quoteTrendClass={quoteTrendClass}
        quoteData={quoteData}
        londonTrendClass={londonTrendClass}
        gold9999TrendClass={gold9999TrendClass}
        snapshotError={snapshotError}
        chartError={chartError}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        moreTimeframe={moreTimeframe}
        onMoreTimeframeChange={handleMoreTimeframeChange}
        chartLoading={chartLoading}
        chartGeometry={chartGeometry}
        chartMetrics={chartMetrics}
        chartAxisLabels={chartAxisLabels}
        goldSkuOptions={GOLD_SKU_OPTIONS}
      />

      <BoardSection
        boardTab={boardTab}
        onBoardTabChange={setBoardTab}
        sentimentLoading={sentimentLoading}
        sentimentError={sentimentError}
        sentimentDays={sentimentDays}
        dataChartError={dataChartError}
        onOpenReserveDetail={handleOpenReserveDetail}
        activeCountryOption={activeCountryOption}
        selectedCountry={selectedCountry}
        countrySelectOptions={countrySelectOptions}
        onCountryChange={setSelectedCountry}
        reserveMetric={reserveMetric}
        metricSelectOptions={metricSelectOptions}
        onReserveMetricChange={setReserveMetric}
        dataChartLoading={dataChartLoading}
        reserveCurrentValue={reserveCurrentValue}
        reserveData={reserveData}
        reserveGeometry={reserveGeometry}
        reserveAxisLabels={reserveAxisLabels}
        onOpenEtfDetail={handleOpenEtfDetail}
        etfCurrentValue={etfCurrentValue}
        etfData={etfData}
        etfGeometry={etfGeometry}
        etfAxisLabels={etfAxisLabels}
        rtjRows={rtjRows}
        rtjConnected={rtjConnected}
        rtjError={rtjError}
        rtjUpdatedAt={rtjUpdatedAt}
      />

      <Suspense fallback={null}>
        {reserveDetailVisible ? (
          <ReserveDetailDrawer
            reserveDetailVisible={reserveDetailVisible}
            onClose={handleCloseReserveDetail}
            reserveDetailLoading={reserveDetailLoading}
            onRefresh={handleRefreshReserveDetail}
            activeCountryOption={activeCountryOption}
            selectedCountry={selectedCountry}
            countrySelectOptions={countrySelectOptions}
            onCountryChange={setSelectedCountry}
            reserveMetric={reserveMetric}
            metricSelectOptions={metricSelectOptions}
            onReserveMetricChange={setReserveMetric}
            reserveDetailError={reserveDetailError}
            reserveDetailCurrentValue={reserveDetailCurrentValue}
            reserveDetailData={reserveDetailData}
            reserveDetailGeometry={reserveDetailGeometry}
            reserveDetailAxisLabels={reserveDetailAxisLabels}
            reserveDetailChangeDisplayRows={reserveDetailChangeDisplayRows}
            reserveDetailMaxChangeAbs={reserveDetailMaxChangeAbs}
            onLoadMoreChange={handleLoadMoreReserveChange}
          />
        ) : null}

        {etfDetailVisible ? (
          <EtfDetailDrawer
            etfDetailVisible={etfDetailVisible}
            onClose={handleCloseEtfDetail}
            etfDetailLoading={etfDetailLoading}
            onRefresh={handleRefreshEtfDetail}
            etfDetailError={etfDetailError}
            etfDetailCurrentValue={etfDetailCurrentValue}
            etfDetailPublisher={etfDetailPublisher}
            etfDetailData={etfDetailData}
            etfDetailGeometry={etfDetailGeometry}
            etfDetailAxisLabels={etfDetailAxisLabels}
            etfDetailChangeChartModel={etfDetailChangeChartModel}
            onLoadMoreChange={handleLoadMoreEtfChange}
          />
        ) : null}
      </Suspense>
    </div>
  )
}

export default GoldMarketModule
