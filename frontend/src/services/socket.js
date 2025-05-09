import { io } from 'socket.io-client';

// Get the backend URL from environment variables or use a default
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

console.log('Connecting to backend at:', BACKEND_URL);

// Create a socket connection to the backend
export const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
  withCredentials: true,
  extraHeaders: {
    'Access-Control-Allow-Origin': '*'
  }
});

// Add event listeners for debugging
socket.on('connect', () => {
  console.log('Socket connected successfully with ID:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// Helper functions for socket events
export const connectSocket = () => {
  if (!socket.connected) {
    console.log('Attempting to connect socket...');
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const joinRoom = (roomId, username, password = '') => {
  console.log(`Joining room ${roomId} as ${username}`);
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