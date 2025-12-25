import { pool } from "./db";

/**
 * ユーザーがプレゼント企画の応募条件を満たしているかチェック
 */
export async function checkPointsEligibility(
  userId: string,
  minPointsRequired: number,
  requirementType: string
): Promise<{ eligible: boolean; userPoints: number; message?: string }> {
  console.log('[checkPointsEligibility] userId:', userId, 'minPointsRequired:', minPointsRequired, 'requirementType:', requirementType);

  // 条件なしの場合は常に適格
  if (requirementType === 'none') {
    console.log('[checkPointsEligibility] No requirement - eligible');
    return { eligible: true, userPoints: 0 };
  }

  // ポイント要件が0以下の場合も条件なし
  if (minPointsRequired <= 0) {
    console.log('[checkPointsEligibility] Points requirement <= 0 - eligible');
    return { eligible: true, userPoints: 0 };
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 前月を計算
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let query = '';
  let params: any[] = [];

  switch (requirementType) {
    case 'current_month':
      query = `
        SELECT COALESCE(SUM(total_points), 0) as points
        FROM user_monthly_activity
        WHERE user_id = ? AND \`year_month\` = ?
      `;
      params = [userId, currentMonth];
      break;

    case 'previous_month':
      query = `
        SELECT COALESCE(SUM(total_points), 0) as points
        FROM user_monthly_activity
        WHERE user_id = ? AND \`year_month\` = ?
      `;
      params = [userId, previousMonth];
      break;

    case 'all_time':
      query = `
        SELECT COALESCE(SUM(total_points), 0) as points
        FROM user_monthly_activity
        WHERE user_id = ?
      `;
      params = [userId];
      break;

    default:
      return { eligible: true, userPoints: 0 };
  }

  try {
    const [rows] = await pool.query(query, params);

    console.log('[checkPointsEligibility] Query result rows:', rows);

    // データがない場合も考慮
    if (!rows || (rows as any[]).length === 0) {
      console.log('[checkPointsEligibility] No data found - userPoints: 0');
      const message = `応募には${requirementType === 'current_month' ? '今月' : requirementType === 'previous_month' ? '前月' : '累計'}${minPointsRequired}pt以上必要です（現在: 0pt、あと${minPointsRequired}pt必要）`;
      return { eligible: false, userPoints: 0, message };
    }

    const userPoints = parseInt((rows as any[])[0].points) || 0;

    const eligible = userPoints >= minPointsRequired;
    const shortfall = eligible ? 0 : minPointsRequired - userPoints;

    console.log('[checkPointsEligibility] userPoints:', userPoints, 'required:', minPointsRequired, 'eligible:', eligible);

    let message = '';
    if (!eligible) {
      const typeText =
        requirementType === 'current_month' ? '今月' :
        requirementType === 'previous_month' ? '前月' : '累計';
      message = `応募には${typeText}${minPointsRequired}pt以上必要です（現在: ${userPoints}pt、あと${shortfall}pt必要）`;
    }

    return { eligible, userPoints, message };
  } catch (error) {
    console.error('[checkPointsEligibility] Error details:', error);
    console.error('[checkPointsEligibility] Query was:', query);
    console.error('[checkPointsEligibility] Params were:', params);

    // テーブルが存在しない場合のエラーチェック
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("doesn't exist") || errorMessage.includes("Table") || errorMessage.includes("table")) {
      console.error('[checkPointsEligibility] Table does not exist - treating as 0 points');
      const message = `応募には${requirementType === 'current_month' ? '今月' : requirementType === 'previous_month' ? '前月' : '累計'}${minPointsRequired}pt以上必要です（現在: 0pt、あと${minPointsRequired}pt必要）`;
      return { eligible: false, userPoints: 0, message };
    }

    // その他のエラーの場合はエラーメッセージを返す
    return {
      eligible: false,
      userPoints: 0,
      message: `ポイント情報の取得に失敗しました: ${errorMessage}`
    };
  }
}

/**
 * ユーザーの現在のポイントを取得（キャッシュなし）
 */
export async function getUserPoints(
  userId: string,
  type: 'current_month' | 'previous_month' | 'all_time' = 'current_month'
): Promise<number> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let query = '';
  let params: any[] = [];

  switch (type) {
    case 'current_month':
      query = `SELECT COALESCE(SUM(total_points), 0) as points
               FROM user_monthly_activity
               WHERE user_id = ? AND \`year_month\` = ?`;
      params = [userId, currentMonth];
      break;

    case 'previous_month':
      query = `SELECT COALESCE(SUM(total_points), 0) as points
               FROM user_monthly_activity
               WHERE user_id = ? AND \`year_month\` = ?`;
      params = [userId, previousMonth];
      break;

    case 'all_time':
      query = `SELECT COALESCE(SUM(total_points), 0) as points
               FROM user_monthly_activity
               WHERE user_id = ?`;
      params = [userId];
      break;
  }

  try {
    const [rows] = await pool.query(query, params);
    return parseInt((rows as any[])[0].points);
  } catch (error) {
    console.error('Error getting user points:', error);
    return 0;
  }
}
