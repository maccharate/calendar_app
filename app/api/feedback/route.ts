import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// レート制限用のメモリストア（本番環境ではRedisなどを使用推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// レート制限チェック（1分間に3回まで）
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const limit = rateLimitStore.get(identifier);

  if (!limit || now > limit.resetTime) {
    // 新しいウィンドウを開始
    rateLimitStore.set(identifier, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (limit.count >= 3) {
    return false; // レート制限超過
  }

  // カウントを増やす
  limit.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // レート制限チェック（IPアドレスまたはユーザーIDで識別）
    const identifier = session?.user?.id || req.ip || "anonymous";
    if (!checkRateLimit(identifier)) {
      return NextResponse.json(
        { error: "送信制限に達しました。1分後に再度お試しください。" },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { category, message } = body;

    // バリデーション
    if (!category || !message) {
      return NextResponse.json(
        { error: "カテゴリとメッセージは必須です" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "メッセージは2000文字以内で入力してください" },
        { status: 400 }
      );
    }

    // Discord Webhook URL
    const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("Discord Webhook URL is not configured");
      return NextResponse.json(
        { error: "サーバー設定エラー" },
        { status: 500 }
      );
    }

    // 送信者情報（匿名の場合は表示しない）
    const sender = session?.user?.name || "匿名";

    // カテゴリの絵文字マッピング
    const categoryEmojis: Record<string, string> = {
      "feature": "💡",
      "bug": "🐛",
      "improvement": "✨",
      "other": "📝",
    };

    const emoji = categoryEmojis[category] || "📝";

    // Discord埋め込みメッセージを作成
    const embed = {
      title: `${emoji} 新しいフィードバック`,
      color: category === "bug" ? 0xff0000 : category === "feature" ? 0x00ff00 : 0x0099ff,
      fields: [
        {
          name: "カテゴリ",
          value: category === "feature" ? "機能リクエスト" :
                 category === "bug" ? "バグ報告" :
                 category === "improvement" ? "改善提案" : "その他",
          inline: true,
        },
        {
          name: "送信者",
          value: sender,
          inline: true,
        },
        {
          name: "メッセージ",
          value: message.slice(0, 1024), // Discordの制限
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };

    // Discord Webhookに送信
    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      console.error("Discord webhook failed:", await discordResponse.text());
      return NextResponse.json(
        { error: "送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback submission error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
