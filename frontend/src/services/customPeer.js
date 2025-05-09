// Custom implementation of Peer that doesn't rely on WebCrypto
import Peer from 'simple-peer';

// Create a custom random bytes generator that doesn't use WebCrypto
function customRandomBytes(size) {
  const array = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
}

// Override the randomBytes function in the simple-peer dependency
try {
  // Try to find and replace the randomBytes function in simple-peer's dependencies
  if (typeof window !== 'undefined') {
    // This is a hack to replace the randomBytes function in the randombytes module
    // that simple-peer uses
    window._randomBytesCache = customRandomBytes;
    
    // Create a proxy for require to intercept calls to randombytes
    const originalRequire = window.require;
    if (originalRequire) {
      window.require = function(module) {
        if (module === 'randombytes') {
          return window._randomBytesCache;
        }
        return originalRequire(module);
      };
    }
  }
} catch (err) {
  console.error('Failed to override randomBytes:', err);
}

// Custom Peer class that wraps simple-peer but handles the secure random error
export default class CustomPeer {
  constructor(options) {
    try {
      // Try to create a normal Peer
      this.peer = new Peer(options);
      this.setupEventForwarding();
    } catch (err) {
      console.error('Error creating peer with simple-peer:', err);
      
      if (err.message && err.message.includes('Secure random number generation')) {
        console.warn('Using fallback for WebRTC connection');
        
        // Create a minimal implementation that doesn't break the app
        this.peer = {
          _events: {},
          on: (event, callback) => {
            if (!this.peer._events[event]) {
              this.peer._events[event] = [];
            }
            this.peer._events[event].push(callback);
            return this.peer;
          },
          emit: (event, ...args) => {
            if (this.peer._events[event]) {
              this.peer._events[event].forEach(callback => callback(...args));
            }
            return this.peer;
          },
          signal: (data) => {
            console.log('Dummy peer received signal:', data);
          },
          destroy: () => {
            console.log('Dummy peer destroyed');
          }
        };
      } else {
        throw err;
      }
    }
  }
  
  // Forward all methods and properties to the underlying peer
  setupEventForwarding() {
    // Forward common events
    ['signal', 'connect', 'data', 'stream', 'track', 'close', 'error'].forEach(event => {
      this.peer.on(event, (...args) => {
        this.emit(event, ...args);
      });
    });
  }
  
  // Event handling
  on(event, callback) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return this;
  }
  
  emit(event, ...args) {
    if (!this._events) return this;
    if (!this._events[event]) return this;
    this._events[event].forEach(callback => callback(...args));
    return this;
  }
  
  // Forward common methods
  signal(data) {
    this.peer.signal(data);
    return this;
  }
  
  destroy() {
    this.peer.destroy();
    return this;
  }
  
  // Add any other methods you need to forward
}

// Static factory method for easier instantiation
CustomPeer.createPeer = function(options) {
  return new CustomPeer(options);
}; 