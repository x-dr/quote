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
          colorPrimary: '#1f5aa6',
          borderRadius: 12,
          colorBgLayout: 'transparent',
          colorText: '#172033',
          colorTextSecondary: 'rgba(18, 32, 52, 0.66)',
          colorBorder: '#dfe4ea',
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
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
