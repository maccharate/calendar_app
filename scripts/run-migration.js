#!/usr/bin/env node

/**
 * マイグレーション実行スクリプト
 * Usage: node scripts/run-migration.js <migration-file.sql>
 */

const path = require('path');
const fs = require('fs').promises;

// プロジェクトルートのnode_modulesを参照するためにモジュールパスを追加
const projectRoot = path.join(__dirname, '..');
require('module').globalPaths.push(path.join(projectRoot, 'node_modules'));

const mysql = require('mysql2/promise');

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Usage: node scripts/run-migration.js <migration-file.sql>');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '..', 'migrations', path.basename(migrationFile));

  try {
    // マイグレーションファイルを読み込む
    console.log(`📖 Reading migration file: ${migrationPath}`);
    const sql = await fs.readFile(migrationPath, 'utf8');

    // データベース接続
    console.log('🔌 Connecting to database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'raffle_db',
      multipleStatements: true, // 複数のSQL文を実行できるようにする
    });

    console.log('✅ Connected to database');

    // マイグレーション実行
    console.log('🚀 Executing migration...');
    await connection.query(sql);

    console.log('✅ Migration completed successfully!');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
