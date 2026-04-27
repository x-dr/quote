import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#b78a1f',
          borderRadius: 12,
          colorBgLayout: 'transparent',
          fontFamily:
            "'Avenir Next','Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif",
        },
        components: {
          Menu: {
            itemSelectedBg: 'rgba(255, 227, 159, 0.45)',
            itemSelectedColor: '#6c4b00',
          },
          Card: {
            headerFontSize: 16,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
