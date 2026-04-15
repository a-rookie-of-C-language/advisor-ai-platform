import { useEffect } from 'react'
import { App as AntdApp } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router'
import { setGlobalMessageApi } from './utils/globalMessage'

function MessageApiBridge() {
  const { message } = AntdApp.useApp()

  useEffect(() => {
    setGlobalMessageApi(message)
  }, [message])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <MessageApiBridge />
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
