import { Suspense, startTransition, useCallback, useMemo, useState } from 'react'
import { Segmented, Typography } from 'antd'
import ModuleErrorBoundary from './components/ModuleErrorBoundary'
import { marketModules } from './modules/registry'
import './App.css'

function App() {
  const [activeModuleKey, setActiveModuleKey] = useState('gold')

  const activeModule = useMemo(
    () => marketModules.find((module) => module.key === activeModuleKey) || marketModules[0],
    [activeModuleKey],
  )

  const ActiveModuleComponent = activeModule.component

  const moduleOptions = useMemo(
    () =>
      marketModules.map((module) => {
        return {
          value: module.key,
          label: module.title,
        }
      }),
    [],
  )

  const handleModuleChange = useCallback((value) => {
    const nextModule = marketModules.find((module) => module.key === value)
    nextModule?.load?.()

    startTransition(() => {
      setActiveModuleKey(value)
    })
  }, [])

  return (
    <div className="app-shell">
      <div className="mobile-shell">
        <header className="mobile-header">
          <Typography.Title level={3} className="mobile-title">
            {activeModule.title}
          </Typography.Title>
          <Typography.Text type="secondary" className="mobile-subtitle">
            {activeModule.subtitle}
          </Typography.Text>
          <Segmented
            className="module-switch"
            block
            value={activeModuleKey}
            options={moduleOptions}
            onChange={handleModuleChange}
          />
        </header>

        <main className="mobile-content" id="main-content">
          <ModuleErrorBoundary resetKey={activeModuleKey}>
            <Suspense
              fallback={
                <div className="module-loading" role="status" aria-live="polite">
                  <span className="module-loading-spinner" aria-hidden="true" />
                  模块加载中…
                </div>
              }
            >
              <ActiveModuleComponent title={activeModule.title} subtitle={activeModule.subtitle} />
            </Suspense>
          </ModuleErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
