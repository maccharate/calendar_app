import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { pool } from "../../../../../lib/db";
import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

// GCS設定
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCS_KEY_FILE_PATH,
});

const bucketName = process.env.GCS_BUCKET_NAME || "chimpan-community-images";
const bucket = storage.bucket(bucketName);

// 管理者のDiscord ID
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083"];

// 一括更新
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const eventIdsStr = formData.get("eventIds") as string;
    const imageFile = formData.get("image") as File | null;
    const imageUrlFromForm = formData.get("imageUrl") as string | null;
    const title = formData.get("title") as string | null;

    if (!eventIdsStr) {
      return NextResponse.json({ error: "No event IDs provided" }, { status: 400 });
    }

    const eventIds: number[] = JSON.parse(eventIdsStr);

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json({ error: "Invalid event IDs" }, { status: 400 });
    }

    if (!imageFile && !imageUrlFromForm && !title) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    let imageUrl: string | null = null;

    // 既存の画像URLが指定されている場合
    if (imageUrlFromForm) {
      imageUrl = imageUrlFromForm;
    }
    // 画像ファイルがある場合はアップロード
    else if (imageFile) {
      // ファイルサイズチェック（5MB以下）
      const maxSize = 5 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        return NextResponse.json({
          error: "ファイルサイズは5MB以下にしてください"
        }, { status: 400 });
      }

      // ファイルタイプチェック
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json({
          error: "JPG、PNG、WebP、GIF形式のみアップロード可能です"
        }, { status: 400 });
      }

      // ファイル名生成
      const fileExtension = imageFile.name.split(".").pop();
      const fileName = `events/${uuidv4()}.${fileExtension}`;

      // バッファに変換
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // GCSにアップロード
      const blob = bucket.file(fileName);
      await blob.save(buffer, {
        metadata: {
          contentType: imageFile.type,
        },
      });

      // 公開URLを生成
      imageUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
    }

    // 更新クエリを構築
    const updates: string[] = [];
    const params: any[] = [];

    if (imageUrl) {
      updates.push("img = ?");
      params.push(imageUrl);
    }

    if (title) {
      updates.push("title = ?");
      params.push(title);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");

    // プレースホルダーを生成
    const placeholders = eventIds.map(() => "?").join(",");
    const updateClause = updates.join(", ");

    // calendar_events を更新
    await pool.execute(
      `UPDATE calendar_events
       SET ${updateClause}
       WHERE id IN (${placeholders})`,
      [...params, ...eventIds]
    );

    // reminder も更新
    // reminder テーブルでは title は sneaker カラム
    const reminderUpdates: string[] = [];
    const reminderParams: any[] = [];

    if (imageUrl) {
      reminderUpdates.push("img = ?");
      reminderParams.push(imageUrl);
    }

    if (title) {
      reminderUpdates.push("sneaker = ?");
      reminderParams.push(title);
    }

    if (reminderUpdates.length > 0) {
      const reminderUpdateClause = reminderUpdates.join(", ");
      await pool.execute(
        `UPDATE reminder
         SET ${reminderUpdateClause}
         WHERE id IN (${placeholders})`,
        [...reminderParams, ...eventIds]
      );
    }

    return NextResponse.json({
      success: true,
      updated: eventIds.length,
      imageUrl: imageUrl || undefined,
    });
  } catch (error: any) {
    console.error("Error bulk updating events:", error);
    return NextResponse.json({
      error: "Failed to bulk update events",
      details: error.message
    }, { status: 500 });
  }
}
