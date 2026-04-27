import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1b61c9',
          borderRadius: 12,
          colorBgLayout: 'transparent',
          colorText: '#181d26',
          colorTextSecondary: 'rgba(4, 14, 32, 0.69)',
          colorBorder: '#e0e2e6',
          colorBgContainer: '#ffffff',
          fontFamily: "'Haas',-apple-system,system-ui,'Segoe UI',Roboto,sans-serif",
        },
        components: {
          Card: {
            headerFontSize: 16,
            borderRadiusLG: 16,
          },
          Button: {
            borderRadius: 12,
          },
          Segmented: {
            trackBg: '#f8fafc',
            itemSelectedBg: '#ffffff',
            itemSelectedColor: '#181d26',
          },
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
