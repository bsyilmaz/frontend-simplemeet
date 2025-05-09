// Import insecureRandomBytes first to ensure it's available before any other code
import './services/insecureRandomBytes';
// Then load other polyfills
import './polyfills';
// Load the peer replacer to handle WebRTC compatibility
import './services/peerReplacer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply additional WebRTC compatibility fixes
if (typeof window !== 'undefined') {
  console.log('Applying additional WebRTC compatibility fixes in main.jsx');
  
  // Replace randombytes module for simple-peer
  if (typeof window.require !== 'function') {
    window.require = function(module) {
      if (module === 'randombytes') {
        console.log('Intercepted request for randombytes module');
        return window.randomBytes;
      }
      throw new Error(`Cannot find module '${module}'`);
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
