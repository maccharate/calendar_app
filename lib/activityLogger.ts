import { pool } from "./db";

export type ActivityAction =
  | "login"
  | "logout"
  | "apply_raffle"
  | "update_result"
  | "add_manual"
  | "edit_details"
  | "delete_record"
  | "create_event"
  | "update_event"
  | "delete_event"
  | "create_template"
  | "update_template"
  | "delete_template"
  | "update_settings"
  | "create_giveaway"
  | "update_giveaway"
  | "delete_giveaway"
  | "enter_giveaway"
  | "cancel_entry"
  | "draw_lottery";

export interface LogActivityOptions {
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  request?: Request;
}

/**
 * ユーザーアクティビティをログに記録
 */
export async function logActivity(
  userId: string,
  username: string | null | undefined,
  action: ActivityAction,
  options?: LogActivityOptions
): Promise<void> {
  try {
    const ipAddress = options?.request?.headers.get("x-forwarded-for") ||
                      options?.request?.headers.get("x-real-ip") ||
                      null;
    const userAgent = options?.request?.headers.get("user-agent") || null;

    await pool.execute(
      `INSERT INTO activity_logs
       (user_id, username, action, target_type, target_id, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username || null,
        action,
        options?.targetType || null,
        options?.targetId || null,
        options?.metadata ? JSON.stringify(options.metadata) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    // ログ記録の失敗はアプリケーションの動作を妨げない
    console.error("Failed to log activity:", error);
  }
}

/**
 * アクティビティログを取得
 */
export async function getActivityLogs(options?: {
  userId?: string;
  action?: ActivityAction;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.userId) {
    conditions.push("user_id = ?");
    params.push(options.userId);
  }

  if (options?.action) {
    conditions.push("action = ?");
    params.push(options.action);
  }

  if (options?.startDate) {
    conditions.push("created_at >= ?");
    params.push(options.startDate);
  }

  if (options?.endDate) {
    conditions.push("created_at <= ?");
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  const [rows] = await pool.query(
    `SELECT * FROM activity_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return rows;
}

/**
 * アクティビティログの統計を取得
 */
export async function getActivityStats(options?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (options?.userId) {
    conditions.push("user_id = ?");
    params.push(options.userId);
  }

  if (options?.startDate) {
    conditions.push("created_at >= ?");
    params.push(options.startDate);
  }

  if (options?.endDate) {
    conditions.push("created_at <= ?");
    params.push(options.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT
       action,
       COUNT(*) as count
     FROM activity_logs
     ${whereClause}
     GROUP BY action
     ORDER BY count DESC`,
    params
  );

  return rows;
}

/**
 * 古いアクティビティログを削除（プライバシー保護）
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
  await pool.execute(
    `DELETE FROM activity_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [daysToKeep]
  );
}
