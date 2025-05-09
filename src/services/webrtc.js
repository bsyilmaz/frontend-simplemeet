import Peer from 'simple-peer';
import { socket, sendSignal } from './socket';
import useStore from '../store/useStore';

// Initialize the user's media stream (audio and video)
export const initUserMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    const { setLocalStream } = useStore.getState();
    setLocalStream(stream);
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    return null;
  }
};

// Initialize screen sharing
export const startScreenShare = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    
    const { setScreenStream, setScreenSharing } = useStore.getState();
    setScreenStream(screenStream);
    setScreenSharing(true);
    
    // Add event listener for when user stops screen sharing
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

// Create a peer connection with another user
export const createPeer = (userId, stream) => {
  const peer = new Peer({
    initiator: true,
    trickle: false,
    stream,
  });
  
  peer.on('signal', (signal) => {
    sendSignal({ to: userId, signal });
  });
  
  return peer;
};

// Accept a peer connection from another user
export const addPeer = (incomingSignal, userId, stream) => {
  const peer = new Peer({
    initiator: false,
    trickle: false,
    stream,
  });
  
  peer.on('signal', (signal) => {
    sendSignal({ to: userId, signal });
  });
  
  peer.signal(incomingSignal);
  
  return peer;
};

// Set up WebRTC listeners for handling new peer connections
export const setupWebRTCListeners = () => {
  const {
    localStream,
    users,
    addPeer,
    removePeer,
    addUser,
    removeUser,
  } = useStore.getState();
  
  // Handle new user joining the room
  socket.on('user-joined', (user) => {
    console.log('User joined:', user);
    // Create a new peer connection to the new user
    const peer = createPeer(user.id, localStream);
    addPeer(user.id, peer);
    addUser(user);
  });
  
  // Handle receiving a signal from another user
  socket.on('user-signal', ({ from, signal }) => {
    console.log('Received signal from:', from);
    const { peers } = useStore.getState();
    
    // If we already have a peer connection to this user, use it
    if (peers[from]) {
      peers[from].signal(signal);
    } else {
      // Otherwise, create a new peer connection
      const peer = addPeer(signal, from, localStream);
      addPeer(from, peer);
      
      // Find user info
      const user = users.find(u => u.id === from);
      if (user) {
        addUser(user);
      }
    }
  });
  
  // Handle user leaving the room
  socket.on('user-left', ({ id }) => {
    console.log('User left:', id);
    const { peers } = useStore.getState();
    
    // Close peer connection if it exists
    if (peers[id]) {
      peers[id].destroy();
      removePeer(id);
    }
    
    // Remove user from the list
    removeUser(id);
  });
  
  // Handle screen sharing events
  socket.on('user-screen-share-started', ({ id }) => {
    // Update UI to show that a user is screen sharing
    console.log('User started screen sharing:', id);
    // You could update the user object to indicate they are screen sharing
  });
  
  socket.on('user-screen-share-stopped', ({ id }) => {
    console.log('User stopped screen sharing:', id);
  });
};

export default {
  initUserMedia,
  startScreenShare,
  stopScreenShare,
  createPeer,
  addPeer,
  setupWebRTCListeners,
}; 