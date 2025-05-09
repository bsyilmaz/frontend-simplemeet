/**
 * Simple insecure random bytes generator
 * This replaces the secure crypto.getRandomValues() with a simple Math.random() implementation
 * Not for production use in security-critical applications, but works for WebRTC connections
 */

// Simple function to generate random bytes without using crypto API
function insecureRandomBytes(size) {
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    arr[i] = Math.floor(Math.random() * 256); // Güvensiz ama iş görür
  }
  return arr;
}

// Compatibility with the randombytes library API
function randomBytes(size, cb) {
  const bytes = insecureRandomBytes(size);
  
  if (cb) {
    setTimeout(() => {
      cb(null, bytes);
    }, 0);
  }
  
  return bytes;
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.insecureRandomBytes = insecureRandomBytes;
  window.randomBytes = randomBytes;
  
  // Also patch crypto if needed
  if (!window.crypto) {
    window.crypto = {};
  }
  
  if (!window.crypto.getRandomValues) {
    window.crypto.getRandomValues = function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
  
  console.log('Insecure random bytes generator installed');
}

export default randomBytes;
export { insecureRandomBytes }; 