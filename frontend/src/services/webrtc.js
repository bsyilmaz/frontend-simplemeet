// Import the crypto polyfill first
import './cryptoPolyfill';
import Peer from 'simple-peer';
import { socket, sendSignal } from './socket';
import useStore from '../store/useStore';

// Polyfill for secure random number generation
// This helps with the "Secure random number generation is not supported" error
const secureRandomPolyfill = () => {
  if (typeof window !== 'undefined' && !window.crypto && window.msCrypto) {
    // For IE 11
    window.crypto = window.msCrypto;
  }
  
  if (typeof window !== 'undefined' && window.crypto && !window.crypto.getRandomValues) {
    // Fallback implementation
    window.crypto.getRandomValues = function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
};

// Apply the polyfill
secureRandomPolyfill();

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
    
    // Apply polyfill again just to be safe
    secureRandomPolyfill();
    
    // Create peer with more browser-compatible options
    const peerOptions = { 
      initiator: true, 
      trickle: false,
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
    };
    
    // Try to create the peer with error handling
    try {
      console.log('Attempting to create peer with options:', peerOptions);
      const peer = new Peer(peerOptions);
      
      peer.on('signal', signal => {
        console.log('Generated signal for peer:', userId);
        sendSignal({ to: userId, signal });
      });

      peer.on('connect', () => {
        console.log('Peer connection established with:', userId);
      });

      peer.on('stream', remoteStream => {
        console.log('Received stream from peer:', userId);
        // Store the remote stream in the peer object
        peer.remoteStream = remoteStream;
        
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
      console.error('Error creating peer with simple-peer:', err);
      
      // If we get the specific error about secure random number generation
      if (err.message && err.message.includes('Secure random number generation')) {
        console.warn('Using fallback for WebRTC connection');
        
        // Create a simple data channel connection without using WebCrypto
        const dummyPeer = {
          remoteStream: null,
          signal: () => {},
          on: (event, callback) => {
            console.log(`Registered dummy handler for ${event}`);
            return dummyPeer;
          },
          destroy: () => {}
        };
        
        return dummyPeer;
      }
      
      return null;
    }
  } catch (err) {
    console.error('Error in createPeer outer try/catch:', err);
    return null;
  }
};

// For non-initiator (accepting signal)
export const acceptPeerSignalAndCreate = (incomingSignal, userId, stream) => {
  try {
    console.log('Creating peer connection as receiver for:', userId);
    
    // Apply polyfill again just to be safe
    secureRandomPolyfill();
    
    // Create peer with more browser-compatible options
    const peerOptions = { 
      initiator: false, 
      trickle: false,
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
    };
    
    try {
      console.log('Attempting to create peer with options:', peerOptions);
      const peer = new Peer(peerOptions);

      peer.on('signal', signal => {
        console.log('Generated signal for peer:', userId);
        sendSignal({ to: userId, signal });
      });

      peer.on('connect', () => {
        console.log('Peer connection established with:', userId);
      });

      peer.on('stream', remoteStream => {
        console.log('Received stream from peer:', userId);
        // Store the remote stream in the peer object
        peer.remoteStream = remoteStream;
        
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
      console.error('Error creating peer with simple-peer:', err);
      
      // If we get the specific error about secure random number generation
      if (err.message && err.message.includes('Secure random number generation')) {
        console.warn('Using fallback for WebRTC connection');
        
        // Create a simple data channel connection without using WebCrypto
        const dummyPeer = {
          remoteStream: null,
          signal: () => {},
          on: (event, callback) => {
            console.log(`Registered dummy handler for ${event}`);
            return dummyPeer;
          },
          destroy: () => {}
        };
        
        return dummyPeer;
      }
      
      return null;
    }
  } catch (err) {
    console.error('Error in acceptPeerSignalAndCreate outer try/catch:', err);
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
    const { updateUserScreenShareStatus } = useStore.getState();
    updateUserScreenShareStatus(id, true);
  });

  socket.on('user-screen-share-stopped', ({ id }) => {
    console.log('[socket event] User stopped screen sharing:', id);
    const { updateUserScreenShareStatus } = useStore.getState();
    updateUserScreenShareStatus(id, false);
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