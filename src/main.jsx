import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyAccessibilitySettings, loadAccessibilitySettings } from './utils/accessibilityStorage.js'
import { initNativeShell } from './utils/nativeBootstrap.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { reportClientError } from './utils/clientErrorReporting.js'
import { initI18n } from './i18n/index.js'

applyAccessibilitySettings(loadAccessibilitySettings())
void initNativeShell()

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const error = reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled rejection'))
  void reportClientError(error, {}, 'unhandledrejection')
})

const root = createRoot(document.getElementById('root'))

initI18n().then(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
})
