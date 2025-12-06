"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function MyEventsNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    starttime: "",
    endtime: "",
    link: "",
    img: "",
    event_type: "raffle",
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload' | 'storage'>('url');
  const [storageImages, setStorageImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch("/api/upload/image");
      if (res.ok) {
        const data = await res.json();
        setStorageImages(data.images || []);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
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

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, img: data.url });
        alert("画像をアップロードしました");
        fetchImages();
      } else {
        alert("アップロードに失敗しました");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("アップロードエラーが発生しました");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("✅ マイイベントを作成しました");
        router.push("/");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.details || error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

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

          <h1 className="text-3xl md:text-4xl font-bold mb-2 font-semibold text-[var(--color-text-primary)]">
            マイイベント作成
          </h1>
          <p className="text-gray-400 text-sm mb-8">自分だけに表示される個人イベントを作成できます</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* イベントタイプ */}
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
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-bold">抽選</div>
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
                  <div className="text-2xl mb-2">⚡</div>
                  <div className="font-bold">先着</div>
                </button>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">基本情報</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">イベント名 *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例: Nike Air Jordan 1 購入予定"
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">開始日時 *</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.starttime}
                      onChange={(e) => setFormData({ ...formData, starttime: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">終了日時 *</label>
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
                  <label className="block text-sm font-medium mb-2">URL（任意）</label>
                  <input
                    type="url"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">画像（任意）</label>

                  {/* 画像入力モード選択 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        imageMode === 'url'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      URL入力
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        imageMode === 'upload'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      アップロード
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('storage')}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        imageMode === 'storage'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      ライブラリ
                    </button>
                  </div>

                  {/* URL入力モード */}
                  {imageMode === 'url' && (
                    <input
                      type="url"
                      value={formData.img}
                      onChange={(e) => setFormData({ ...formData, img: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500/50 focus:outline-none"
                    />
                  )}

                  {/* アップロードモード */}
                  {imageMode === 'upload' && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer disabled:opacity-50"
                      />
                      {uploadingImage && (
                        <p className="text-xs text-blue-400 mt-2">アップロード中...</p>
                      )}
                    </div>
                  )}

                  {/* ストレージモード */}
                  {imageMode === 'storage' && (
                    <div>
                      {loadingImages ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-400">読み込み中...</p>
                        </div>
                      ) : storageImages.length === 0 ? (
                        <div className="text-center py-4 bg-gray-700/50 rounded-lg">
                          <p className="text-xs text-gray-400">画像がありません</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2 bg-gray-700/30 rounded-lg">
                          {storageImages.map((image, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setFormData({ ...formData, img: image.url })}
                              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                formData.img === image.url
                                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                                  : 'border-gray-600 hover:border-gray-500'
                              }`}
                            >
                              <img
                                src={image.url}
                                alt={image.fileName}
                                className="w-full h-full object-cover"
                              />
                              {formData.img === image.url && (
                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-xl">✓</span>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* プレビュー */}
                  {formData.img && (
                    <div className="mt-4">
                      <img
                        src={formData.img}
                        alt="プレビュー"
                        className="w-full h-48 object-contain rounded-lg bg-gray-900/50"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-blue-400 mb-2">マイイベントについて</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• このイベントはあなただけに表示されます</li>
                <li>• 他のユーザーには見えません</li>
                <li>• 通知は送信されません</li>
                <li>• いつでも編集・削除できます</li>
              </ul>
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
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {loading ? "作成中..." : "作成する"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}