// Service Worker for PWA
const CACHE_NAME = 'chimpan-calendar-v6';
const urlsToCache = [
  '/calendar',
  '/dashboard',
  '/offline',
];

// SKIP_WAITINGメッセージを受信
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

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
  // 新しいService Workerを即座にアクティブにする
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
    }).then(() => {
      // すべてのクライアントで新しいService Workerを即座に使用
      return self.clients.claim();
    })
  );
});

// ネットワークリクエストの処理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 認証関連のリクエストは常にネットワーク優先（キャッシュしない）
  if (url.pathname.startsWith('/api/auth') ||
      url.pathname.startsWith('/auth') ||
      url.pathname === '/api/auth/signin' ||
      url.pathname === '/api/auth/signout' ||
      url.pathname === '/api/auth/session') {
    event.respondWith(fetch(event.request));
    return;
  }

  // API リクエストは常にネットワーク優先
  if (url.pathname.startsWith('/api/')) {
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

  // HTML、JavaScript、CSSファイルはネットワークファースト
  if (url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname === '/' ||
      url.pathname.startsWith('/calendar') ||
      url.pathname.startsWith('/giveaway') ||
      url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // レスポンスが有効な場合はキャッシュに保存
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラー時はキャッシュから返す
          return caches.match(event.request);
        })
    );
    return;
  }

  // それ以外（画像など）はキャッシュファースト戦略
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
            // リダイレクトレスポンス（3xx）はキャッシュせずにそのまま返す
            if (response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)) {
              return response;
            }

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

// プッシュ通知を受信
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: data.icon || 'https://chimpancommunity.com/src/icon/logo_no_txt.png',
    badge: 'https://chimpancommunity.com/src/icon/logo_no_txt.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      eventId: data.eventId,
    },
    actions: [
      {
        action: 'open',
        title: '開く',
      },
      {
        action: 'close',
        title: '閉じる',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '通知', options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているタブがあればそれをフォーカス
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // なければ新しいタブで開く
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
