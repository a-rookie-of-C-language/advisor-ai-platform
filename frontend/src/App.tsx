import { useEffect } from 'react'
import { App as AntdApp } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router'
import ErrorBoundary from './components/ErrorBoundary'
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
    <ErrorBoundary>
      <BrowserRouter>
        <MessageApiBridge />
        <AppRouter />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
