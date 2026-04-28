import { formatPrice } from '../helpers'

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

export default SentimentGauge
