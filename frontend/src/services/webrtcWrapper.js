/**
 * WebRTC Wrapper
 * 
 * This module provides a wrapper around WebRTC functionality to handle
 * the "Secure random number generation is not supported" error.
 */

import { socket, sendSignal } from './socket';
import useStore from '../store/useStore';

// Native WebRTC implementation that doesn't rely on simple-peer
class WebRTCPeer {
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

// Initialize the user's media stream (audio and video)
export const initUserMedia = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Browser API navigator.mediaDevices.getUserMedia not available');
      alert('Bu tarayıcı kamera/mikrofon erişimini desteklemiyor. Başka bir tarayıcı deneyin.');
      return null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: true, 
      audio: true 
    });
    
    useStore.getState().setLocalStream(stream);
    console.log('Successfully obtained audio and video stream:', stream);
    return stream;
  } catch (e) {
    console.error('Error getting media:', e);
    try {
      console.log('Trying with audio only...');
      const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      useStore.getState().setLocalStream(audioOnlyStream);
      return audioOnlyStream;
    } catch (audioErr) {
      console.error('Audio only also failed:', audioErr);
      return null;
    }
  }
};

// Initialize screen sharing
export const startScreenShare = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    
    useStore.getState().setScreenStream(screenStream);
    useStore.getState().setScreenSharing(true);
    
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };
    
    return screenStream;
  } catch (error) {
    console.error('Error starting screen share:', error);
    return null;
  }
};

export const stopScreenShare = () => {
  const { screenStream, setScreenStream, setScreenSharing } = useStore.getState();
  
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    setScreenStream(null);
    setScreenSharing(false);
  }
};

// For initiator
export const createPeer = (userId, stream) => {
  try {
    console.log('Creating peer connection as initiator for:', userId);
    const peer = new WebRTCPeer({ 
      initiator: true, 
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          {
            urls: 'turn:numb.viagenie.ca',
            username: 'webrtc@live.com',
            credential: 'muazkh'
          }
        ]
      }
    });

    peer.on('signal', signal => {
      console.log('Generated signal for peer:', userId);
      sendSignal({ to: userId, signal });
    });

    peer.on('connect', () => {
      console.log('Peer connection established with:', userId);
    });

    peer.on('stream', remoteStream => {
      console.log('Received stream from peer:', userId);
      // Update the user in the store with the stream
      const { users, updateUserStream } = useStore.getState();
      const user = users.find(u => u.id === userId);
      if (user) {
        updateUserStream(userId, remoteStream);
      }
    });

    peer.on('error', err => {
      console.error('Peer connection error:', err);
    });

    return peer;
  } catch (err) {
    console.error('Error creating peer:', err);
    return null;
  }
};

// For non-initiator (accepting signal)
export const acceptPeerSignalAndCreate = (incomingSignal, userId, stream) => {
  try {
    console.log('Creating peer connection as receiver for:', userId);
    const peer = new WebRTCPeer({ 
      initiator: false, 
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          {
            urls: 'turn:numb.viagenie.ca',
            username: 'webrtc@live.com',
            credential: 'muazkh'
          }
        ]
      }
    });

    peer.on('signal', signal => {
      console.log('Generated signal for peer:', userId);
      sendSignal({ to: userId, signal });
    });

    peer.on('connect', () => {
      console.log('Peer connection established with:', userId);
    });

    peer.on('stream', remoteStream => {
      console.log('Received stream from peer:', userId);
      // Update the user in the store with the stream
      const { users, updateUserStream } = useStore.getState();
      const user = users.find(u => u.id === userId);
      if (user) {
        updateUserStream(userId, remoteStream);
      }
    });

    peer.on('error', err => {
      console.error('Peer connection error:', err);
    });

    // Accept the incoming signal
    peer.signal(incomingSignal);

    return peer;
  } catch (err) {
    console.error('Error creating peer:', err);
    return null;
  }
};

// Set up WebRTC listeners for handling new peer connections
export const setupWebRTCListeners = () => {
  socket.on('user-joined', (newUser) => {
    console.log('New user joined:', newUser);
    const currentLocalStream = useStore.getState().localStream;
    const storeAddPeer = useStore.getState().addPeer;
    const storeAddUser = useStore.getState().addUser;

    if (!currentLocalStream) {
      console.error('No local stream available');
      return;
    }

    const peer = createPeer(newUser.id, currentLocalStream);
    if (peer) {
      storeAddPeer(newUser.id, peer);
      storeAddUser(newUser);
    }
  });

  socket.on('user-signal', ({ from, signal }) => {
    console.log('Received signal from:', from);
    const currentLocalStream = useStore.getState().localStream;
    const currentPeers = useStore.getState().peers;
    const storeAddPeer = useStore.getState().addPeer;

    if (!currentLocalStream) {
      console.error('No local stream available');
      return;
    }

    const existingPeer = currentPeers[from];
    if (existingPeer) {
      console.log('Signaling existing peer:', from);
      existingPeer.signal(signal);
    } else {
      console.log('Creating new peer for:', from);
      const peer = acceptPeerSignalAndCreate(signal, from, currentLocalStream);
      if (peer) {
        storeAddPeer(from, peer);
      }
    }
  });

  socket.on('user-left', ({ id }) => {
    console.log('User left:', id);
    const currentPeers = useStore.getState().peers;
    const storeRemovePeer = useStore.getState().removePeer;
    const storeRemoveUser = useStore.getState().removeUser;

    if (currentPeers[id]) {
      currentPeers[id].destroy();
      storeRemovePeer(id);
    }
    storeRemoveUser(id);
  });

  socket.on('user-screen-share-started', ({ id }) => {
    console.log('[socket event] User started screen sharing:', id);
    useStore.getState().updateUserScreenShareStatus(id, true);
  });

  socket.on('user-screen-share-stopped', ({ id }) => {
    console.log('[socket event] User stopped screen sharing:', id);
    useStore.getState().updateUserScreenShareStatus(id, false);
  });
};

export default {
  initUserMedia,
  startScreenShare,
  stopScreenShare,
  createPeer,
  acceptPeerSignalAndCreate,
  setupWebRTCListeners,
}; 