// Load polyfills first to ensure they run before any other code
import './polyfills';
// Load the peer replacer to handle WebRTC compatibility
import './services/peerReplacer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply additional polyfills for WebRTC
if (typeof window !== 'undefined') {
  console.log('Applying additional WebRTC polyfills in main.jsx');
  
  // Ensure randomBytes is available for simple-peer
  if (!window.randomBytes) {
    window.randomBytes = function(size, cb) {
      const bytes = new Uint8Array(size);
      window.crypto.getRandomValues(bytes);
      
      if (cb) {
        setTimeout(() => {
          cb(null, bytes);
        }, 0);
      }
      
      return bytes;
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
