import { create } from 'zustand';

const useStore = create((set) => ({
  // User related state
  username: '',
  setUsername: (username) => set({ username }),
  
  // Room related state
  roomId: null,
  roomPassword: '',
  inRoom: false,
  users: [],
  
  setRoomInfo: (roomId, roomPassword) => set({ roomId, roomPassword }),
  setInRoom: (inRoom) => set({ inRoom }),
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ 
    users: [...state.users, user] 
  })),
  removeUser: (userId) => set((state) => ({ 
    users: state.users.filter(user => user.id !== userId) 
  })),
  updateUserStream: (userId, stream) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, stream } : user
    )
  })),
  updateUserScreenShareStatus: (userId, isScreenSharing) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, isScreenSharing } : user
    )
  })),
  
  // Media related state
  localStream: null,
  screenStream: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  
  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  toggleAudio: () => set((state) => {
    if (state.localStream) {
      state.localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isAudioEnabled: !state.isAudioEnabled };
  }),
  toggleVideo: () => set((state) => {
    if (state.localStream) {
      state.localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    return { isVideoEnabled: !state.isVideoEnabled };
  }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  
  // Connection state
  peers: {},
  addPeer: (peerId, peer) => set((state) => ({
    peers: { ...state.peers, [peerId]: peer }
  })),
  removePeer: (peerId) => set((state) => {
    const newPeers = { ...state.peers };
    delete newPeers[peerId];
    return { peers: newPeers };
  }),
  
  // Reset store
  reset: () => set({
    roomId: null,
    roomPassword: '',
    inRoom: false,
    users: [],
    localStream: null,
    screenStream: null,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    peers: {},
  }),
}));

export default useStore; 