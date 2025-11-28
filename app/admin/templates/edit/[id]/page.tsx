"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [templateId, setTemplateId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category: "",
    default_retail_price: "",
    avg_resale_price: "",
    img_url: "",
    popular: false,
  });

  useEffect(() => {
    params.then((resolvedParams) => {
      setTemplateId(resolvedParams.id);
      fetchTemplate(resolvedParams.id);
    });
  }, []);

  const fetchTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`);
      if (res.ok) {
        const template = await res.json();
        setFormData({
          name: template.name || "",
          brand: template.brand || "",
          category: template.category || "",
          default_retail_price: template.default_retail_price || "",
          avg_resale_price: template.avg_resale_price || "",
          img_url: template.img_url || "",
          popular: !!template.popular,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          default_retail_price: formData.default_retail_price ? parseFloat(formData.default_retail_price) : null,
          avg_resale_price: formData.avg_resale_price ? parseFloat(formData.avg_resale_price) : null,
        }),
      });

      if (res.ok) {
        alert("テンプレートを更新しました！");
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

  if (fetching) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              テンプレート編集
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
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                画像URL
              </label>
              <input
                type="url"
                value={formData.img_url}
                onChange={(e) => setFormData({ ...formData, img_url: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600/50 focus:border-blue-500 focus:outline-none"
              />
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
                {loading ? "更新中..." : "テンプレートを更新"}
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