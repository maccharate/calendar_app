import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { chatWithGemini, ChatMessage } from '@/lib/vertexai';
import { pool } from '@/lib/db';

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
      return { allowed: true, remaining: 10000 };
    }

    const { tokens_used, daily_limit } = usage[0];
    const remaining = daily_limit - tokens_used;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  } catch (error) {
    console.error('Token limit check error:', error);
    return { allowed: true, remaining: 10000 }; // エラー時は許可
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
       VALUES (?, ?, ?, 10000)
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
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');

    const data = await res.json();
    const stats = data.userStats;

    return {
      period,
      totalApplications: stats.totalApplications,
      wonEvents: stats.wonEvents,
      lostEvents: stats.lostEvents,
      eventWinRate: stats.eventWinRate.toFixed(1) + '%',
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
        site,
        COUNT(*) as applications,
        SUM(CASE WHEN result_status = 'won' THEN 1 ELSE 0 END) as won,
        ROUND(SUM(CASE WHEN result_status = 'won' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate
       FROM raffle_user_records
       WHERE user_id = ? AND result_status IN ('won', 'lost')
       GROUP BY site
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
        r.title,
        r.site,
        rd.profit
       FROM raffle_user_records r
       JOIN raffle_details rd ON r.record_id = rd.record_id
       WHERE r.user_id = ? AND rd.profit IS NOT NULL AND rd.profit > 0
       ORDER BY rd.profit DESC
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
      `SELECT title, site, applied_at, result_status
       FROM raffle_user_records
       WHERE user_id = ?
       ORDER BY applied_at DESC
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

    // ユーザーメッセージを追加
    const messages: ChatMessage[] = [...history, { role: 'user', content: message }];

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
      dailyLimit: 10000,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
