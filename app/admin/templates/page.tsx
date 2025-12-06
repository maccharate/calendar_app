"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Template {
  id: number;
  name: string;
  brand: string;
  category: string;
  default_retail_price: number;
  avg_resale_price: number;
  img_url: string;
  popular: boolean;
  created_at: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このテンプレートを削除しますか？")) return;

    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        alert("テンプレートを削除しました");
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("通信エラーが発生しました");
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
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
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => router.push("/calendar")}
              className="text-gray-400 hover:text-white mb-4"
            >
              ← カレンダーに戻る
            </button>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h1 className="text-3xl font-bold font-semibold text-[var(--color-text-primary)]">
                商品テンプレート管理
              </h1>
              <button
                onClick={() => router.push("/admin/templates/new")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all"
              >
                ➕ テンプレート追加
              </button>
            </div>
          </div>

          {/* 検索 */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="🔍 テンプレート名・ブランドで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 rounded-lg border border-gray-700/50 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* テンプレート一覧 */}
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all"
                >
                  {template.img_url && (
                    <img
                      src={template.img_url}
                      alt={template.name}
                      className="w-full h-48 object-contain rounded-lg bg-gray-900/50 mb-4"
                    />
                  )}
                  
                  <div className="mb-3">
                    <h3 className="font-bold text-lg mb-1 line-clamp-2">{template.name}</h3>
                    {template.brand && (
                      <p className="text-sm text-gray-400">{template.brand}</p>
                    )}
                    {template.category && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
                        {template.category}
                      </span>
                    )}
                    {template.popular && (
                      <span className="inline-block mt-2 ml-2 px-2 py-1 text-xs bg-yellow-500/20 text-yellow-300 rounded">
                        ⭐ 人気
                      </span>
                    )}
                  </div>

                  {(template.default_retail_price || template.avg_resale_price) && (
                    <div className="mb-4 text-sm space-y-1">
                      {template.default_retail_price && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">定価:</span>
                          <span className="font-medium">¥{template.default_retail_price.toLocaleString()}</span>
                        </div>
                      )}
                      {template.avg_resale_price && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">平均転売価格:</span>
                          <span className="font-medium text-green-400">¥{template.avg_resale_price.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/templates/edit/${template.id}`)}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm transition-all"
                    >
                      ✏️ 編集
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-sm transition-all"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-12 border border-gray-700/50 text-center">
              <h2 className="text-2xl font-bold mb-2">テンプレートがありません</h2>
              <p className="text-gray-400 mb-6">新しいテンプレートを追加してください</p>
              <button
                onClick={() => router.push("/admin/templates/new")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition-all"
              >
                ➕ テンプレート追加
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}