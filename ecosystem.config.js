module.exports = {
  apps: [{
    name: 'calendar-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/calendar_app',

    // クラスターモード（複数インスタンス）
    instances: 4,  // 6コアのうち4インスタンス（残り2コアはシステム用）
    exec_mode: 'cluster',

    // 環境変数
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },

    // ログ設定
    error_file: '/var/www/calendar_app/logs/pm2-error.log',
    out_file: '/var/www/calendar_app/logs/pm2-out.log',
    time: true,  // ログにタイムスタンプを追加

    // 再起動設定
    autorestart: true,  // クラッシュ時に自動再起動
    max_restarts: 10,   // 1分間に10回以上再起動したら停止
    min_uptime: '10s',  // 最低10秒稼働していれば正常とみなす
    max_memory_restart: '1G',  // 1GBメモリ使用で再起動（8GBあるので余裕あり）

    // その他の設定
    watch: false,  // ファイル変更監視は無効（本番環境）
    ignore_watch: ['node_modules', 'logs', '.next/cache'],

    // クラスター間通信の待機時間
    listen_timeout: 10000,  // 10秒
    kill_timeout: 5000,     // 5秒
  }]
};
