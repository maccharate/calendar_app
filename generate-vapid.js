const crypto = require('crypto');

// Generate ECDSA key pair for VAPID
const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der'
  }
});

// Convert to base64url format (URL-safe base64)
function toBase64Url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const publicKeyBase64 = toBase64Url(publicKey);
const privateKeyBase64 = toBase64Url(privateKey);

console.log('=== VAPID Keys Generated ===\n');
console.log('Public Key:');
console.log(publicKeyBase64);
console.log('');
console.log('Private Key:');
console.log(privateKeyBase64);
console.log('');
console.log('Add these to your .env.local file:');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBase64}`);
console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
