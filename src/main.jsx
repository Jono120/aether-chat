import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyAccessibilitySettings, loadAccessibilitySettings } from './utils/accessibilityStorage.js'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

applyAccessibilitySettings(loadAccessibilitySettings())
import { ToastProvider } from './context/ToastContext.jsx'
import { reportClientError } from './utils/clientErrorReporting.js'

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const error = reason instanceof Error ? reason : new Error(String(reason ?? 'Unhandled rejection'))
  void reportClientError(error, {}, 'unhandledrejection')
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
