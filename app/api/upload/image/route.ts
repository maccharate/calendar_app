import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
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

// GET: 画像一覧取得（全ユーザーがアクセス可能）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // ログインしていれば誰でも画像一覧を取得可能
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // events/フォルダ内の画像を取得
    const [files] = await bucket.getFiles({
      prefix: "events/",
    });

    const images = files
      .filter(file => {
        const fileName = file.name.toLowerCase();
        return (
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".png") ||
          fileName.endsWith(".webp") ||
          fileName.endsWith(".gif")
        );
      })
      .map(file => ({
        fileName: file.name,
        url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
        created: file.metadata.timeCreated || new Date().toISOString(),
        size: file.metadata.size || "0",
      }))
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()); // 新しい順

    return NextResponse.json({
      success: true,
      images,
      total: images.length,
    });
  } catch (error: any) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ 
      error: "Failed to fetch images",
      details: error.message 
    }, { status: 500 });
  }
}

// POST: 画像アップロード
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 管理者チェック
    if (!session || !session.user || !ADMIN_USER_IDS.includes(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "ファイルサイズは5MB以下にしてください" 
      }, { status: 400 });
    }

    // ファイルタイプチェック
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "JPG、PNG、WebP、GIF形式のみアップロード可能です" 
      }, { status: 400 });
    }

    // ファイル名生成（UUID + 拡張子）
    const fileExtension = file.name.split(".").pop();
    const fileName = `events/${uuidv4()}.${fileExtension}`;

    // バッファに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // GCSにアップロード
    const blob = bucket.file(fileName);
    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // 公開URLを生成
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    });
  } catch (error: any) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ 
      error: "Failed to upload image",
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE: 画像削除
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !ADMIN_USER_IDS.includes(session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: "No fileName provided" }, { status: 400 });
    }

    // GCSから削除
    await bucket.file(fileName).delete();

    return NextResponse.json({
      success: true,
      message: "画像を削除しました",
    });
  } catch (error: any) {
    console.error("Error deleting image:", error);
    return NextResponse.json({ 
      error: "Failed to delete image",
      details: error.message 
    }, { status: 500 });
  }
}