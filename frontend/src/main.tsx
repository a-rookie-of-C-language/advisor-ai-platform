import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { bootstrapLocalAgentForTauri } from './tauri/bootstrap'
import 'antd/dist/reset.css'
import './index.css'

void bootstrapLocalAgentForTauri().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#0369A1',
            colorBgBase: '#F8FAFC',
            fontFamily: "'Fira Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
            borderRadius: 6,
          },
        }}
      >
        <AntdApp>
          <App />
        </AntdApp>
      </ConfigProvider>
    </React.StrictMode>,
  )
})
