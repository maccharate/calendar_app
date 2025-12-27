import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { chatWithGemini, ChatMessage } from '@/lib/vertexai';
import { pool } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

/**
 * アプリに関する質問かどうかを判定
 */
function isAppRelatedQuestion(message: string): boolean {
  const keywords = [
    'アプリ', '使い方', '機能', '通知', '設定',
    'プッシュ', 'PWA', 'インストール', 'ヘルプ',
    'どうやって', 'できる', 'できない', 'わからない',
    'ページ', 'カレンダー', 'ダッシュボード', '履歴',
    'プレゼント', 'このアプリ', '何ができる',
    'やり方', '方法', '手順', 'ログイン', '認証'
  ];

  return keywords.some(keyword => message.includes(keyword));
}

/**
 * アプリガイドを読み込む
 */
async function loadAppGuide(): Promise<string> {
  try {
    const guidePath = path.join(process.cwd(), 'docs', 'app-guide.md');
    const guideContent = await fs.readFile(guidePath, 'utf-8');
    return guideContent;
  } catch (error) {
    console.error('Failed to load app guide:', error);
    return '';
  }
}

/**
 * トークン使用量をチェック
 */
async function checkTokenLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const [rows] = await pool.query(
      'SELECT tokens_used, daily_limit FROM ai_token_usage WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    const usage = rows as any[];
    if (usage.length === 0) {
      // 今日初めての使用
      return { allowed: true, remaining: 50000 };
    }

    const { tokens_used, daily_limit } = usage[0];
    const remaining = daily_limit - tokens_used;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('Token limit check error:', error);
    return { allowed: true, remaining: 50000 }; // エラー時は許可
  }
}

/**
 * トークン使用量を記録
 */
async function recordTokenUsage(userId: string, tokensUsed: number) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await pool.query(
      `INSERT INTO ai_token_usage (user_id, date, tokens_used, daily_limit)
       VALUES (?, ?, ?, 50000)
       ON DUPLICATE KEY UPDATE tokens_used = tokens_used + ?`,
      [userId, today, tokensUsed, tokensUsed]
    );
  } catch (error) {
    console.error('Token usage record error:', error);
  }
}

/**
 * 会話履歴を取得（直近50件）
 */
async function getConversationHistory(userId: string, limit: number = 50): Promise<ChatMessage[]> {
  try {
    const [rows] = await pool.query(
      `SELECT role, message as content FROM ai_conversations
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    const messages = rows as any[];
    return messages.reverse(); // 古い順に並び替え
  } catch (error) {
    console.error('Conversation history error:', error);
    return [];
  }
}

/**
 * 会話を保存
 */
async function saveConversation(userId: string, role: 'user' | 'assistant', message: string, tokensUsed: number = 0) {
  try {
    await pool.query(
      'INSERT INTO ai_conversations (user_id, role, message, tokens_used) VALUES (?, ?, ?, ?)',
      [userId, role, message, tokensUsed]
    );
  } catch (error) {
    console.error('Save conversation error:', error);
  }
}

/**
 * Function Call ハンドラー
 */
async function handleFunctionCall(userId: string, functionName: string, args: any) {
  console.log(`Function Call: ${functionName}`, args);

  switch (functionName) {
    case 'get_user_stats':
      return await getUserStats(userId, args.period || 'all_time');

    case 'get_site_stats':
      return await getSiteStats(userId, args.limit || 5);

    case 'get_best_profit_events':
      return await getBestProfitEvents(userId, args.limit || 5);

    case 'get_recent_applications':
      return await getRecentApplications(userId, args.limit || 5);

    default:
      return { error: 'Unknown function' };
  }
}

/**
 * ユーザー統計を取得
 */
async function getUserStats(userId: string, period: string) {
  try {
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as totalApplications,
        SUM(CASE WHEN result_status = 'won' THEN 1 ELSE 0 END) as wonEvents,
        SUM(CASE WHEN result_status = 'lost' THEN 1 ELSE 0 END) as lostEvents,
        ROUND(SUM(CASE WHEN result_status = 'won' THEN 1 ELSE 0 END) * 100.0 /
          NULLIF(SUM(CASE WHEN result_status IN ('won', 'lost') THEN 1 ELSE 0 END), 0), 1) as eventWinRate
       FROM raffle_status
       WHERE user_id = ? AND result_status IN ('won', 'lost')`,
      [userId]
    );

    const stats = (rows as any[])[0];

    return {
      period,
      totalApplications: stats.totalApplications || 0,
      wonEvents: stats.wonEvents || 0,
      lostEvents: stats.lostEvents || 0,
      eventWinRate: (stats.eventWinRate || 0) + '%',
    };
  } catch (error) {
    console.error('Get user stats error:', error);
    return { error: '統計情報の取得に失敗しました' };
  }
}

/**
 * サイト別統計を取得
 */
async function getSiteStats(userId: string, limit: number) {
  try {
    const [rows] = await pool.query(
      `SELECT
        ce.site,
        COUNT(*) as applications,
        SUM(CASE WHEN rs.result_status = 'won' THEN 1 ELSE 0 END) as won,
        ROUND(SUM(CASE WHEN rs.result_status = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate
       FROM raffle_status rs
       JOIN calendar_events ce ON rs.raffle_id = ce.id
       WHERE rs.user_id = ? AND rs.result_status IN ('won', 'lost')
       GROUP BY ce.site
       ORDER BY win_rate DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  } catch (error) {
    console.error('Get site stats error:', error);
    return { error: 'サイト別統計の取得に失敗しました' };
  }
}

/**
 * 利益が高いイベントを取得
 */
async function getBestProfitEvents(userId: string, limit: number) {
  try {
    const [rows] = await pool.query(
      `SELECT
        ce.title,
        ce.site,
        rs.profit
       FROM raffle_status rs
       JOIN calendar_events ce ON rs.raffle_id = ce.id
       WHERE rs.user_id = ? AND rs.profit IS NOT NULL AND rs.profit > 0
       ORDER BY rs.profit DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  } catch (error) {
    console.error('Get best profit events error:', error);
    return { error: '利益ランキングの取得に失敗しました' };
  }
}

/**
 * 最近の応募を取得
 */
async function getRecentApplications(userId: string, limit: number) {
  try {
    const [rows] = await pool.query(
      `SELECT
        ce.title,
        ce.site,
        rs.applied_at,
        rs.result_status
       FROM raffle_status rs
       JOIN calendar_events ce ON rs.raffle_id = ce.id
       WHERE rs.user_id = ?
       ORDER BY rs.applied_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    return rows;
  } catch (error) {
    console.error('Get recent applications error:', error);
    return { error: '最近の応募の取得に失敗しました' };
  }
}

/**
 * POST /api/ai/chat
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'メッセージを入力してください' }, { status: 400 });
    }

    // トークン制限チェック
    const { allowed, remaining } = await checkTokenLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: '本日のトークン上限に達しました。明日再度お試しください。', remaining: 0 },
        { status: 429 }
      );
    }

    // 会話履歴を取得
    const history = await getConversationHistory(userId, 50);

    // アプリ関連の質問かチェックし、必要ならガイドを読み込む
    let enhancedMessage = message;
    if (isAppRelatedQuestion(message)) {
      const appGuide = await loadAppGuide();
      if (appGuide) {
        enhancedMessage = `# アプリガイド（参考情報）\n\n${appGuide}\n\n---\n\n# ユーザーの質問\n\n${message}`;
        console.log('App-related question detected, loading app guide');
      }
    }

    // ユーザーメッセージを追加
    const messages: ChatMessage[] = [...history, { role: 'user', content: enhancedMessage }];

    // AIとチャット
    const aiResponse = await chatWithGemini({
      messages,
      userId,
      onFunctionCall: (functionName, args) => handleFunctionCall(userId, functionName, args),
    });

    // 会話を保存
    await saveConversation(userId, 'user', message, 0);
    await saveConversation(userId, 'assistant', aiResponse.content, aiResponse.tokensUsed);

    // トークン使用量を記録
    await recordTokenUsage(userId, aiResponse.tokensUsed);

    // 残りトークン数を再計算
    const updatedLimit = await checkTokenLimit(userId);

    return NextResponse.json({
      message: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed,
      remaining: updatedLimit.remaining,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: error.message || 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/chat - 会話履歴と使用状況を取得
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const userId = session.user.id;

    // 会話履歴を取得
    const history = await getConversationHistory(userId, 50);

    // トークン使用状況を取得
    const { remaining } = await checkTokenLimit(userId);

    return NextResponse.json({
      history,
      remaining,
      dailyLimit: 50000,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
