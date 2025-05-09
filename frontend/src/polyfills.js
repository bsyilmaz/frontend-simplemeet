import { Buffer } from 'buffer';

// Apply polyfills immediately
(function() {
  console.log('Applying comprehensive polyfills...');
  
  // Global polyfills
  window.global = window;
  window.Buffer = Buffer;
  window.process = { env: {} };
  
  // WebCrypto API polyfills
  if (typeof window !== 'undefined') {
    // For IE 11
    if (!window.crypto && window.msCrypto) {
      console.log('Using msCrypto as crypto');
      window.crypto = window.msCrypto;
    }
    
    // Create crypto if it doesn't exist
    if (!window.crypto) {
      console.log('Creating window.crypto');
      window.crypto = {};
    }
    
    // Implement getRandomValues if it doesn't exist
    if (!window.crypto.getRandomValues) {
      console.log('Implementing getRandomValues');
      window.crypto.getRandomValues = function(array) {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
    }
    
    // Direct replacement for randombytes used by simple-peer
    window.randomBytes = function(size, cb) {
      console.log('Using randomBytes polyfill from polyfills.js, size:', size);
      const bytes = new Uint8Array(size);
      window.crypto.getRandomValues(bytes);
      
      if (cb) {
        setTimeout(() => {
          cb(null, bytes);
        }, 0);
      }
      
      return bytes;
    };
    
    // Monkey patch the require function for simple-peer
    if (typeof window.require !== 'function') {
      window.require = function(module) {
        if (module === 'randombytes') {
          return window.randomBytes;
        }
        throw new Error(`Cannot find module '${module}'`);
      };
    }
    
    // Test the polyfill
    try {
      const testArray = new Uint8Array(10);
      window.crypto.getRandomValues(testArray);
      console.log('WebCrypto polyfill test successful in polyfills.js:', testArray);
    } catch (err) {
      console.error('WebCrypto polyfill test failed in polyfills.js:', err);
    }
  }
})();

// Simple-peer specific polyfill
if (typeof window !== 'undefined' && window.SimplePeer) {
  const originalSimplePeer = window.SimplePeer;
  window.SimplePeer = function(opts) {
    try {
      return new originalSimplePeer(opts);
    } catch (err) {
      if (err.message && err.message.includes('Secure random number generation')) {
        console.warn('Using fallback for secure random number generation');
        // Force a random number generator that doesn't rely on WebCrypto
        if (!window.crypto) window.crypto = {};
        if (!window.crypto.getRandomValues) {
          window.crypto.getRandomValues = function(array) {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 256);
            }
            return array;
          };
        }
        return new originalSimplePeer(opts);
      }
      throw err;
    }
  };
}

export default {}; 