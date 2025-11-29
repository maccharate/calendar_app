/**
 * VAPID鍵ペアを生成するスクリプト
 *
 * 実行方法:
 * node scripts/generate-vapid-keys.js
 *
 * 生成された鍵を .env.local に追加してください:
 * VAPID_PUBLIC_KEY=...
 * VAPID_PRIVATE_KEY=...
 * VAPID_MAILTO=mailto:your-email@example.com
 */

const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('='.repeat(60));
console.log('VAPID鍵ペアが生成されました');
console.log('='.repeat(60));
console.log('');
console.log('.env.local ファイルに以下を追加してください:');
console.log('');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_MAILTO=mailto:your-email@example.com`);
console.log('');
console.log('='.repeat(60));
