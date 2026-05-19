import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sileo'
import 'sileo/styles.css'
import App from './App'
import { AuthProvider } from '@/context/AuthContext'
import { CajeroThemeProvider } from './context/CajeroThemeContext'
import './index.css'
import './styles/mobile-navbar.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CajeroThemeProvider>
          <Toaster position="top-right" />
          <App />
        </CajeroThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)