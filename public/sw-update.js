// Service Worker更新検知スクリプト
if ('serviceWorker' in navigator) {
  let refreshing = false;

  // Service Workerの更新を検知
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    console.log('New service worker activated, reloading page...');
    window.location.reload();
  });

  // Service Worker登録と更新チェック
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('Service Worker registered:', registration.scope);

    // 定期的に更新をチェック（1時間ごと）
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // 新しいService Workerが待機中の場合
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新しいバージョンが利用可能
          console.log('New version available! Installing...');

          // 新しいService Workerを即座にアクティブにする
          newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  });

  // ページ読み込み時に更新をチェック
  window.addEventListener('load', () => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.update();
    });
  });
}
