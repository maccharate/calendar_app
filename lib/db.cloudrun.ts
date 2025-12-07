import mysql from 'mysql2/promise';
import fs from 'fs';

/**
 * Cloud Run用データベース接続設定
 * ConoHa VPS MySQL に SSL/TLS 経由で接続
 */

const isCloudRun = process.env.K_SERVICE !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * SSL/TLS設定を取得
 * Secret ManagerからマウントされたCA証明書を使用
 */
const getSSLConfig = (): mysql.SslOptions | undefined => {
  if (!isProduction) {
    return undefined;
  }

  // Cloud RunのSecret Manager経由でマウントされたCA証明書のパス
  const caCertPath = '/secrets/mysql-ca-cert';

  try {
    if (fs.existsSync(caCertPath)) {
      const caCert = fs.readFileSync(caCertPath);
      console.log('✅ MySQL CA certificate loaded from Secret Manager');

      return {
        ca: caCert,
        rejectUnauthorized: true,
      };
    }
  } catch (error) {
    console.error('⚠️  Failed to load CA certificate:', error);
  }

  // CA証明書がない場合でもSSL接続を試みる（証明書検証なし）
  // 注意: 本番環境では推奨されない
  if (process.env.DB_REQUIRE_SSL === 'true') {
    console.warn('⚠️  Using SSL without CA verification');
    return {
      rejectUnauthorized: false,
    };
  }

  return undefined;
};

/**
 * 接続プール設定
 * Cloud Run用に最適化（短命インスタンス対応）
 */
const poolConfig: mysql.PoolOptions = {
  // 接続情報
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // 接続プール設定（Cloud Run用に最適化）
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5'), // Cloud Runは短命なため少なめ
  maxIdle: 2,
  idleTimeout: 60000, // 60秒
  queueLimit: 0,

  // Keep-Alive設定
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // SSL/TLS設定（本番環境では必須）
  ssl: getSSLConfig(),

  // タイムゾーン設定
  timezone: process.env.DB_TIMEZONE || '+09:00', // JST

  // タイムアウト設定
  connectTimeout: 10000, // 10秒

  // 文字セット
  charset: 'utf8mb4',

  // デバッグ（開発環境のみ）
  debug: process.env.DB_DEBUG === 'true' ? ['ComQueryPacket'] : false,
};

// ログ出力（開発環境のみ）
if (!isProduction) {
  console.log('Database pool configuration:', {
    host: poolConfig.host,
    port: poolConfig.port,
    user: poolConfig.user,
    database: poolConfig.database,
    connectionLimit: poolConfig.connectionLimit,
    ssl: !!poolConfig.ssl,
  });
}

/**
 * MySQL接続プール
 */
export const pool = mysql.createPool(poolConfig);

/**
 * 接続テスト関数
 * アプリケーション起動時に呼び出して接続を確認
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();

    // SSL接続状態を確認
    const [sslStatus] = await connection.query<mysql.RowDataPacket[]>(
      "SHOW STATUS LIKE 'Ssl_cipher'"
    );

    if (sslStatus && sslStatus.length > 0) {
      console.log('✅ Database connected successfully with SSL');
      console.log(`   SSL Cipher: ${sslStatus[0].Value}`);
    } else {
      console.log('✅ Database connected successfully (no SSL)');
    }

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);

    if (error instanceof Error) {
      // 接続エラーの詳細をログ
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        sqlState: (error as any).sqlState,
      });
    }

    throw error;
  }
}

/**
 * 接続プールの状態を取得
 */
export function getPoolStatus() {
  return {
    threadId: (pool as any)._allConnections?.length || 0,
    connectionLimit: poolConfig.connectionLimit,
    idleTimeout: poolConfig.idleTimeout,
  };
}

/**
 * Graceful shutdown
 * Cloud RunのSIGTERMシグナルを受けて接続を閉じる
 */
process.on('SIGTERM', async () => {
  console.log('📝 SIGTERM received, closing database connections...');

  try {
    await pool.end();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }

  process.exit(0);
});

// Cloud Run環境変数の確認
if (isCloudRun) {
  console.log('🌐 Running on Cloud Run');
  console.log(`   Service: ${process.env.K_SERVICE}`);
  console.log(`   Revision: ${process.env.K_REVISION}`);
  console.log(`   Configuration: ${process.env.K_CONFIGURATION}`);
}
