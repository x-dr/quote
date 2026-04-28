import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('@ant-design/icons')) {
            return 'antd-icons'
          }

          if (
            id.includes('/antd/es/table') ||
            id.includes('/rc-table/') ||
            id.includes('/rc-pagination/') ||
            id.includes('/rc-virtual-list/')
          ) {
            return 'antd-table'
          }

          if (
            id.includes('/antd/es/select') ||
            id.includes('/rc-select/') ||
            id.includes('/rc-overflow/') ||
            id.includes('/rc-trigger/') ||
            id.includes('/rc-menu/')
          ) {
            return 'antd-select'
          }

          if (
            id.includes('/antd/es/drawer') ||
            id.includes('/rc-dialog/') ||
            id.includes('/rc-drawer/') ||
            id.includes('/rc-motion/') ||
            id.includes('/@rc-component/portal/')
          ) {
            return 'antd-overlay'
          }

          if (
            id.includes('/antd/es/config-provider') ||
            id.includes('/antd/es/app') ||
            id.includes('/antd/es/theme') ||
            id.includes('/antd/es/style') ||
            id.includes('/@ant-design/colors/') ||
            id.includes('/@ant-design/cssinjs') ||
            id.includes('/@ant-design/cssinjs-utils') ||
            id.includes('/@ant-design/fast-color') ||
            id.includes('/rc-util/')
          ) {
            return 'antd-foundation'
          }

          if (id.includes('/antd/')) {
            return 'antd-ui'
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
