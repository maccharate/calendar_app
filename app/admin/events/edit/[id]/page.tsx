"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import { formatDateForInput } from "@/lib/dateUtils";

interface ImageData {
  fileName: string;
  url: string;
  created: string;
  size: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "upload" | "gallery">("gallery");
  const [formData, setFormData] = useState({
    site: "",
    title: "",
    starttime: "",
    endtime: "",
    link: "",
    img: "",
    event_type: "raffle",
    min_points_required: 0,
    points_requirement_type: "none",
    requirement_message: "",
  });

  // 画像ギャラリー
  const [images, setImages] = useState<ImageData[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (uploadMode === "gallery") {
      fetchImages();
    }
  }, [uploadMode]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          site: data.site || "",
          title: data.title || "",
          starttime: formatDateForInput(data.starttime) || "",
          endtime: formatDateForInput(data.endtime) || "",
          link: data.link || "",
          img: data.img || "",
          event_type: data.event_type || "raffle",
          min_points_required: data.min_points_required || 0,
          points_requirement_type: data.points_requirement_type || "none",
          requirement_message: data.requirement_message || "",
        });
      } else {
        alert("イベント情報の取得に失敗しました");
        router.back();
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      alert("エラーが発生しました");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch("/api/upload/image");
      if (res.ok) {
        const data = await res.json();
        setImages(data.images);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, img: data.url });
        
        // ギャラリーを更新
        fetchImages();
        
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = "✓ 画像をアップロードしました";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        const error = await res.json();
        alert(`${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectImage = (url: string) => {
    setFormData({ ...formData, img: url });
  };

  const filteredImages = images.filter(img =>
    img.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("✅ イベントを更新しました");
        router.push("/admin/events");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">読み込み中...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← 戻る
            </button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8 font-semibold text-[var(--color-text-primary)]">
            イベント編集
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* イベントタイプ選択 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">イベントタイプ</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: "raffle" })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.event_type === "raffle"
                      ? "border-blue-500 bg-blue-500/20"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="font-bold">抽選</div>
                  <div className="text-xs text-gray-400 mt-1">締切時間あり</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, event_type: "advance" })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    formData.event_type === "advance"
                      ? "border-green-500 bg-green-500/20"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="font-bold">先着販売</div>
                  <div className="text-xs text-gray-400 mt-1">開始時刻に販売</div>
                </button>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">サイト名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.site}
                    onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">商品名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      開始日時 * (日本時間)
                      <span className="text-xs text-gray-400 ml-2">
                        {formData.event_type === "raffle" ? "(抽選開始)" : "(販売開始)"}
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.starttime}
                      onChange={(e) => setFormData({ ...formData, starttime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      終了日時 * (日本時間)
                      <span className="text-xs text-gray-400 ml-2">
                        {formData.event_type === "raffle" ? "(抽選締切)" : "(販売終了予定)"}
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endtime}
                      onChange={(e) => setFormData({ ...formData, endtime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">URL</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                {/* 画像選択 */}
                <div>
                  <label className="block text-sm font-medium mb-2">画像</label>
                  
                  {/* タブ切り替え */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setUploadMode("gallery")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        uploadMode === "gallery"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      ギャラリーから選択
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("upload")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        uploadMode === "upload"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      新規アップロード
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("url")}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        uploadMode === "url"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      URLを入力
                    </button>
                  </div>

                  {/* ギャラリー */}
                  {uploadMode === "gallery" && (
                    <div>
                      {/* 検索 */}
                      <input
                        type="text"
                        placeholder="ファイル名で検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none mb-4"
                      />

                      {loadingImages ? (
                        <p className="text-center text-gray-400 py-8">読み込み中...</p>
                      ) : filteredImages.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">
                          {searchQuery ? "画像が見つかりませんでした" : "アップロード済みの画像がありません"}
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2">
                          {filteredImages.map((image) => (
                            <div
                              key={image.fileName}
                              onClick={() => handleSelectImage(image.url)}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                formData.img === image.url
                                  ? "border-blue-500 ring-2 ring-blue-500/50"
                                  : "border-gray-700 hover:border-gray-500"
                              }`}
                            >
                              <div className="aspect-square">
                                <img
                                  src={image.url}
                                  alt={image.fileName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {formData.img === image.url && (
                                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                  ✓
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {filteredImages.length}件の画像
                      </p>
                    </div>
                  )}

                  {/* 新規アップロード */}
                  {uploadMode === "upload" && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer"
                      />
                      {uploading && (
                        <p className="text-sm text-blue-400 mt-2">アップロード中...</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        JPG、PNG、WebP、GIF形式（5MB以下）
                      </p>
                    </div>
                  )}

                  {/* URL入力 */}
                  {uploadMode === "url" && (
                    <input
                      type="url"
                      value={formData.img}
                      onChange={(e) => setFormData({ ...formData, img: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  )}

                  {/* プレビュー */}
                  {formData.img && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-2">選択中:</p>
                      <img
                        src={formData.img}
                        alt="プレビュー"
                        className="w-32 h-32 object-cover rounded-lg bg-gray-900/50"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 応募条件（ポイント） */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-purple-400">応募条件（アクティビティポイント）</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ポイント制限</label>
                  <select
                    value={formData.points_requirement_type}
                    onChange={(e) => setFormData({ ...formData, points_requirement_type: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-purple-500/50 focus:outline-none"
                  >
                    <option value="none">制限なし（全員応募可能）</option>
                    <option value="current_month">今月のポイント</option>
                    <option value="previous_month">前月のポイント</option>
                    <option value="all_time">累計ポイント</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    ポイント: ログイン5pt/日、応募1pt/回
                  </p>
                </div>

                {formData.points_requirement_type !== 'none' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        必要ポイント
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.min_points_required}
                        onChange={(e) => setFormData({ ...formData, min_points_required: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-purple-500/50 focus:outline-none"
                        placeholder="例: 30"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        このポイント以上のユーザーのみ応募可能
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        条件未達時のメッセージ（任意）
                      </label>
                      <input
                        type="text"
                        value={formData.requirement_message}
                        onChange={(e) => setFormData({ ...formData, requirement_message: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-purple-500/50 focus:outline-none"
                        placeholder="例: このイベントは前月30pt以上のアクティブユーザー限定です"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {saving ? "更新中..." : "更新する"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}