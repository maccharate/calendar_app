// Service Worker for PWA
const CACHE_NAME = 'chimpan-calendar-v1';
const urlsToCache = [
  '/',
  '/calendar',
  '/dashboard',
  '/offline',
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Cache install error:', error);
      })
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  // API リクエストは常にネットワーク優先
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'オフラインです' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // それ以外はキャッシュファースト戦略
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }

        // なければネットワークから取得
        return fetch(event.request)
          .then((response) => {
            // レスポンスが有効でない場合はそのまま返す
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // レスポンスをクローンしてキャッシュに保存
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // オフライン時のフォールバック
            return caches.match('/offline');
          });
      })
  );
});

// バックグラウンド同期（オプション）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-events') {
    event.waitUntil(syncEvents());
  }
});

async function syncEvents() {
  try {
    // オフライン時に保存したデータを同期
    console.log('Syncing events...');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
