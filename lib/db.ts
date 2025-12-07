import mysql from 'mysql2/promise';
import fs from 'fs';

// SSL設定（本番環境でConoHa VPS MySQL接続用）
const getSSLConfig = (): mysql.SslOptions | undefined => {
  const caCertPath = process.env.DB_SSL_CA;

  // SSL証明書が指定されていて、ファイルが存在する場合はSSL接続
  if (caCertPath && fs.existsSync(caCertPath)) {
    return {
      ca: fs.readFileSync(caCertPath),
      rejectUnauthorized: true,
    };
  }

  // ローカル開発環境ではSSLなし
  return undefined;
};

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'raffle_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+09:00', // JST
  ssl: getSSLConfig(),
});