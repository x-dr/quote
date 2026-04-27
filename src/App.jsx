import { useMemo, useState } from 'react'
import { Segmented, Typography } from 'antd'
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

  return (
    <div className="app-shell">
      <div className="ambient-shape shape-1"></div>
      <div className="ambient-shape shape-2"></div>

      <div className="mobile-shell">
        <header className="mobile-header">
          <Typography.Text className="mobile-brand">Quote Forge</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {activeModule.title} 行情
          </Typography.Title>
          <Typography.Text type="secondary" className="mobile-subtitle">
            {activeModule.subtitle}
          </Typography.Text>
          <Segmented
            className="module-switch"
            block
            value={activeModuleKey}
            options={moduleOptions}
            onChange={(value) => setActiveModuleKey(value)}
          />
        </header>

        <main className="mobile-content">
          <ActiveModuleComponent title={activeModule.title} subtitle={activeModule.subtitle} />
        </main>
      </div>
    </div>
  )
}

export default App
