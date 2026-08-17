import { useState } from 'react'
import { Alert, Badge, Button, Card, Segmented, Select, Spin } from 'antd'
import { InfoCircleOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  CHART_HEIGHT,
  CHART_PADDING_X,
  CHART_WIDTH,
  MORE_MIN_TIMEFRAME_OPTIONS,
  TIMEFRAME_OPTIONS,
  formatPrice,
  formatSigned,
} from '../helpers'

function QuotePanel({
  productSku,
  onProductSkuChange,
  statusMeta,
  snapshotLoading,
  onRefresh,
  onReconnect,
  quoteTrendClass,
  quoteData,
  londonTrendClass,
  gold9999TrendClass,
  snapshotError,
  chartError,
  timeframe,
  onTimeframeChange,
  moreTimeframe,
  onMoreTimeframeChange,
  chartLoading,
  chartGeometry,
  candlestickGeometry,
  isKlineChart,
  chartMetrics,
  chartAxisLabels,
  goldSkuOptions,
}) {
  const [activeCandleIndex, setActiveCandleIndex] = useState(null)
  const activeCandle =
    activeCandleIndex === null ? null : candlestickGeometry.candles[activeCandleIndex] || null

  const handleTimeframeChange = (nextTimeframe) => {
    setActiveCandleIndex(null)
    onTimeframeChange(nextTimeframe)
  }

  const handleMoreTimeframeChange = (nextTimeframe) => {
    setActiveCandleIndex(null)
    onMoreTimeframeChange(nextTimeframe)
  }

  const handleKlinePointerMove = (event) => {
    if (!isKlineChart || !candlestickGeometry.candles.length) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * CHART_WIDTH
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    candlestickGeometry.candles.forEach((candle, index) => {
      const distance = Math.abs(candle.x - pointerX)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    setActiveCandleIndex(nearestIndex)
  }

  return (
    <>
      <div className="quote-toolbar">
        <Select
          value={productSku}
          options={goldSkuOptions}
          onChange={onProductSkuChange}
          variant="filled"
          style={{ width: 142 }}
        />

        <div className="quote-toolbar-actions">
          <Badge status={statusMeta.color} text={statusMeta.text} />
          <Button size="small" loading={snapshotLoading} icon={<ReloadOutlined />} onClick={onRefresh}>
            刷新
          </Button>
          <Button size="small" icon={<ThunderboltOutlined />} onClick={onReconnect}>
            重连
          </Button>
        </div>
      </div>

      <Card className="quote-top-card" variant="borderless">
        <div className="price-main-row">
          <div className="price-main-block">
            <div className={`price-main-value ${quoteTrendClass}`}>{formatPrice(quoteData.latestPrice)}</div>
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
          <div className="chart-label left-top">
            {formatPrice(
              isKlineChart ? candlestickGeometry.axisMaxPrice : chartGeometry.maxPrice,
            )}
          </div>
          {!isKlineChart ? (
            <div className="chart-label left-mid">{formatPrice(quoteData.openPrice)}</div>
          ) : null}
          <div className="chart-label left-bottom">
            {formatPrice(
              isKlineChart ? candlestickGeometry.axisMinPrice : chartGeometry.minPrice,
            )}
          </div>
          {!isKlineChart ? (
            <>
              <div className="chart-label right-top">
                {formatSigned(chartMetrics.topPercent, 2, '%')}
              </div>
              <div className="chart-label right-mid">0%</div>
              <div className="chart-label right-bottom">
                {formatSigned(chartMetrics.bottomPercent, 2, '%')}
              </div>
            </>
          ) : null}

          {activeCandle ? (
            <div
              className={`kline-tooltip ${activeCandle.x > CHART_WIDTH / 2 ? 'align-left' : 'align-right'}`}
              style={{ '--tooltip-x': `${(activeCandle.x / CHART_WIDTH) * 100}%` }}
              role="status"
            >
              <strong>{activeCandle.label}</strong>
              <span>开 {formatPrice(activeCandle.open)}</span>
              <span>高 {formatPrice(activeCandle.high)}</span>
              <span>低 {formatPrice(activeCandle.low)}</span>
              <span>收 {formatPrice(activeCandle.close)}</span>
            </div>
          ) : null}

          <svg
            className={`intraday-chart-svg ${isKlineChart ? 'is-kline' : 'is-time'}`}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={isKlineChart ? '黄金价格 K 线图' : '黄金价格分时图'}
            onPointerMove={handleKlinePointerMove}
            onPointerDown={handleKlinePointerMove}
            onPointerLeave={() => setActiveCandleIndex(null)}
          >
            <title>{isKlineChart ? '黄金价格 K 线图' : '黄金价格分时图'}</title>
            <defs>
              <linearGradient id="priceFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 92, 92, 0.25)" />
                <stop offset="100%" stopColor="rgba(255, 92, 92, 0.02)" />
              </linearGradient>
            </defs>

            {isKlineChart ? (
              <>
                {[0.25, 0.5, 0.75].map((progress) => {
                  const y =
                    candlestickGeometry.plotTop +
                    (candlestickGeometry.plotBottom - candlestickGeometry.plotTop) * progress

                  return (
                    <line
                      key={`horizontal-${progress}`}
                      className="kline-grid-line"
                      x1={candlestickGeometry.plotLeft}
                      y1={y}
                      x2={candlestickGeometry.plotRight}
                      y2={y}
                    />
                  )
                })}

                {[0.25, 0.5, 0.75].map((progress) => {
                  const x =
                    candlestickGeometry.plotLeft +
                    (candlestickGeometry.plotRight - candlestickGeometry.plotLeft) * progress

                  return (
                    <line
                      key={`vertical-${progress}`}
                      className="kline-grid-line"
                      x1={x}
                      y1={candlestickGeometry.plotTop}
                      x2={x}
                      y2={candlestickGeometry.plotBottom}
                    />
                  )
                })}

                {candlestickGeometry.candles.map((candle, index) => (
                  <g
                    key={candle.id}
                    className={`kline-candle ${candle.isUp ? 'up' : 'down'} ${index === activeCandleIndex ? 'active' : ''}`}
                  >
                    <line
                      x1={candle.x}
                      y1={candle.highY}
                      x2={candle.x}
                      y2={candle.lowY}
                    />
                    <rect
                      x={candle.x - candle.bodyWidth / 2}
                      y={candle.bodyY}
                      width={candle.bodyWidth}
                      height={candle.bodyHeight}
                    />
                  </g>
                ))}

                {[candlestickGeometry.maxMarker, candlestickGeometry.minMarker]
                  .filter(Boolean)
                  .map((marker, index) => (
                    <g className="kline-extreme" key={index === 0 ? 'maximum' : 'minimum'}>
                      <line x1={marker.x} y1={marker.y} x2={marker.lineX} y2={marker.y} />
                      <text
                        x={marker.textX}
                        y={marker.y - 5}
                        textAnchor={marker.textAnchor}
                      >
                        {formatPrice(marker.value)}
                      </text>
                    </g>
                  ))}

                {activeCandle ? (
                  <g className="kline-crosshair" aria-hidden="true">
                    <line
                      x1={activeCandle.x}
                      y1={candlestickGeometry.plotTop}
                      x2={activeCandle.x}
                      y2={candlestickGeometry.plotBottom}
                    />
                    <line
                      x1={candlestickGeometry.plotLeft}
                      y1={activeCandle.closeY}
                      x2={candlestickGeometry.plotRight}
                      y2={activeCandle.closeY}
                    />
                  </g>
                ) : null}
              </>
            ) : (
              <>
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
              </>
            )}
          </svg>

          <div className="chart-time-axis">
            <span>{chartAxisLabels[0]}</span>
            <span>{chartAxisLabels[1]}</span>
            <span>{chartAxisLabels[2]}</span>
          </div>
        </div>
      </Card>
    </>
  )
}

export default QuotePanel
