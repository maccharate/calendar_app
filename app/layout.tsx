"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Service Worker の登録と自動更新
    if ('serviceWorker' in navigator) {
      let refreshing = false;

      // Service Workerの更新を検知して自動リロード
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('New service worker activated, reloading...');
        window.location.reload();
      });

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);

          // 定期的に更新をチェック（1時間ごと）
          const updateInterval = setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // 新しいService Workerが待機中の場合
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available! Activating...');
                  // 新しいService Workerを即座にアクティブにする
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });

          // ページ読み込み時に即座に更新をチェック
          registration.update();

          // クリーンアップ
          return () => clearInterval(updateInterval);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <html lang="ja">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ちんぱんカレンダー" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}