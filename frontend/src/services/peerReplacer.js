// This script runs immediately and replaces simple-peer functionality
console.log('Peer replacer script running');

// Define a replacement for simple-peer
class ReplacementPeer {
  constructor(options) {
    console.log('Creating replacement peer with options:', options);
    this._events = {};
    this.initiator = options.initiator || false;
    this.stream = options.stream || null;
    this.config = options.config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    };
    
    try {
      this.pc = new RTCPeerConnection(this.config);
      
      // Add stream if provided
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          this.pc.addTrack(track, this.stream);
        });
      }
      
      // Handle ICE candidates
      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this._processSignal();
        }
      };
      
      // Handle connection state changes
      this.pc.onconnectionstatechange = () => {
        console.log('Connection state:', this.pc.connectionState);
        if (this.pc.connectionState === 'connected') {
          this.emit('connect');
        }
      };
      
      // Handle remote streams
      this.pc.ontrack = (event) => {
        console.log('Received remote track:', event.track);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          this.emit('stream', this.remoteStream);
        }
      };
      
      // Create offer if initiator
      if (this.initiator) {
        this._createOffer();
      }
    } catch (err) {
      console.error('Error creating RTCPeerConnection:', err);
      this.emit('error', err);
    }
  }
  
  async _createOffer() {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this._processSignal();
    } catch (err) {
      console.error('Error creating offer:', err);
      this.emit('error', err);
    }
  }
  
  _processSignal() {
    // Send the signal with the current description
    if (this.pc && this.pc.localDescription) {
      this.emit('signal', {
        type: this.pc.localDescription.type,
        sdp: this.pc.localDescription.sdp
      });
    }
  }
  
  async signal(data) {
    try {
      if (!this.pc) {
        console.error('No RTCPeerConnection available');
        return;
      }
      
      if (data.type === 'offer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this._processSignal();
      } else if (data.type === 'answer') {
        await this.pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(data));
      }
    } catch (err) {
      console.error('Error processing signal:', err);
      this.emit('error', err);
    }
  }
  
  on(event, callback) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(callback);
    return this;
  }
  
  emit(event, ...args) {
    if (!this._events[event]) return this;
    this._events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in ${event} callback:`, err);
      }
    });
    return this;
  }
  
  destroy() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    // Clear all event listeners
    this._events = {};
    
    return this;
  }
}

// Try to replace the simple-peer module
try {
  // Method 1: Replace the module in window
  if (typeof window !== 'undefined') {
    window.SimplePeer = ReplacementPeer;
    
    // Also try to replace it in the module system
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = ReplacementPeer;
    }
  }
  
  // Method 2: Try to monkey patch the bundled code
  // This is a more aggressive approach
  const originalDefine = window.define;
  if (originalDefine) {
    window.define = function(name, deps, callback) {
      // If this looks like the simple-peer module
      if (typeof name === 'string' && name.includes('simple-peer')) {
        console.log('Intercepted simple-peer module definition');
        return originalDefine(name, deps, function() {
          return ReplacementPeer;
        });
      }
      
      // If it's a function that might return simple-peer
      if (typeof callback === 'function') {
        const originalCallback = callback;
        callback = function() {
          const result = originalCallback.apply(this, arguments);
          if (result && typeof result === 'function' && result.name === 'Peer') {
            console.log('Replaced simple-peer constructor');
            return ReplacementPeer;
          }
          return result;
        };
      }
      
      return originalDefine(name, deps, callback);
    };
    
    // Copy properties from the original define
    for (const prop in originalDefine) {
      window.define[prop] = originalDefine[prop];
    }
  }
  
  console.log('Successfully set up peer replacer');
} catch (err) {
  console.error('Error setting up peer replacer:', err);
}

// Export the replacement peer
export default ReplacementPeer; 