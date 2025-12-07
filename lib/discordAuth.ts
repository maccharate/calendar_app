/**
 * Discord認証とメンバーシップ検証
 */

interface DiscordMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
  };
  roles: string[];
  joined_at: string;
}

/**
 * Discordサーバーのメンバーシップを確認
 */
export async function checkDiscordMembership(
  userId: string,
  accessToken: string
): Promise<{ isMember: boolean; hasRequiredRole: boolean; roles: string[] }> {
  const GUILD_ID = process.env.DISCORD_GUILD_ID; // サロンのサーバーID
  const REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID; // メンバーロールID

  if (!GUILD_ID) {
    throw new Error('DISCORD_GUILD_ID not configured');
  }

  try {
    // Discord APIでサーバーメンバー情報を取得
    const response = await fetch(
      `https://discord.com/api/v10/users/@me/guilds/${GUILD_ID}/member`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 404) {
      // サーバーメンバーではない
      return { isMember: false, hasRequiredRole: false, roles: [] };
    }

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const member: DiscordMember = await response.json();

    // 必須ロールを持っているか確認
    const hasRequiredRole = REQUIRED_ROLE_ID
      ? member.roles.includes(REQUIRED_ROLE_ID)
      : true; // ロールIDが設定されていない場合はサーバーメンバーであればOK

    return {
      isMember: true,
      hasRequiredRole,
      roles: member.roles,
    };
  } catch (error) {
    console.error('Error checking Discord membership:', error);
    throw error;
  }
}

/**
 * Bot tokenを使ってメンバー情報を取得（より安定）
 */
export async function checkDiscordMembershipWithBot(
  userId: string
): Promise<{ isMember: boolean; hasRequiredRole: boolean; roles: string[] }> {
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const REQUIRED_ROLE_ID = process.env.DISCORD_REQUIRED_ROLE_ID;

  if (!GUILD_ID || !BOT_TOKEN) {
    throw new Error('Discord configuration missing');
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    if (response.status === 404) {
      return { isMember: false, hasRequiredRole: false, roles: [] };
    }

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const member: DiscordMember = await response.json();

    const hasRequiredRole = REQUIRED_ROLE_ID
      ? member.roles.includes(REQUIRED_ROLE_ID)
      : true;

    return {
      isMember: true,
      hasRequiredRole,
      roles: member.roles,
    };
  } catch (error) {
    console.error('Error checking Discord membership:', error);
    throw error;
  }
}

/**
 * Webhook通知を送信
 */
export async function sendDiscordWebhook(
  message: string,
  embeds?: any[]
): Promise<void> {
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    console.warn('Discord webhook not configured');
    return;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message,
        embeds,
      }),
    });
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
  }
}
