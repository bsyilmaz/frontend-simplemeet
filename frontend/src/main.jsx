// Import insecureRandomBytes first to ensure it's available before any other code
import './services/insecureRandomBytes';
// Then load other polyfills
import './polyfills';
// import './services/peerReplacer'; // No longer needed as we use native WebRTC
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply additional WebRTC compatibility fixes
if (typeof window !== 'undefined') {
  console.log('Applying additional WebRTC compatibility fixes in main.jsx');
  
  // Replace randombytes module if any other dependency needs it
  if (typeof window.require !== 'function') {
    window.require = function(module) {
      if (module === 'randombytes') {
        console.log('Intercepted request for randombytes module');
        return window.randomBytes;
      }
      // Allow other modules to be required if necessary by other libs
      // throw new Error(`Cannot find module '${module}'`); 
      console.warn(`Module '${module}' not found, but require was polyfilled.`);
      return {}; // Return empty object or handle appropriately
    };
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
