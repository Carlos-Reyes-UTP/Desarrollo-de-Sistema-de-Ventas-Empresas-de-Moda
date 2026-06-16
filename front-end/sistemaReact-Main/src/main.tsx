import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sileo'
import 'sileo/styles.css'
import App from './App'
import { AuthProvider } from '@/context/AuthContext'
import { AppThemeProvider } from './context/AppThemeContext'
import 'material-symbols/outlined.css';
import './styles/material-symbols-lcp.css';
import './index.css'
import './styles/mobile-navbar.css'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppThemeProvider>
          <Toaster position="top-right" />
          <App />
        </AppThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)