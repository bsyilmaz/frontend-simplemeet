// A basic WebRTC implementation that doesn't rely on simple-peer or WebCrypto
// This uses the native WebRTC API directly

class BasicPeer {
  constructor(options) {
    this._events = {};
    this.initiator = options.initiator || false;
    this.stream = options.stream || null;
    this.config = options.config || {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        }
      ]
    };
    
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
  
  async _processSignal() {
    // Wait for ICE gathering to complete or timeout after 1 second
    if (this.pc.iceGatheringState !== 'complete') {
      try {
        await new Promise((resolve) => {
          const checkState = () => {
            if (this.pc.iceGatheringState === 'complete') {
              resolve();
            }
          };
          
          this.pc.onicegatheringstatechange = checkState;
          
          // Also set a timeout in case gathering takes too long
          setTimeout(resolve, 1000);
        });
      } catch (err) {
        console.warn('ICE gathering timed out, sending partial candidates');
      }
    }
    
    // Send the signal with the current description
    if (this.pc.localDescription) {
      this.emit('signal', {
        type: this.pc.localDescription.type,
        sdp: this.pc.localDescription.sdp
      });
    }
  }
  
  async signal(data) {
    try {
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

export default BasicPeer; 