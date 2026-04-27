import { App } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getGoldCentralBankChange,
  getGoldETFChange,
  getHistoryGoldCentralBankReserve,
  getMsHistoryETFSpreads,
} from '../../../services/quoteApi'
import {
  ETF_DEFAULT_COUNTRY,
  buildEtfChangeInitialFrom,
  buildPreviousMonthFrom,
  createDataChartGeometry,
  createDivergingBarsModel,
  formatDateForApi,
  mergeTupleRows,
  parseTupleSeries,
  pickAxisLabels,
  sortLabelRows,
  toDataChartModel,
  toDateString,
} from '../helpers'

export function useGoldDetailDrawers({ selectedCountry, reserveMetric }) {
  const { message } = App.useApp()
  const reserveDetailRequestRef = useRef(0)
  const etfDetailRequestRef = useRef(0)

  const [reserveDetailVisible, setReserveDetailVisible] = useState(false)
  const [reserveDetailLoading, setReserveDetailLoading] = useState(false)
  const [reserveDetailError, setReserveDetailError] = useState('')
  const [reserveDetailData, setReserveDetailData] = useState({
    updateAt: '',
    tag: '',
    weightRows: [],
    valueRows: [],
    weightChangeRows: [],
    valueChangeRows: [],
  })
  const [reserveDetailChangeFrom, setReserveDetailChangeFrom] = useState(() =>
    buildEtfChangeInitialFrom(new Date()),
  )

  const [etfDetailVisible, setEtfDetailVisible] = useState(false)
  const [etfDetailLoading, setEtfDetailLoading] = useState(false)
  const [etfDetailError, setEtfDetailError] = useState('')
  const [etfDetailData, setEtfDetailData] = useState({
    updateAt: '',
    rows: [],
    changeRows: [],
    publisher: '',
  })
  const [etfDetailChangeFrom, setEtfDetailChangeFrom] = useState(() =>
    buildEtfChangeInitialFrom(new Date()),
  )

  const reserveDetailRows = useMemo(
    () => (reserveMetric === 'weight' ? reserveDetailData.weightRows : reserveDetailData.valueRows),
    [reserveDetailData.valueRows, reserveDetailData.weightRows, reserveMetric],
  )
  const reserveDetailChangeRows = useMemo(
    () =>
      reserveMetric === 'weight'
        ? reserveDetailData.weightChangeRows
        : reserveDetailData.valueChangeRows,
    [reserveDetailData.valueChangeRows, reserveDetailData.weightChangeRows, reserveMetric],
  )
  const reserveDetailChartModel = useMemo(() => toDataChartModel(reserveDetailRows), [reserveDetailRows])
  const reserveDetailCurrentValue = useMemo(
    () => reserveDetailChartModel.series[reserveDetailChartModel.series.length - 1] ?? null,
    [reserveDetailChartModel.series],
  )
  const reserveDetailGeometry = useMemo(
    () => createDataChartGeometry(reserveDetailChartModel.series),
    [reserveDetailChartModel.series],
  )
  const reserveDetailAxisLabels = useMemo(
    () => pickAxisLabels(reserveDetailChartModel.labels),
    [reserveDetailChartModel.labels],
  )
  const reserveDetailChangeDisplayRows = useMemo(
    () => sortLabelRows(reserveDetailChangeRows, 'desc'),
    [reserveDetailChangeRows],
  )
  const reserveDetailMaxChangeAbs = useMemo(
    () =>
      reserveDetailChangeDisplayRows.reduce((maxValue, item) => {
        const numeric = Math.abs(Number(item.value) || 0)
        return numeric > maxValue ? numeric : maxValue
      }, 0),
    [reserveDetailChangeDisplayRows],
  )

  const etfDetailChartModel = useMemo(() => toDataChartModel(etfDetailData.rows), [etfDetailData.rows])
  const etfDetailCurrentValue = useMemo(
    () => etfDetailChartModel.series[etfDetailChartModel.series.length - 1] ?? null,
    [etfDetailChartModel.series],
  )
  const etfDetailGeometry = useMemo(
    () => createDataChartGeometry(etfDetailChartModel.series),
    [etfDetailChartModel.series],
  )
  const etfDetailAxisLabels = useMemo(() => pickAxisLabels(etfDetailChartModel.labels), [etfDetailChartModel.labels])
  const etfDetailPublisher = useMemo(
    () => etfDetailData.publisher || '美国SPDR Gold Trust',
    [etfDetailData.publisher],
  )
  const etfDetailChangeDisplayRows = useMemo(
    () => sortLabelRows(etfDetailData.changeRows, 'desc'),
    [etfDetailData.changeRows],
  )
  const etfDetailChangeChartModel = useMemo(
    () => createDivergingBarsModel(etfDetailChangeDisplayRows),
    [etfDetailChangeDisplayRows],
  )

  const fetchReserveDetail = useCallback(
    async (countryCode = selectedCountry, showToast = false, changeFrom, appendChange = false) => {
      const requestId = reserveDetailRequestRef.current + 1
      reserveDetailRequestRef.current = requestId

      setReserveDetailLoading(true)
      setReserveDetailError('')

      try {
        const fromDate = formatDateForApi(new Date())
        const safeChangeFrom = toDateString(changeFrom) || buildEtfChangeInitialFrom(new Date())

        const [historyResponse, changeResponse] = await Promise.all([
          getHistoryGoldCentralBankReserve({
            appChanel: '',
            country: countryCode || 'CHN',
            from: fromDate,
            to: -1,
          }),
          getGoldCentralBankChange({
            appChanel: '',
            country: countryCode || 'CHN',
            from: safeChangeFrom,
            num: -20,
          }),
        ])

        const historyPayload = historyResponse?.resultData?.data || historyResponse?.data || {}
        const changePayload = changeResponse?.resultData?.data || changeResponse?.data || {}

        const nextWeightRows = sortLabelRows(parseTupleSeries(historyPayload?.weightReserveList), 'asc')
        const nextValueRows = sortLabelRows(parseTupleSeries(historyPayload?.valueReserveList), 'asc')
        const nextWeightChangeRows = sortLabelRows(parseTupleSeries(changePayload?.weightChangeList), 'asc')
        const nextValueChangeRows = sortLabelRows(parseTupleSeries(changePayload?.valueChangeList), 'asc')
        const nextFrom = toDateString(changePayload?.startDate) || buildPreviousMonthFrom(safeChangeFrom)

        if (requestId !== reserveDetailRequestRef.current) {
          return
        }

        setReserveDetailData((previous) => ({
          updateAt: String(historyPayload?.updateAt || ''),
          tag: String(historyPayload?.tag || ''),
          weightRows: nextWeightRows,
          valueRows: nextValueRows,
          weightChangeRows: appendChange
            ? sortLabelRows(mergeTupleRows(previous.weightChangeRows, nextWeightChangeRows), 'asc')
            : nextWeightChangeRows,
          valueChangeRows: appendChange
            ? sortLabelRows(mergeTupleRows(previous.valueChangeRows, nextValueChangeRows), 'asc')
            : nextValueChangeRows,
        }))
        setReserveDetailChangeFrom(nextFrom)

        if (showToast) {
          message.success('黄金储备详情已刷新')
        }
      } catch (error) {
        if (requestId !== reserveDetailRequestRef.current) {
          return
        }

        const text = error instanceof Error ? error.message : '黄金储备详情请求失败'
        setReserveDetailError(text)

        if (showToast) {
          message.error(text)
        }
      } finally {
        if (requestId === reserveDetailRequestRef.current) {
          setReserveDetailLoading(false)
        }
      }
    },
    [selectedCountry],
  )

  const fetchEtfDetail = useCallback(
    async (
      countryCode = ETF_DEFAULT_COUNTRY,
      showToast = false,
      changeFrom,
      appendChange = false,
    ) => {
      const requestId = etfDetailRequestRef.current + 1
      etfDetailRequestRef.current = requestId

      setEtfDetailLoading(true)
      setEtfDetailError('')

      try {
        const fromDate = formatDateForApi(new Date())
        const safeChangeFrom = toDateString(changeFrom) || buildEtfChangeInitialFrom(new Date())

        const [historyResponse, changeResponse] = await Promise.all([
          getMsHistoryETFSpreads({
            appChanel: '',
            country: countryCode || ETF_DEFAULT_COUNTRY,
            from: fromDate,
            num: -1000,
          }),
          getGoldETFChange({
            appChanel: '',
            from: safeChangeFrom,
            num: -20,
          }),
        ])

        const historyPayload = historyResponse?.resultData?.data || historyResponse?.data || {}
        const changePayload = changeResponse?.resultData?.data || changeResponse?.data || {}

        const nextRows = sortLabelRows(parseTupleSeries(historyPayload?.etfDataList), 'asc')
        const nextChangeRows = sortLabelRows(parseTupleSeries(changePayload?.changeList), 'asc')
        const nextFrom = toDateString(changePayload?.startDate) || buildPreviousMonthFrom(safeChangeFrom)

        if (requestId !== etfDetailRequestRef.current) {
          return
        }

        setEtfDetailData((previous) => ({
          updateAt: String(historyPayload?.updateAt || ''),
          rows: nextRows,
          changeRows: appendChange
            ? sortLabelRows(mergeTupleRows(previous.changeRows, nextChangeRows), 'asc')
            : nextChangeRows,
          publisher: String(
            historyPayload?.publisher ||
              historyPayload?.publishOrg ||
              historyPayload?.orgName ||
              historyPayload?.institution ||
              previous.publisher ||
              '',
          ),
        }))
        setEtfDetailChangeFrom(nextFrom)

        if (showToast) {
          message.success('黄金ETF详情已刷新')
        }
      } catch (error) {
        if (requestId !== etfDetailRequestRef.current) {
          return
        }

        const text = error instanceof Error ? error.message : '黄金ETF详情请求失败'
        setEtfDetailError(text)

        if (showToast) {
          message.error(text)
        }
      } finally {
        if (requestId === etfDetailRequestRef.current) {
          setEtfDetailLoading(false)
        }
      }
    },
    [],
  )

  const handleOpenReserveDetail = useCallback(() => {
    setReserveDetailChangeFrom(buildEtfChangeInitialFrom(new Date()))
    setReserveDetailVisible(true)
  }, [])

  const handleCloseReserveDetail = useCallback(() => {
    setReserveDetailVisible(false)
  }, [])

  const handleRefreshReserveDetail = useCallback(() => {
    const resetFrom = buildEtfChangeInitialFrom(new Date())
    setReserveDetailChangeFrom(resetFrom)
    void fetchReserveDetail(selectedCountry, true, resetFrom, false)
  }, [fetchReserveDetail, selectedCountry])

  const handleLoadMoreReserveChange = useCallback(() => {
    void fetchReserveDetail(selectedCountry, false, reserveDetailChangeFrom, true)
  }, [fetchReserveDetail, reserveDetailChangeFrom, selectedCountry])

  const handleOpenEtfDetail = useCallback(() => {
    setEtfDetailChangeFrom(buildEtfChangeInitialFrom(new Date()))
    setEtfDetailVisible(true)
  }, [])

  const handleCloseEtfDetail = useCallback(() => {
    setEtfDetailVisible(false)
  }, [])

  const handleRefreshEtfDetail = useCallback(() => {
    const resetFrom = buildEtfChangeInitialFrom(new Date())
    setEtfDetailChangeFrom(resetFrom)
    void fetchEtfDetail(ETF_DEFAULT_COUNTRY, true, resetFrom, false)
  }, [fetchEtfDetail])

  const handleLoadMoreEtfChange = useCallback(() => {
    void fetchEtfDetail(ETF_DEFAULT_COUNTRY, false, etfDetailChangeFrom, true)
  }, [etfDetailChangeFrom, fetchEtfDetail])

  useEffect(() => {
    if (!reserveDetailVisible) {
      return
    }

    const initialFrom = buildEtfChangeInitialFrom(new Date())
    setReserveDetailChangeFrom(initialFrom)
    void fetchReserveDetail(selectedCountry, false, initialFrom, false)
  }, [fetchReserveDetail, reserveDetailVisible, selectedCountry])

  useEffect(() => {
    if (!etfDetailVisible) {
      return
    }

    const initialFrom = buildEtfChangeInitialFrom(new Date())
    setEtfDetailChangeFrom(initialFrom)
    void fetchEtfDetail(ETF_DEFAULT_COUNTRY, false, initialFrom, false)
  }, [etfDetailVisible, fetchEtfDetail])

  return {
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
  }
}
