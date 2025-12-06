"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    default_retail_price: "",
    avg_resale_price: "",
    img_url: "",
    popular: false,
  });
  const [imageMode, setImageMode] = useState<"url" | "upload" | "library">("url");
  const [storageImages, setStorageImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchStorageImages();
  }, []);

  const fetchStorageImages = async () => {
    setLoadingImages(true);
    try {
      const res = await fetch("/api/upload/image");
      if (res.ok) {
        const data = await res.json();
        setStorageImages(data.images || []);
      }
    } catch (error) {
      console.error("Failed to fetch storage images:", error);
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
        setFormData({ ...formData, img_url: data.url });
        alert("画像をアップロードしました");
        fetchStorageImages();
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
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          default_retail_price: formData.default_retail_price ? parseFloat(formData.default_retail_price) : null,
          avg_resale_price: formData.avg_resale_price ? parseFloat(formData.avg_resale_price) : null,
        }),
      });

      if (res.ok) {
        alert("テンプレートを作成しました！");
        router.push("/admin/templates");
      } else {
        const error = await res.json();
        alert(`エラー: ${error.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← 戻る
            </button>
            <h1 className="text-3xl font-bold font-display text-[var(--color-text-primary)]">
              テンプレート追加
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div>
              <label className="block text-sm font-medium mb-2">
                商品名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                placeholder="例: Air Jordan 1 High 'Chicago'"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  ブランド
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                  placeholder="例: Nike"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  カテゴリ
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                  placeholder="例: スニーカー"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  定価（円）
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_retail_price}
                  onChange={(e) => setFormData({ ...formData, default_retail_price: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                  placeholder="例: 19800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  平均転売価格（円）
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.avg_resale_price}
                  onChange={(e) => setFormData({ ...formData, avg_resale_price: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                  placeholder="例: 45000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                商品画像
              </label>

              {/* モード切替タブ */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setImageMode("url")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    imageMode === "url"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  URL入力
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("upload")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    imageMode === "upload"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  アップロード
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("library")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    imageMode === "library"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                  }`}
                >
                  ライブラリ
                </button>
              </div>

              {/* URL入力モード */}
              {imageMode === "url" && (
                <input
                  type="url"
                  value={formData.img_url}
                  onChange={(e) => setFormData({ ...formData, img_url: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                />
              )}

              {/* アップロードモード */}
              {imageMode === "upload" && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer disabled:opacity-50"
                />
              )}

              {/* ライブラリモード */}
              {imageMode === "library" && (
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
                          onClick={() => setFormData({ ...formData, img_url: image.url })}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            formData.img_url === image.url
                              ? "border-blue-500 ring-2 ring-blue-500/50"
                              : "border-gray-600 hover:border-gray-500"
                          }`}
                        >
                          <img
                            src={image.url}
                            alt={image.fileName}
                            className="w-full h-full object-cover"
                          />
                          {formData.img_url === image.url && (
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
              {formData.img_url && (
                <div className="mt-4">
                  <img
                    src={formData.img_url}
                    alt="プレビュー"
                    className="w-full h-48 object-contain rounded-lg bg-gray-900/50"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.popular}
                  onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600"
                />
                <span>⭐ 人気商品としてマーク</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "作成中..." : "テンプレートを作成"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl font-semibold transition-all"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}