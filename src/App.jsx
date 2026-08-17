import { lazy, Suspense } from 'react'
import { Typography } from 'antd'
import ModuleErrorBoundary from './components/ModuleErrorBoundary'
import './App.css'

const GoldMarketModule = lazy(() => import('./modules/GoldMarketModule'))

function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳至行情内容
      </a>
      <div className="mobile-shell">
        <header className="mobile-header">
          <div className="market-brand-row">
            <div className="market-brand">
              <span className="market-brand-symbol" aria-hidden="true">J</span>
              <span className="market-brand-name">JDJY <em>MARKET</em></span>
            </div>
            <div className="market-source-status">
              <span aria-hidden="true" />
              多源行情聚合
            </div>
          </div>

          <div className="market-heading-row">
            <div>
              <span className="market-eyebrow">GOLD MARKET OVERVIEW</span>
              <Typography.Title level={1} className="mobile-title">
                黄金行情
              </Typography.Title>
              <Typography.Text className="mobile-subtitle">
                实时金价、K 线与黄金市场数据
              </Typography.Text>
            </div>
            <div className="market-heading-meta" aria-label="产品特性">
              <span>实时更新</span>
              <span>多端适配</span>
            </div>
          </div>
        </header>

        <main className="mobile-content" id="main-content">
          <ModuleErrorBoundary resetKey="gold">
            <Suspense
              fallback={
                <div className="module-loading" role="status" aria-live="polite">
                  <span className="module-loading-spinner" aria-hidden="true" />
                  模块加载中…
                </div>
              }
            >
              <GoldMarketModule />
            </Suspense>
          </ModuleErrorBoundary>
        </main>

        <footer className="app-footer">
          <span>行情数据仅供参考，不构成任何投资建议</span>
          <span>© {new Date().getFullYear()} JDJY Market</span>
        </footer>
      </div>
    </div>
  )
}

export default App
