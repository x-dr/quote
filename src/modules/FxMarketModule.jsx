import { ReloadOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Space, Table, Tag, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchCcbFxNewsXml,
  fetchCcbFxSettlementXml,
  fetchCcbFxSpotXml,
} from '../services/quoteApi'
import './FxMarketModule.css'

const REFRESH_INTERVAL_MS = 60 * 1000

const CURRENCY_INFO_MAP = {
  '036': { alpha: 'AUD', name: '澳大利亚元' },
  '124': { alpha: 'CAD', name: '加拿大元' },
  '156': { alpha: 'CNY', name: '人民币' },
  '203': { alpha: 'CZK', name: '捷克克朗' },
  '208': { alpha: 'DKK', name: '丹麦克朗' },
  '344': { alpha: 'HKD', name: '港币' },
  '348': { alpha: 'HUF', name: '匈牙利福林' },
  '376': { alpha: 'ILS', name: '以色列新谢克尔' },
  '392': { alpha: 'JPY', name: '日元' },
  '398': { alpha: 'KZT', name: '哈萨克斯坦坚戈' },
  '410': { alpha: 'KRW', name: '韩元' },
  '446': { alpha: 'MOP', name: '澳门元' },
  '458': { alpha: 'MYR', name: '马来西亚林吉特' },
  '484': { alpha: 'MXN', name: '墨西哥比索' },
  '496': { alpha: 'MNT', name: '蒙古图格里克' },
  '554': { alpha: 'NZD', name: '新西兰元' },
  '578': { alpha: 'NOK', name: '挪威克朗' },
  '643': { alpha: 'RUB', name: '俄罗斯卢布' },
  '682': { alpha: 'SAR', name: '沙特里亚尔' },
  '702': { alpha: 'SGD', name: '新加坡元' },
  '710': { alpha: 'ZAR', name: '南非兰特' },
  '752': { alpha: 'SEK', name: '瑞典克朗' },
  '756': { alpha: 'CHF', name: '瑞士法郎' },
  '764': { alpha: 'THB', name: '泰铢' },
  '784': { alpha: 'AED', name: '阿联酋迪拉姆' },
  '826': { alpha: 'GBP', name: '英镑' },
  '840': { alpha: 'USD', name: '美元' },
  '949': { alpha: 'TRY', name: '土耳其里拉' },
  '978': { alpha: 'EUR', name: '欧元' },
  '985': { alpha: 'PLN', name: '波兰兹罗提' },
}

function textOf(node, tagName) {
  const text = node?.querySelector(tagName)?.textContent
  return typeof text === 'string' ? text.trim() : ''
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function formatRate(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }

  const [_, decimalPart = ''] = String(value).split('.')
  const decimalCount = Math.min(Math.max(decimalPart.length, 2), 6)

  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalCount,
  }).format(numeric)
}

function parseXml(xmlText) {
  const parser = new DOMParser()
  const document = parser.parseFromString(xmlText, 'application/xml')

  if (document.querySelector('parsererror')) {
    throw new Error('XML 解析失败')
  }

  return document
}

function normalizeNumericCode(value) {
  const digits = String(value || '').replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  return digits.padStart(3, '0').slice(-3)
}

function resolveCurrencyInfo(numericCode) {
  const normalized = normalizeNumericCode(numericCode)
  return CURRENCY_INFO_MAP[normalized] || null
}

function toCurrencyAlpha(numericCode) {
  const info = resolveCurrencyInfo(numericCode)

  if (info?.alpha) {
    return info.alpha
  }

  const normalized = normalizeNumericCode(numericCode)
  return normalized || String(numericCode || '--')
}

function toCurrencyLabel(numericCode) {
  const info = resolveCurrencyInfo(numericCode)

  if (info) {
    return `${info.alpha} · ${info.name}`
  }

  const normalized = normalizeNumericCode(numericCode)
  return normalized ? `${normalized} · 未收录币种` : '--'
}

function formatUpdateAt(dateText, timeText) {
  const date = String(dateText || '').trim()
  const time = String(timeText || '').trim()

  if (!/^\d{8}$/.test(date) || !/^\d{6}$/.test(time)) {
    return ''
  }

  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`
}

function normalizeRateRows(xmlText, source) {
  const document = parseXml(xmlText)
  const rows = Array.from(document.querySelectorAll('ReferencePriceSettlement'))

  return rows
    .map((node, index) => {
      const offeredCode = normalizeNumericCode(textOf(node, 'Ofrd_Ccy_CcyCd'))
      const quotedCode = normalizeNumericCode(textOf(node, 'Ofr_Ccy_CcyCd'))
      const pair = `${toCurrencyAlpha(offeredCode)}/${toCurrencyAlpha(quotedCode)}`
      const bidRateOfCcy = textOf(node, 'BidRateOfCcy')
      const bidRateOfCash = textOf(node, 'BidRateOfCash')
      const ofrRateOfCcy = textOf(node, 'OfrRateOfCcy')
      const ofrRateOfCash = textOf(node, 'OfrRateOfCash')
      const midRate = textOf(node, 'Mdl_ExRt_Prc')
      const updateAt = formatUpdateAt(textOf(node, 'LstPr_Dt'), textOf(node, 'LstPr_Tm'))

      return {
        key: `${source}-${pair}-${index}`,
        offeredCode,
        quotedCode,
        pair,
        bidRateOfCcy,
        bidRateOfCash,
        ofrRateOfCcy,
        ofrRateOfCash,
        midRate,
        updateAt,
        updateTimestamp: Date.parse(updateAt.replace(' ', 'T')) || 0,
      }
    })
    .filter((row) => row.offeredCode && row.quotedCode)
    .sort((left, right) => right.updateTimestamp - left.updateTimestamp)
}

function normalizeNewsOrPairs(xmlText) {
  const document = parseXml(xmlText)
  const newsRoot = document.querySelector('News')

  if (newsRoot) {
    const items = Array.from(newsRoot.querySelectorAll('Item'))
      .map((item, index) => ({
        key: `news-${index}`,
        title: textOf(item, 'Title') || `汇率资讯 ${index + 1}`,
        content: textOf(item, 'Content') || '',
        time: textOf(item, 'Time') || '',
      }))
      .filter((item) => item.title || item.content)

    return {
      newsRows: items,
      pairRows: [],
    }
  }

  const pairRows = Array.from(document.querySelectorAll('ReferencePriceSettlement'))
    .map((node, index) => {
      const pair = textOf(node, 'CcyPair_EngShtNm') || textOf(node, 'CcyPair_Nm')
      const offered = textOf(node, 'Ofrd_Ccy_Eng_Cd')
      const quoted = textOf(node, 'Ofr_Ccy_Eng_Cd')

      return {
        key: `pair-${index}`,
        pair,
        offered,
        quoted,
        spotDigits: textOf(node, 'Spot_ExRt_SnBit'),
        forwardDigits: textOf(node, 'Fwd_Prc_DecDgt_Val'),
        adjustDigits: textOf(node, 'FwdSwapToSpotAdj_Pctg'),
      }
    })
    .filter((row) => row.pair)

  return {
    newsRows: [],
    pairRows,
  }
}

function pickLatestUpdate(rows) {
  return rows.reduce((latest, row) => {
    if (!row?.updateAt) {
      return latest
    }

    if (!latest) {
      return row.updateAt
    }

    return row.updateAt > latest ? row.updateAt : latest
  }, '')
}

function FxMarketModule() {
  const mountedRef = useRef(false)
  const requestIdRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [errors, setErrors] = useState([])
  const [settlementRows, setSettlementRows] = useState([])
  const [spotRows, setSpotRows] = useState([])
  const [newsRows, setNewsRows] = useState([])
  const [pairRows, setPairRows] = useState([])

  const loadData = useCallback(async ({ silent = false } = {}) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (mountedRef.current) {
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
    }

    const nextErrors = []
    let nextSettlementRows = []
    let nextSpotRows = []
    let nextNewsRows = []
    let nextPairRows = []

    const [newsResult, settlementResult, spotResult] = await Promise.allSettled([
      fetchCcbFxNewsXml(),
      fetchCcbFxSettlementXml(),
      fetchCcbFxSpotXml(),
    ])

    if (newsResult.status === 'fulfilled') {
      try {
        const parsed = normalizeNewsOrPairs(newsResult.value)
        nextNewsRows = parsed.newsRows
        nextPairRows = parsed.pairRows
      } catch (error) {
        nextErrors.push(`hbdxsw.xml 解析失败：${error?.message || '未知错误'}`)
      }
    } else {
      nextErrors.push(`hbdxsw.xml 请求失败：${newsResult.reason?.message || '未知错误'}`)
    }

    if (settlementResult.status === 'fulfilled') {
      try {
        nextSettlementRows = normalizeRateRows(settlementResult.value, 'jsh')
      } catch (error) {
        nextErrors.push(`jshckpj_new2.xml 解析失败：${error?.message || '未知错误'}`)
      }
    } else {
      nextErrors.push(`jshckpj_new2.xml 请求失败：${settlementResult.reason?.message || '未知错误'}`)
    }

    if (spotResult.status === 'fulfilled') {
      try {
        nextSpotRows = normalizeRateRows(spotResult.value, 'wh')
      } catch (error) {
        nextErrors.push(`whckpj_new2.xml 解析失败：${error?.message || '未知错误'}`)
      }
    } else {
      nextErrors.push(`whckpj_new2.xml 请求失败：${spotResult.reason?.message || '未知错误'}`)
    }

    if (!mountedRef.current || requestId !== requestIdRef.current) {
      return
    }

    setSettlementRows(nextSettlementRows)
    setSpotRows(nextSpotRows)
    setNewsRows(nextNewsRows)
    setPairRows(nextPairRows)
    setErrors(nextErrors)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadData()

    const timer = window.setInterval(() => {
      loadData({ silent: true })
    }, REFRESH_INTERVAL_MS)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
    }
  }, [loadData])

  const latestUpdateAt = useMemo(() => {
    const settlementUpdate = pickLatestUpdate(settlementRows)
    const spotUpdate = pickLatestUpdate(spotRows)
    return settlementUpdate > spotUpdate ? settlementUpdate : spotUpdate
  }, [settlementRows, spotRows])

  const settlementColumns = useMemo(
    () => [
      {
        title: '币种',
        dataIndex: 'offeredCode',
        width: 160,
        render: (value) => toCurrencyLabel(value),
      },
      {
        title: '币对',
        dataIndex: 'pair',
        width: 120,
      },
      {
        title: '现汇买入',
        dataIndex: 'bidRateOfCcy',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '现钞买入',
        dataIndex: 'bidRateOfCash',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '卖出价',
        dataIndex: 'ofrRateOfCash',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '中间价',
        dataIndex: 'midRate',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '更新时间',
        dataIndex: 'updateAt',
        width: 168,
      },
    ],
    [],
  )

  const spotColumns = useMemo(
    () => [
      {
        title: '币对',
        dataIndex: 'pair',
        width: 130,
      },
      {
        title: '基准币',
        dataIndex: 'offeredCode',
        width: 150,
        render: (value) => toCurrencyLabel(value),
      },
      {
        title: '计价币',
        dataIndex: 'quotedCode',
        width: 150,
        render: (value) => toCurrencyLabel(value),
      },
      {
        title: '买入价',
        dataIndex: 'bidRateOfCcy',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '卖出价',
        dataIndex: 'ofrRateOfCcy',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '中间价',
        dataIndex: 'midRate',
        align: 'right',
        width: 120,
        render: (value) => formatRate(value),
      },
      {
        title: '更新时间',
        dataIndex: 'updateAt',
        width: 168,
      },
    ],
    [],
  )

  const pairColumns = useMemo(
    () => [
      {
        title: '币对',
        dataIndex: 'pair',
        width: 130,
      },
      {
        title: '报价币',
        dataIndex: 'offered',
        width: 120,
      },
      {
        title: '计价币',
        dataIndex: 'quoted',
        width: 120,
      },
      {
        title: '现价精度',
        dataIndex: 'spotDigits',
        width: 110,
      },
      {
        title: '远期精度',
        dataIndex: 'forwardDigits',
        width: 110,
      },
      {
        title: '掉期精度',
        dataIndex: 'adjustDigits',
        width: 110,
      },
    ],
    [],
  )

  return (
    <div className="fx-layout">
      <Card className="fx-overview-card" variant="borderless">
        <div className="fx-overview-head">
          <div className="fx-overview-copy">
            <Typography.Title level={3} className="fx-overview-title">
              建设银行外汇牌价看板
            </Typography.Title>
            <Typography.Paragraph className="fx-overview-desc">
              接入 `jshckpj_new2.xml`、`whckpj_new2.xml`、`hbdxsw.xml` 三个数据源，默认每 60 秒自动刷新。
            </Typography.Paragraph>
          </div>

          <Space className="fx-overview-tags" wrap size={[8, 8]}>
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadData({ silent: true })}
            >
              刷新
            </Button>
            <Tag color={loading ? 'default' : 'success'}>{loading ? '加载中' : '已同步'}</Tag>
            <Tag>结售汇 {settlementRows.length} 条</Tag>
            <Tag>外汇买卖 {spotRows.length} 条</Tag>
            <Tag>汇率大小事 {newsRows.length || pairRows.length} 条</Tag>
            {latestUpdateAt ? <Tag>最新更新时间 {latestUpdateAt}</Tag> : null}
          </Space>
        </div>

        {errors.length ? (
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            showIcon
            message="部分接口请求失败"
            description={errors.join('；')}
          />
        ) : null}
      </Card>

      <Card
        className="fx-section-card"
        title="结售汇参考牌价（对私）"
        extra={<span className="fx-card-extra">来源 jshckpj_new2.xml</span>}
      >
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          columns={settlementColumns}
          dataSource={settlementRows}
          scroll={{ x: 1000 }}
          locale={{ emptyText: loading ? '结售汇牌价加载中...' : <Empty description="暂无牌价数据" /> }}
        />
      </Card>

      <Card
        className="fx-section-card"
        title="外汇买卖参考牌价（对公）"
        extra={<span className="fx-card-extra">来源 whckpj_new2.xml</span>}
      >
        <Table
          size="small"
          pagination={false}
          rowKey="key"
          columns={spotColumns}
          dataSource={spotRows}
          scroll={{ x: 1100 }}
          locale={{ emptyText: loading ? '外汇买卖牌价加载中...' : <Empty description="暂无牌价数据" /> }}
        />
      </Card>

      <Card
        className="fx-section-card"
        title="汇率大小事 / 币对配置"
        extra={<span className="fx-card-extra">来源 hbdxsw.xml</span>}
      >
        {newsRows.length ? (
          <div className="fx-news-list">
            {newsRows.map((item) => (
              <article className="fx-news-item" key={item.key}>
                <h4>{item.title}</h4>
                <p>{item.content || '暂无正文'}</p>
                <span>{item.time || '--'}</span>
              </article>
            ))}
          </div>
        ) : (
          <Table
            size="small"
            pagination={false}
            rowKey="key"
            columns={pairColumns}
            dataSource={pairRows}
            scroll={{ x: 820 }}
            locale={{ emptyText: loading ? '汇率大小事加载中...' : <Empty description="暂无数据" /> }}
          />
        )}
      </Card>
    </div>
  )
}

export default FxMarketModule
