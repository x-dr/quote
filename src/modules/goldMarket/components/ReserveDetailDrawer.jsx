import { Alert, Button, Drawer, Select, Spin, Typography } from 'antd'
import {
  DATA_CHART_HEIGHT,
  DATA_CHART_PADDING_X,
  DATA_CHART_WIDTH,
  formatDataValue,
  formatSigned,
  getTrendClass,
} from '../helpers'

function ReserveDetailDrawer({
  reserveDetailVisible,
  onClose,
  reserveDetailLoading,
  onRefresh,
  activeCountryOption,
  selectedCountry,
  countrySelectOptions,
  onCountryChange,
  reserveMetric,
  metricSelectOptions,
  onReserveMetricChange,
  reserveDetailError,
  reserveDetailCurrentValue,
  reserveDetailData,
  reserveDetailGeometry,
  reserveDetailAxisLabels,
  reserveDetailChangeDisplayRows,
  reserveDetailMaxChangeAbs,
  onLoadMoreChange,
}) {
  return (
    <Drawer
      title={null}
      open={reserveDetailVisible}
      onClose={onClose}
      placement="right"
      size="large"
      className="reserve-detail-drawer"
    >
      <div className="reserve-detail-head">
        <Typography.Title level={3} className="reserve-detail-title">
          全球官方黄金储备
        </Typography.Title>
        <Button size="small" loading={reserveDetailLoading} onClick={onRefresh}>
          刷新
        </Button>
      </div>

      <div className="reserve-detail-select-row">
        <Select
          value={activeCountryOption?.value || selectedCountry}
          options={countrySelectOptions}
          onChange={onCountryChange}
          variant="filled"
          className="data-select"
          loading={reserveDetailLoading}
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

      {reserveDetailError ? <Alert showIcon type="warning" title={reserveDetailError} /> : null}

      <div className="reserve-detail-summary">
        <div className="reserve-detail-label">当前黄金储备({reserveMetric === 'weight' ? '吨' : '亿美元'})</div>
        <div className="reserve-detail-value-row">
          <span className="reserve-detail-value">{formatDataValue(reserveDetailCurrentValue, 3)}</span>
          {reserveDetailData.tag ? <em>{reserveDetailData.tag}</em> : null}
        </div>
        <div className="reserve-detail-update">更新时间:{reserveDetailData.updateAt || '--'}</div>
      </div>

      <div className="reserve-detail-section-title">
        {reserveMetric === 'weight' ? '黄金储备量(月度)' : '黄金储备价值(月度)'}
      </div>
      <div className="data-chart-shell reserve-detail-chart-shell">
        {reserveDetailLoading ? <Spin size="small" className="chart-loading" /> : null}

        <div className="data-y-axis">
          {reserveDetailGeometry.tickValues.map((tickValue, index) => (
            <span key={`detail-tick-${tickValue}-${index}`}>{formatDataValue(tickValue, 3)}</span>
          ))}
        </div>

        <svg className="data-chart-svg" viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="reserveDetailFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(239, 133, 58, 0.22)" />
              <stop offset="100%" stopColor="rgba(239, 133, 58, 0.02)" />
            </linearGradient>
          </defs>

          {reserveDetailGeometry.tickY.map((value) => (
            <line
              key={`detail-grid-${value}`}
              x1={DATA_CHART_PADDING_X}
              y1={value}
              x2={DATA_CHART_WIDTH - DATA_CHART_PADDING_X}
              y2={value}
              stroke="rgba(210, 212, 219, 0.75)"
              strokeDasharray="3 4"
            />
          ))}

          <polygon points={reserveDetailGeometry.areaPath} fill="url(#reserveDetailFill)" />
          <polyline
            points={reserveDetailGeometry.linePath}
            fill="none"
            stroke="#ef853a"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="data-axis-labels">
          <span>{reserveDetailAxisLabels[0]}</span>
          <span>{reserveDetailAxisLabels[1]}</span>
          <span>{reserveDetailAxisLabels[2]}</span>
        </div>
      </div>

      <div className="reserve-detail-section-title reserve-change-title">
        黄金储备每月变化({reserveMetric === 'weight' ? '吨' : '亿美元'})
      </div>

      <div className="reserve-change-list">
        {reserveDetailChangeDisplayRows.length ? (
          reserveDetailChangeDisplayRows.map((item) => {
            const numeric = Number(item.value) || 0
            const percent =
              reserveDetailMaxChangeAbs > 0
                ? Math.max((Math.abs(numeric) / reserveDetailMaxChangeAbs) * 100, numeric === 0 ? 0 : 12)
                : 0
            const trendClass = getTrendClass(numeric)

            return (
              <div key={item.id} className="reserve-change-row">
                <span className="reserve-change-label">{item.label}</span>
                <div className="reserve-change-metrics">
                  <span className={`reserve-change-bar ${trendClass}`} style={{ width: `${Math.min(percent, 100)}%` }}></span>
                  <span className={`reserve-change-value ${trendClass}`}>{formatSigned(numeric, 2)}</span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="reserve-change-empty">暂无月度变化数据</div>
        )}
      </div>

      {reserveDetailChangeDisplayRows.length ? (
        <button type="button" className="reserve-load-more-btn" onClick={onLoadMoreChange} disabled={reserveDetailLoading}>
          点击加载更多
        </button>
      ) : null}
    </Drawer>
  )
}

export default ReserveDetailDrawer
