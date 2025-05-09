import Peer from 'simple-peer';
import { socket, sendSignal } from './socket';
import useStore from '../store/useStore';

// Initialize the user's media stream (audio and video)
export const initUserMedia = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Browser API navigator.mediaDevices.getUserMedia not available');
      alert('Bu tarayıcı kamera/mikrofon erişimini desteklemiyor. Başka bir tarayıcı deneyin.');
      return null;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      console.log('Available video devices:', videoDevices);
      console.log('Available audio devices:', audioDevices);
      if (videoDevices.length === 0) console.warn('No video devices found');
      if (audioDevices.length === 0) console.warn('No audio devices found');
    } catch (e) {
      console.error('Failed to enumerate devices:', e);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      useStore.getState().setLocalStream(stream);
      console.log('Successfully obtained audio and video stream:', stream);
      return stream;
    } catch (e) {
      console.error('Error getting both audio and video:', e.name, e.message);
      try {
        console.log('Trying with audio only...');
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        alert('Kamera erişimi başarısız, sadece ses ile devam ediliyor.');
        useStore.getState().setLocalStream(audioOnlyStream);
        console.log('Successfully obtained audio-only stream:', audioOnlyStream);
        return audioOnlyStream;
      } catch (audioErr) {
        console.error('Audio only also failed:', audioErr.name, audioErr.message);
        alert('Kamera ve mikrofon erişimi engellendi. Lütfen tarayıcı izinlerinizi kontrol edin ve sayfayı yenileyin.');
        return null;
      }
    }
  } catch (error) {
    console.error('General error in initUserMedia:', error);
    alert('Kamera ve mikrofon erişimi sırasında bir hata oluştu: ' + error.message);
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

// For initiator
export const createPeer = (userId, stream) => {
  console.log(`[createPeer] For user: ${userId}. Stream valid: ${!!stream}. Stream active: ${stream?.active}. Tracks:`, stream?.getTracks().map(t => `${t.kind}:${t.readyState}`));
  if (!stream || !stream.active || stream.getTracks().length === 0) {
    console.error(`[createPeer] Invalid or empty stream for user ${userId}. Cannot create peer.`);
    return null;
  }
  try {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on('signal', (signal) => sendSignal({ to: userId, signal }));
    peer.on('error', (err) => console.error(`[createPeer] Peer error for ${userId}:`, err));
    peer.on('connect', () => console.log(`[createPeer] Connected to ${userId}`));
    return peer;
  } catch (err) {
    console.error(`[createPeer] EXCEPTION during Peer creation for ${userId}:`, err);
    return null;
  }
};

// For non-initiator (accepting signal)
export const acceptPeerSignalAndCreate = (incomingSignal, userId, stream) => {
  console.log(`[acceptPeerSignalAndCreate] From user: ${userId}. Stream valid: ${!!stream}. Stream active: ${stream?.active}. Tracks:`, stream?.getTracks().map(t => `${t.kind}:${t.readyState}`));
  if (!stream || !stream.active || stream.getTracks().length === 0) {
    console.error(`[acceptPeerSignalAndCreate] Invalid or empty stream for user ${userId}. Cannot create peer.`);
    return null;
  }
  try {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on('signal', (signalData) => sendSignal({ to: userId, signal: signalData }));
    peer.signal(incomingSignal);
    peer.on('error', (err) => console.error(`[acceptPeerSignalAndCreate] Peer error for ${userId}:`, err));
    peer.on('connect', () => console.log(`[acceptPeerSignalAndCreate] Connected with ${userId}`));
    return peer;
  } catch (err) {
    console.error(`[acceptPeerSignalAndCreate] EXCEPTION during Peer creation/signaling for ${userId}:`, err);
    return null;
  }
};

// Set up WebRTC listeners for handling new peer connections
export const setupWebRTCListeners = () => {
  const store = useStore.getState();

  socket.on('user-joined', (newUser) => {
    console.log('[socket event] user-joined:', newUser);
    const currentLocalStream = useStore.getState().localStream; // Get fresh stream state
    const storeAddPeer = useStore.getState().addPeer;
    const storeAddUser = useStore.getState().addUser;


    if (!currentLocalStream) {
      console.error(`[user-joined] Local stream is NOT available when user ${newUser.username} joined. Cannot create peer.`);
      return;
    }
    console.log(`[user-joined] Local stream for new user ${newUser.username} is available. Active: ${currentLocalStream.active}. Tracks:`, currentLocalStream.getTracks().map(t => `${t.kind}:${t.readyState}`));

    const peerForNewUser = createPeer(newUser.id, currentLocalStream);
    if (!peerForNewUser) {
      console.error(`[user-joined] Failed to create peer for ${newUser.username}. Aborting.`);
      return;
    }
    storeAddPeer(newUser.id, peerForNewUser);
    storeAddUser(newUser);
    console.log(`[user-joined] Peer creation process initiated for ${newUser.username}.`);
  });

  socket.on('user-signal', ({ from, signal }) => {
    console.log('[socket event] user-signal from:', from, 'Signal:', signal);
    const currentLocalStream = useStore.getState().localStream;
    const currentPeers = useStore.getState().peers;
    const storeAddPeer = useStore.getState().addPeer;
    // const storeAddUser = useStore.getState().addUser; // User should already be in store from 'user-joined' or 'room-joined'

    if (!currentLocalStream) {
      console.error(`[user-signal] Local stream is NOT available when handling signal from ${from}. Cannot process signal.`);
      return;
    }
     console.log(`[user-signal] Local stream for signal from ${from} is available. Active: ${currentLocalStream.active}. Tracks:`, currentLocalStream.getTracks().map(t => `${t.kind}:${t.readyState}`));

    const peerExists = currentPeers[from];
    if (peerExists) {
      console.log(`[user-signal] Peer already exists for ${from}. Signaling existing peer.`);
      try {
        peerExists.signal(signal);
      } catch (err) {
        console.error(`[user-signal] EXCEPTION during peer.signal() for existing peer ${from}:`, err)
      }
    } else {
      console.log(`[user-signal] Peer does not exist for ${from}. Creating new peer (non-initiator) to accept signal.`);
      const newPeer = acceptPeerSignalAndCreate(signal, from, currentLocalStream);
      if (!newPeer) {
        console.error(`[user-signal] Failed to create peer for signal from ${from}. Aborting.`);
        return;
      }
      storeAddPeer(from, newPeer);
      console.log(`[user-signal] Peer creation and signaling process initiated for signal from ${from}.`);
    }
  });

  socket.on('user-left', ({ id }) => {
    console.log('[socket event] user-left:', id);
    const currentPeers = useStore.getState().peers;
    const storeRemovePeer = useStore.getState().removePeer;
    const storeRemoveUser = useStore.getState().removeUser;

    if (currentPeers[id]) {
      try {
        currentPeers[id].destroy();
      } catch (err) {
        console.error(`[user-left] Error destroying peer for ${id}:`, err);
      }
      storeRemovePeer(id);
    }
    storeRemoveUser(id);
    console.log(`[user-left] Cleaned up for user ${id}.`);
  });

  socket.on('user-screen-share-started', ({ id }) => {
    console.log('[socket event] User started screen sharing:', id);
    // Potentially update user state in store: useStore.getState().updateUserScreenShareStatus(id, true);
  });

  socket.on('user-screen-share-stopped', ({ id }) => {
    console.log('[socket event] User stopped screen sharing:', id);
    // Potentially update user state in store: useStore.getState().updateUserScreenShareStatus(id, false);
  });
};

export default {
  initUserMedia,
  startScreenShare,
  stopScreenShare,
  createPeer,
  acceptPeerSignalAndCreate, // Make sure this is exported if used elsewhere, but primarily it's internal to setupWebRTCListeners
  setupWebRTCListeners,
}; 