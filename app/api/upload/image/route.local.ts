import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// ローカルストレージのパス（Dockerボリュームマウント先）
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "events");
const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// 管理者のDiscord ID
const ADMIN_USER_IDS = ["547775428526473217", "549913811172196362", "501024205916078083"];

// アップロードディレクトリを作成
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// GET: 画像一覧取得（全ユーザーがアクセス可能）
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await ensureUploadDir();

    // ディレクトリ内のファイルを取得
    const files = await readdir(UPLOAD_DIR);

    const images = await Promise.all(
      files
        .filter(file => {
          const fileName = file.toLowerCase();
          return (
            fileName.endsWith(".jpg") ||
            fileName.endsWith(".jpeg") ||
            fileName.endsWith(".png") ||
            fileName.endsWith(".webp") ||
            fileName.endsWith(".gif")
          );
        })
        .map(async (file) => {
          const filePath = path.join(UPLOAD_DIR, file);
          const stats = await stat(filePath);

          return {
            fileName: file,
            url: `${BASE_URL}/uploads/events/${file}`,
            created: stats.birthtime.toISOString(),
            size: stats.size.toString(),
          };
        })
    );

    // 作成日時でソート（新しい順）
    images.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images", details: error.message },
      { status: 500 }
    );
  }
}

// POST: 画像アップロード（管理者のみ）
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    await ensureUploadDir();

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // ファイル拡張子チェック
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, WebP, and GIF are allowed" },
        { status: 400 }
      );
    }

    // ファイル名を生成（UUID + 元の拡張子）
    const ext = path.extname(file.name);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    const url = `${BASE_URL}/uploads/events/${fileName}`;

    return NextResponse.json({
      success: true,
      url,
      fileName,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 画像削除（管理者のみ）
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 管理者チェック
    const isAdmin = ADMIN_USER_IDS.includes(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_DIR, path.basename(fileName));

    // ファイルが存在するか確認
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // ファイルを削除
    await unlink(filePath);

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file", details: error.message },
      { status: 500 }
    );
  }
}
