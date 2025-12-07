import mysql from 'mysql2/promise';

// Cloud SQL接続用の設定
const isProduction = process.env.NODE_ENV === 'production';

const poolConfig: mysql.PoolOptions = {
  // Cloud SQL Proxy経由またはPrivate IP接続
  ...(isProduction && process.env.INSTANCE_UNIX_SOCKET
    ? {
        socketPath: process.env.INSTANCE_UNIX_SOCKET,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
      }),

  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'raffle_db',

  // 接続プールの設定
  waitForConnections: true,
  connectionLimit: 10, // Cloud Runのインスタンス数 × 10程度
  maxIdle: 10, // アイドル接続の最大数
  idleTimeout: 60000, // 60秒
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // SSL/TLS設定（本番環境では必須）
  ssl: isProduction ? {
    rejectUnauthorized: true,
  } : undefined,

  // タイムゾーン設定
  timezone: '+09:00', // JST

  // エラーハンドリング
  connectTimeout: 10000, // 10秒
};

export const pool = mysql.createPool(poolConfig);

// 接続テスト関数
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});
