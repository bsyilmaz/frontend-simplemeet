// Direct WebCrypto API polyfill
// This file should be imported before simple-peer to ensure the polyfill is applied

(function() {
  console.log('Applying WebCrypto polyfill...');
  
  // For IE 11
  if (typeof window !== 'undefined' && !window.crypto && window.msCrypto) {
    console.log('Using msCrypto as crypto');
    window.crypto = window.msCrypto;
  }

  // If crypto exists but getRandomValues doesn't
  if (typeof window !== 'undefined' && (!window.crypto || !window.crypto.getRandomValues)) {
    console.log('Adding getRandomValues polyfill');
    if (!window.crypto) window.crypto = {};
    
    window.crypto.getRandomValues = function(array) {
      console.log('Using polyfilled getRandomValues');
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
  
  // Test the polyfill
  try {
    const testArray = new Uint8Array(10);
    window.crypto.getRandomValues(testArray);
    console.log('WebCrypto polyfill test successful:', testArray);
  } catch (err) {
    console.error('WebCrypto polyfill test failed:', err);
  }
})(); 