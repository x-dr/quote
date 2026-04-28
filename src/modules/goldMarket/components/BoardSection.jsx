import { Alert, Card, Segmented, Select, Spin, Table, Typography } from 'antd'
import {
  BOARD_OPTIONS,
  DATA_CHART_HEIGHT,
  DATA_CHART_PADDING_X,
  DATA_CHART_WIDTH,
  formatDataValue,
} from '../helpers'
import SentimentGauge from './SentimentGauge'

const RTJ_CODE_MEANING_MAP = {
  'Ag(T+D)': '白银T+D',
  'Au(T+D)': '黄金T+D',
  'mAu(T+D)': '迷你黄金T+D',
  'Au99.99': '黄金9999',
  GLNC: '伦敦金',
  SLNC: '伦敦银',
  PLNC: '伦敦铂',
  PANC: '伦敦钯',
  XAU: '国际现货黄金',
  XAG: '国际现货白银',
  XPD: '国际现货钯金',
  XAP: '国际现货铂金',
  'Pt99.95': '铂金9995',
  RH: '铑金',
  USDCNH: '美元/人民币汇率',
  JZJ_ag_PB: '白银回购价',
  JZJ_ag_PS: '白银销售价',
  JZJ_au_PB: '黄金回购价',
  JZJ_au_PS: '黄金销售价',
  JZJ_pt_PB: '铂金回购价',
  JZJ_pt_PS: '铂金销售价',
  JZJ_pd_PB: '钯金回购价',
  JZJ_pd_PS: '钯金销售价',
  JZJ_IR_PB: '铱回购价',
  JZJ_IR_PS: '铱销售价',
  JZJ_RU_PB: '钌回购价',
  JZJ_RU_PS: '钌销售价',
  RH_JZL_PB: '铑回购价',
  RH_JZL_PS: '铑销售价',
}

function BoardSection({
  boardTab,
  onBoardTabChange,
  sentimentLoading,
  sentimentError,
  sentimentDays,
  dataChartError,
  onOpenReserveDetail,
  activeCountryOption,
  selectedCountry,
  countrySelectOptions,
  onCountryChange,
  reserveMetric,
  metricSelectOptions,
  onReserveMetricChange,
  dataChartLoading,
  reserveCurrentValue,
  reserveData,
  reserveGeometry,
  reserveAxisLabels,
  onOpenEtfDetail,
  etfCurrentValue,
  etfData,
  etfGeometry,
  etfAxisLabels,
  rtjRows,
  rtjConnected,
  rtjError,
  rtjUpdatedAt,
}) {
  const formatCell = (value, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '--'
    }

    return Number(value).toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  }

  const rtjColumns = [
    {
      title: '品种',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      fixed: 'left',
      render: (value, row) => (
        <div className="rtj-name-cell">
          <strong>{RTJ_CODE_MEANING_MAP[value] || row.name || value || '--'}</strong>
          <span>{row.code || value || '--'}</span>
        </div>
      ),
    },
    {
      title: '最新',
      dataIndex: 'last',
      key: 'last',
      width: 104,
      render: (value, row) => (
        <span className={`rtj-value ${Number(row.updown) > 0 ? 'up' : Number(row.updown) < 0 ? 'down' : 'flat'}`}>
          {formatCell(value, 3)}
        </span>
      ),
    },
    {
      title: '涨跌',
      dataIndex: 'updown',
      key: 'updown',
      width: 104,
      render: (value) => {
        const numeric = Number(value)
        const trendClass = numeric > 0 ? 'up' : numeric < 0 ? 'down' : 'flat'
        const text = Number.isFinite(numeric)
          ? `${numeric > 0 ? '+' : ''}${formatCell(numeric, 3)}`
          : '--'

        return <span className={`rtj-value ${trendClass}`}>{text}</span>
      },
    },
    {
      title: '涨跌幅',
      dataIndex: 'updownRate',
      key: 'updownRate',
      width: 110,
      render: (value) => {
        const numeric = Number(value)
        const trendClass = numeric > 0 ? 'up' : numeric < 0 ? 'down' : 'flat'
        const text = Number.isFinite(numeric)
          ? `${numeric > 0 ? '+' : ''}${formatCell(numeric, 3)}%`
          : '--'

        return <span className={`rtj-value ${trendClass}`}>{text}</span>
      },
    },
    {
      title: '买入',
      dataIndex: 'bid',
      key: 'bid',
      width: 100,
      render: (value) => formatCell(value, 3),
    },
    {
      title: '卖出',
      dataIndex: 'ask',
      key: 'ask',
      width: 100,
      render: (value) => formatCell(value, 3),
    },
    {
      title: '最高',
      dataIndex: 'high',
      key: 'high',
      width: 100,
      render: (value) => formatCell(value, 3),
    },
    {
      title: '最低',
      dataIndex: 'low',
      key: 'low',
      width: 100,
      render: (value) => formatCell(value, 3),
    },
    {
      title: '昨收',
      dataIndex: 'preClose',
      key: 'preClose',
      width: 100,
      render: (value) => formatCell(value, 3),
    },
  ]

  return (
    <section className="board-section">
      <Segmented className="board-segmented" options={BOARD_OPTIONS} value={boardTab} onChange={onBoardTabChange} />

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
                <Card key={`${day.dateLabel}-${entry.time}`} className="sentiment-card" variant="borderless">
                  <div className="sentiment-time-row">
                    <span className="dot"></span>
                    <span>{entry.time}</span>
                  </div>
                  <Typography.Paragraph className="sentiment-title">{entry.title}</Typography.Paragraph>
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
      ) : boardTab === 'table' ? (
        <div className="data-board-list">
          {dataChartError ? <Alert showIcon type="warning" title={dataChartError} /> : null}

          <Card className="data-panel-card" variant="borderless">
            <div className="data-panel-head">
              <Typography.Title level={3} className="data-panel-title">
                全球官方黄金储备
              </Typography.Title>
              <button type="button" className="data-panel-detail data-panel-detail-action" onClick={onOpenReserveDetail}>
                查看详情
              </button>
            </div>

            <div className="data-panel-select-row">
              <Select
                value={activeCountryOption?.value || selectedCountry}
                options={countrySelectOptions}
                onChange={onCountryChange}
                variant="filled"
                className="data-select"
                loading={dataChartLoading}
                popupMatchSelectWidth={280}
              />

              <Select
                value={reserveMetric}
                options={metricSelectOptions}
                onChange={onReserveMetricChange}
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

              <svg className="data-chart-svg" viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`} preserveAspectRatio="none">
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
              <button type="button" className="data-panel-detail data-panel-detail-action" onClick={onOpenEtfDetail}>
                查看详情
              </button>
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

              <svg className="data-chart-svg" viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`} preserveAspectRatio="none">
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
      ) : (
        <div className="data-board-list">
          <Card className="data-panel-card" variant="borderless">
            <div className="rtj-table-head">
              <Typography.Title level={5} className="rtj-table-title">
                RTJ 实时行情
              </Typography.Title>
              <div className="rtj-meta">
                <span className={`rtj-status ${rtjConnected ? 'online' : 'offline'}`}>
                  {rtjConnected ? '已连接' : '已断开'}
                </span>
                <span>更新时间:{rtjUpdatedAt || '--'}</span>
              </div>
            </div>

            {rtjError ? <Alert showIcon type="warning" title={rtjError} className="rtj-error" /> : null}

            <Table
              size="small"
              className="rtj-table"
              rowKey="id"
              columns={rtjColumns}
              dataSource={rtjRows}
              pagination={false}
              scroll={{ x: 1050, y: 320 }}
              locale={{
                emptyText: '暂无 RTJ 行情数据',
              }}
            />
          </Card>
        </div>
      )}
    </section>
  )
}

export default BoardSection
