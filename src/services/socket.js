import { io } from 'socket.io-client';

// Get the backend URL from environment variables or use a default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Create a socket connection to the backend
export const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
});

// Helper functions for socket events
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinRoom = (roomId, username, password = '') => {
  socket.emit('join-room', { roomId, username, password });
};

export const sendSignal = (data) => {
  if (typeof data === 'object' && data.to && data.signal) {
    socket.emit('send-signal', data);
  } else {
    console.error('Invalid signal data format:', data);
  }
};

export const notifyScreenShareStarted = () => {
  socket.emit('screen-share-started');
};

export const notifyScreenShareStopped = () => {
  socket.emit('screen-share-stopped');
};

export default {
  socket,
  connectSocket,
  disconnectSocket,
  joinRoom,
  sendSignal,
  notifyScreenShareStarted,
  notifyScreenShareStopped,
}; 