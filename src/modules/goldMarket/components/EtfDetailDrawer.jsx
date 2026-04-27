import { Alert, Button, Drawer, Spin, Typography } from 'antd'
import {
  DATA_CHART_HEIGHT,
  DATA_CHART_PADDING_X,
  DATA_CHART_WIDTH,
  formatChangeAxisTick,
  formatDataValue,
  formatSigned,
} from '../helpers'

function EtfDetailDrawer({
  etfDetailVisible,
  onClose,
  etfDetailLoading,
  onRefresh,
  etfDetailError,
  etfDetailCurrentValue,
  etfDetailPublisher,
  etfDetailData,
  etfDetailGeometry,
  etfDetailAxisLabels,
  etfDetailChangeChartModel,
  onLoadMoreChange,
}) {
  return (
    <Drawer
      title={null}
      open={etfDetailVisible}
      onClose={onClose}
      placement="right"
      size="large"
      className="etf-detail-drawer"
    >
      <div className="reserve-detail-head">
        <Typography.Title level={3} className="reserve-detail-title">
          黄金ETF持仓
        </Typography.Title>
        <Button size="small" loading={etfDetailLoading} onClick={onRefresh}>
          刷新
        </Button>
      </div>

      {etfDetailError ? <Alert showIcon type="warning" title={etfDetailError} /> : null}

      <div className="reserve-detail-summary">
        <div className="etf-summary-top-row">
          <div>
            <div className="reserve-detail-label">当前总持仓(吨)</div>
            <div className="reserve-detail-value-row">
              <span className="reserve-detail-value">{formatDataValue(etfDetailCurrentValue, 3)}</span>
            </div>
          </div>
          <div className="etf-publisher-pill">
            <span>公布机构：</span>
            <em>{etfDetailPublisher}</em>
          </div>
        </div>
      </div>

      <div className="etf-section-divider"></div>

      <div className="etf-title-row">
        <div className="reserve-detail-section-title">黄金ETF总持仓变化</div>
        <div className="reserve-detail-update">更新时间:{etfDetailData.updateAt || '--'}</div>
      </div>
      <div className="data-chart-shell reserve-detail-chart-shell">
        {etfDetailLoading ? <Spin size="small" className="chart-loading" /> : null}

        <div className="data-y-axis">
          {etfDetailGeometry.tickValues.map((tickValue, index) => (
            <span key={`etf-detail-tick-${tickValue}-${index}`}>{formatDataValue(tickValue, 3)}</span>
          ))}
        </div>

        <svg className="data-chart-svg" viewBox={`0 0 ${DATA_CHART_WIDTH} ${DATA_CHART_HEIGHT}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="etfDetailFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(239, 133, 58, 0.22)" />
              <stop offset="100%" stopColor="rgba(239, 133, 58, 0.02)" />
            </linearGradient>
          </defs>

          {etfDetailGeometry.tickY.map((value) => (
            <line
              key={`etf-detail-grid-${value}`}
              x1={DATA_CHART_PADDING_X}
              y1={value}
              x2={DATA_CHART_WIDTH - DATA_CHART_PADDING_X}
              y2={value}
              stroke="rgba(210, 212, 219, 0.75)"
              strokeDasharray="3 4"
            />
          ))}

          <polygon points={etfDetailGeometry.areaPath} fill="url(#etfDetailFill)" />
          <polyline
            points={etfDetailGeometry.linePath}
            fill="none"
            stroke="#ef853a"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>

        <div className="data-axis-labels">
          <span>{etfDetailAxisLabels[0]}</span>
          <span>{etfDetailAxisLabels[1]}</span>
          <span>{etfDetailAxisLabels[2]}</span>
        </div>
      </div>

      <div className="etf-section-divider"></div>

      <div className="reserve-detail-section-title reserve-change-title">黄金ETF每日持仓变化一览(吨)</div>

      <div className="etf-change-board">
        {etfDetailChangeChartModel.barRows.length ? (
          <>
            <div className="etf-change-list">
              {etfDetailChangeChartModel.barRows.map((item) => {
                const isZero = item.numeric === 0
                const positiveLabelLeft = item.leftPercent + item.widthPercent + 1.2
                const isPositiveNearRightEdge = item.numeric > 0 && positiveLabelLeft > 84
                const negativeLabelLeft = item.leftPercent - 1.2
                const isNegativeNearLeftEdge = item.numeric < 0 && negativeLabelLeft < 9
                const valueStyle = isZero
                  ? {
                      left: `${etfDetailChangeChartModel.zeroPercent + 1.2}%`,
                    }
                  : item.numeric > 0
                    ? isPositiveNearRightEdge
                      ? {
                          left: 'auto',
                          right: '4px',
                        }
                      : {
                          left: `${Math.min(positiveLabelLeft, 94)}%`,
                        }
                    : isNegativeNearLeftEdge
                      ? {
                          left: `${Math.min(item.leftPercent + item.widthPercent + 1.2, 92)}%`,
                        }
                      : {
                          left: `${Math.max(negativeLabelLeft, 7)}%`,
                        }
                return (
                  <div key={item.id} className="etf-change-row">
                    <span className="etf-change-date">{item.label}</span>
                    <div className="etf-change-track">
                      <span className="etf-change-zero-axis" style={{ left: `${etfDetailChangeChartModel.zeroPercent}%` }}></span>
                      <span
                        className={`etf-change-bar ${item.trendClass} ${isZero ? 'zero' : ''}`}
                        style={{
                          left: `${item.leftPercent}%`,
                          width: `${Math.max(item.widthPercent, isZero ? 0.24 : 0)}%`,
                        }}
                      ></span>
                      <span
                        className={`etf-change-value ${item.trendClass} ${
                          isZero ? 'zero' : ''
                        } ${isPositiveNearRightEdge ? 'edge-right' : ''} ${
                          isNegativeNearLeftEdge ? 'edge-left' : ''
                        }`}
                        style={valueStyle}
                      >
                        {isZero ? '0' : formatSigned(item.numeric, 3)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="etf-change-axis">
              <span className="etf-axis-badge down">减少</span>
              <div className="etf-axis-ticks">
                {etfDetailChangeChartModel.tickValues.map((tick) => (
                  <span key={`etf-change-tick-${tick}`}>{formatChangeAxisTick(tick, etfDetailChangeChartModel.tickStep)}</span>
                ))}
              </div>
              <span className="etf-axis-badge up">增加</span>
            </div>

            <button type="button" className="etf-load-more-btn" onClick={onLoadMoreChange} disabled={etfDetailLoading}>
              点击加载更多
            </button>
          </>
        ) : (
          <div className="reserve-change-empty">暂无ETF变化数据</div>
        )}
      </div>
    </Drawer>
  )
}

export default EtfDetailDrawer
