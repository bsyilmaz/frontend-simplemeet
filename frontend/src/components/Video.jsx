import { useEffect, useRef } from 'react';

const Video = ({ stream, username, muted = false, isActive = false, isScreenShare = false }) => {
  const videoRef = useRef(null);
  
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Handle play errors
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Video playback started successfully
            console.log(`Video playback started for ${username}`);
          })
          .catch(error => {
            console.error(`Error playing video for ${username}:`, error);
            // Try to play again with user interaction
            const handleUserInteraction = () => {
              videoRef.current.play()
                .then(() => {
                  document.removeEventListener('click', handleUserInteraction);
                  document.removeEventListener('touchstart', handleUserInteraction);
                })
                .catch(err => console.error('Still failed to play:', err));
            };
            
            document.addEventListener('click', handleUserInteraction);
            document.addEventListener('touchstart', handleUserInteraction);
          });
      }
    }
  }, [stream]);
  
  // If no stream is provided, show a placeholder
  if (!stream) {
    return (
      <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg relative h-48 flex items-center justify-center">
        <div className="text-white text-center p-4">
          <p className="font-medium">{username}</p>
          <p className="text-sm text-gray-400">No video available</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg overflow-hidden shadow-lg relative ${isActive ? 'ring-4 ring-blue-500' : ''}`}>
      <video
        ref={videoRef}
        className={`w-full ${isScreenShare ? 'h-auto' : 'h-48 md:h-64 object-cover'}`}
        muted={muted}
        autoPlay
        playsInline
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
        {username}
      </div>
    </div>
  );
};

export default Video; 