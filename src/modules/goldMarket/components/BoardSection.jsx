import { Alert, Card, Segmented, Select, Spin, Typography } from 'antd'
import {
  BOARD_OPTIONS,
  DATA_CHART_HEIGHT,
  DATA_CHART_PADDING_X,
  DATA_CHART_WIDTH,
  SentimentGauge,
  formatDataValue,
} from '../helpers'

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
}) {
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
      ) : (
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
      )}
    </section>
  )
}

export default BoardSection
