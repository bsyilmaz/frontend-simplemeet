// Import randombytes replacement first
import './services/randombytes';
// Then the crypto polyfill
import './services/cryptoPolyfill';
// Then other polyfills
import './polyfills';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
