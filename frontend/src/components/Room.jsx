import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { socket } from '../services/socket';
import { setupWebRTCListeners } from '../services/webrtc';
import Video from './Video';
import Controls from './Controls';

const Room = () => {
  const { roomId } = useParams();
  const { 
    username, 
    inRoom, 
    users, 
    localStream,
    screenStream,
    peers,
    setInRoom, 
    setUsers,
  } = useStore();
  
  const [activeUserId, setActiveUserId] = useState(null);
  
  // If no username or roomId, redirect to login
  if (!username || !roomId) {
    return <Navigate to="/" replace />;
  }
  
  useEffect(() => {
    // Set up socket event listeners for the room
    socket.on('room-joined', ({ users }) => {
      console.log('Room joined with users:', users);
      setUsers(users);
      setInRoom(true);
    });
    
    socket.on('room-join-error', ({ message }) => {
      console.error('Failed to join room:', message);
      // Handle error - could show a modal or redirect
    });
    
    // Set up WebRTC connections with peers
    setupWebRTCListeners();
    
    return () => {
      // Clean up listeners
      socket.off('room-joined');
      socket.off('room-join-error');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('user-signal');
      socket.off('user-screen-share-started');
      socket.off('user-screen-share-stopped');
    };
  }, []);
  
  // Handle audio detection to highlight active speaker
  useEffect(() => {
    if (!localStream) return;
    
    // Set up audio level detection
    try {
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaStreamSource(localStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.2;
      
      audioSource.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let audioDetectionInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        
        // Check audio levels to detect speaking
        const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
        
        if (average > 20) {  // Threshold for considering someone as speaking
          // Set this user as active speaker
          setActiveUserId('self');
        } else {
          if (activeUserId === 'self') {
            setActiveUserId(null);
          }
        }
      }, 100);
      
      return () => {
        clearInterval(audioDetectionInterval);
        audioContext.close();
      };
    } catch (error) {
      console.error('Error setting up audio detection:', error);
    }
  }, [localStream]);
  
  // Create list of all streams
  const renderParticipants = () => {
    console.log('Rendering participants. Users:', users);
    console.log('Peers:', peers);
    
    // First render local stream
    const videos = [
      <div key="local-video" className="w-full md:w-1/2 lg:w-1/3 p-2">
        <Video 
          stream={localStream} 
          username={`${username} (You)`} 
          muted={true}
          isActive={activeUserId === 'self'}
        />
      </div>
    ];
    
    // If screen sharing, add screen stream
    if (screenStream) {
      videos.push(
        <div key="screen-share" className="w-full md:w-1/2 lg:w-2/3 p-2">
          <Video 
            stream={screenStream} 
            username={`${username}'s Screen`} 
            muted={true}
            isScreenShare={true}
          />
        </div>
      );
    }
    
    // Render all remote users
    users.forEach(user => {
      // Skip self
      if (user.id === socket.id) return;
      
      // Get peer for this user
      const peer = peers[user.id];
      let remoteStream = null;
      
      // Try to get stream from peer or user object
      if (peer && peer.remoteStream) {
        remoteStream = peer.remoteStream;
      } else if (user.stream) {
        remoteStream = user.stream;
      }
      
      if (remoteStream) {
        videos.push(
          <div key={user.id} className="w-full md:w-1/2 lg:w-1/3 p-2">
            <Video 
              stream={remoteStream} 
              username={user.username} 
              isActive={activeUserId === user.id}
            />
          </div>
        );
      } else {
        console.warn(`No stream found for user ${user.username} (${user.id})`);
      }
      
      // If user is screen sharing, show their screen too
      if (user.isScreenSharing && peer && peer.screenStream) {
        videos.push(
          <div key={`${user.id}-screen`} className="w-full md:w-1/2 lg:w-2/3 p-2">
            <Video 
              stream={peer.screenStream} 
              username={`${user.username}'s Screen`} 
              isScreenShare={true}
            />
          </div>
        );
      }
    });
    
    return videos;
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-4 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Room: {roomId}
          </h1>
          <div className="text-gray-600 dark:text-gray-300">
            {users.length} Participant(s)
          </div>
        </div>
        
        <div className="flex flex-wrap -mx-2">
          {renderParticipants()}
        </div>
      </div>
      
      <Controls />
    </div>
  );
};

export default Room; 