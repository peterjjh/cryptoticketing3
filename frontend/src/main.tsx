import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// Polyfill Buffer for ethers/browser libs needing Node's Buffer
import { Buffer } from 'buffer'
if (!(window as any).Buffer) {
  (window as any).Buffer = Buffer
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)