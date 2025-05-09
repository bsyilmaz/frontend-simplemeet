// This is a direct replacement for the randombytes module
// that simple-peer uses internally

// Simple implementation that doesn't rely on WebCrypto
function randomBytes(size, cb) {
  // Create a random array of bytes
  const bytes = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  
  // If callback is provided, use it
  if (cb) {
    setTimeout(() => {
      cb(null, bytes);
    }, 0);
  }
  
  return bytes;
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.randomBytes = randomBytes;
  
  // Try to override the module system
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = randomBytes;
  }
}

export default randomBytes; 