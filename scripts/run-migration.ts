/**
 * マイグレーション実行スクリプト
 * Usage: npx tsx scripts/run-migration.ts <migration-file.sql>
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { pool } from '../lib/db';

async function runMigration() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Usage: npx tsx scripts/run-migration.ts <migration-file.sql>');
    process.exit(1);
  }

  const migrationPath = join(__dirname, '..', 'migrations', migrationFile);

  try {
    // マイグレーションファイルを読み込む
    console.log(`📖 Reading migration file: ${migrationPath}`);
    const sql = await readFile(migrationPath, 'utf8');

    // SQL文を分割（セミコロンで区切る）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} SQL statement(s)...`);

    // 各SQL文を実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`   ${i + 1}. Executing: ${statement.substring(0, 60)}...`);
      await pool.query(statement);
    }

    console.log('✅ Migration completed successfully!');

    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
