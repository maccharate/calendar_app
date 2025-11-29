"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { useRouter } from "next/navigation";

interface HistoryEvent {
  record_id: number;
  id: string;
  title: string;
  site: string;
  img: string;
  start: string;
  end: string;
  url: string;
  advance: boolean;
  applied_at: string;
  status: string;
  result_status: string;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_shipping: number | null;
  sale_price: number | null;
  sale_date: string | null;
  platform: string | null;
  fees: number | null;
  shipping_cost: number | null;
  profit: number | null;
  notes: string | null;
  product_template_id: number | null;
  is_individual: boolean;
  application_count?: number; // 応募数（グループ化されている場合）
}

interface HistoryStats {
  total: number;
  applied: number;
  rate: number;
  won: number;
  lost: number;
  pending: number;
}

interface ProductTemplate {
  id: number;
  name: string;
  brand: string;
  category: string;
  default_retail_price: number;
  avg_resale_price: number;
  img_url: string;
}

// プラットフォームごとの手数料率（%）
const PLATFORM_FEE_RATES: Record<string, number> = {
  'Mercari': 10,        // メルカリ 10%
  'SNKRDUNK': 9.5,      // スニダン 9.5%
  'StockX': 12,         // StockX 約12%（為替・配送により変動）
  'YahooAuctions': 10,  // ヤフオク 10%
  'Rakuma': 6.6,        // ラクマ 6.6%
  'Other': 0,           // その他（手動入力）
};

export default function HistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);

  // モーダル状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // フィルター状態
  const [filter, setFilter] = useState<'all' | 'won' | 'lost' | 'pending'>('all');

  const router = useRouter();

  // 編集用フォームの状態
  const [editForm, setEditForm] = useState({
    purchase_price: "",
    purchase_date: "",
    purchase_shipping: "",
    sale_price: "",
    sale_date: "",
    platform: "",
    fees: "",
    shipping_cost: "",
    notes: "",
    product_template_id: "",
    is_sold: false,
  });

  // 結果入力用フォームの状態
  const [resultForm, setResultForm] = useState({
    won_count: 0,
  });

  useEffect(() => {
    fetchHistory();
    fetchTemplates();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user-history");
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setEvents(data.events);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/product-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  // フィルタリングロジック
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'won') return event.result_status === 'won' || event.result_status === 'partial' || event.result_status === 'purchased';
    if (filter === 'lost') return event.result_status === 'lost' || event.result_status === 'not_purchased';
    if (filter === 'pending') return event.result_status === 'pending';
    return true;
  });

  //詳細編集モーダルを開く
  const handleEditClick = (event: HistoryEvent) => {
    setSelectedEvent(event);
    setEditForm({
      purchase_price: event.purchase_price ? Math.floor(event.purchase_price).toString() : "",
      purchase_date: event.purchase_date ? new Date(event.purchase_date).toISOString().split('T')[0] : "",
      purchase_shipping: event.purchase_shipping ? Math.floor(event.purchase_shipping).toString() : "",
      sale_price: event.sale_price ? Math.floor(event.sale_price).toString() : "",
      sale_date: event.sale_date ? new Date(event.sale_date).toISOString().split('T')[0] : "",
      platform: event.platform || "",
      fees: event.fees ? Math.floor(event.fees).toString() : "",
      shipping_cost: event.shipping_cost ? Math.floor(event.shipping_cost).toString() : "",
      notes: event.notes || "",
      product_template_id: event.product_template_id?.toString() || "",
      is_sold: !!(event.sale_price || event.sale_date || event.platform),
    });
    setIsEditModalOpen(true);
  };

  // テンプレート選択時の処理
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    const template = templates.find(t => t.id.toString() === templateId);

    if (template) {
      setEditForm(prev => ({
        ...prev,
        product_template_id: templateId,
        purchase_price: template.default_retail_price ? Math.floor(template.default_retail_price).toString() : prev.purchase_price,
        sale_price: template.avg_resale_price ? Math.floor(template.avg_resale_price).toString() : prev.sale_price,
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        product_template_id: templateId,
      }));
    }
  };

  // プラットフォームと売却価格から手数料を自動計算
  useEffect(() => {
    const platform = editForm.platform;
    const salePrice = Number(editForm.sale_price);

    // プラットフォームが選択されていて、売却価格が入力されている場合
    if (platform && salePrice > 0) {
      const feeRate = PLATFORM_FEE_RATES[platform];
      if (feeRate !== undefined && feeRate > 0) {
        const calculatedFee = Math.floor(salePrice * (feeRate / 100));
        setEditForm(prev => ({
          ...prev,
          fees: calculatedFee.toString(),
        }));
      }
    }
  }, [editForm.platform, editForm.sale_price]);

  // 結果入力モーダルを開く
  const handleResultClick = (event: HistoryEvent) => {
    setSelectedEvent(event);
    setResultForm({ won_count: 0 });
    setIsResultModalOpen(true);
  };

  // 購入記録モーダルを開く（先着イベント用）
  const handlePurchaseClick = (event: HistoryEvent) => {
    setSelectedEvent(event);
    setIsPurchaseModalOpen(true);
  };

  // 先着イベントの購入記録を保存
  const handleSavePurchaseRecord = async (purchased: boolean) => {
    if (!selectedEvent) return;

    try {
      const res = await fetch("/api/raffle/purchase-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: selectedEvent.record_id,
          raffle_id: selectedEvent.id,
          result_status: purchased ? "purchased" : "not_purchased",
        }),
      });

      if (!res.ok) throw new Error("Failed to save purchase record");

      setIsPurchaseModalOpen(false);

      // 購入した場合は詳細編集モーダルを開く
      if (purchased) {
        handleEditClick(selectedEvent);
      } else {
        fetchHistory(); // リロード
      }
    } catch (error) {
      console.error("Error saving purchase record:", error);
      alert("保存に失敗しました");
    }
  };

  // 詳細保存
  const handleSaveDetails = async () => {
    if (!selectedEvent) return;

    try {
      // 売却済みでない場合は売却関連フィールドをクリア
      const formData = editForm.is_sold ? editForm : {
        ...editForm,
        sale_price: "",
        sale_date: "",
        platform: "",
        fees: "",
        shipping_cost: "",
      };

      // 利益計算
      const purchase = Number(formData.purchase_price) || 0;
      const pShipping = Number(formData.purchase_shipping) || 0;
      const sale = Number(formData.sale_price) || 0;
      const fees = Number(formData.fees) || 0;
      const sShipping = Number(formData.shipping_cost) || 0;
      const profit = sale - (purchase + pShipping + fees + sShipping);

      const res = await fetch("/api/raffle/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: selectedEvent.record_id,
          raffle_id: selectedEvent.id,
          ...formData,
          profit,
        }),
      });

      if (!res.ok) throw new Error("Failed to save details");

      setIsEditModalOpen(false);
      fetchHistory(); // リロードして最新情報を取得
    } catch (error) {
      console.error("Error saving details:", error);
      alert("保存に失敗しました");
    }
  };

  // 結果保存
  const handleSaveResult = async () => {
    if (!selectedEvent) return;

    try {
      const res = await fetch("/api/raffle/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raffle_id: selectedEvent.id,
          won_count: resultForm.won_count,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save result");
      }

      setIsResultModalOpen(false);
      fetchHistory(); // リロードして最新情報を取得
    } catch (error: any) {
      console.error("Error saving result:", error);
      alert(`保存に失敗しました: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string, isAdvance: boolean) => {
    switch (status) {
      case "won":
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">当選</span>;
      case "lost":
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">落選</span>;
      case "pending":
        if (isAdvance) {
          return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">未記録</span>;
        }
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">結果待ち</span>;
      case "purchased":
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">購入済み</span>;
      case "not_purchased":
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">購入せず</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">{status}</span>;
    }
  };

  // Helper function to format applied date safely
  const formatAppliedDate = (appliedAt: string | null | undefined): string => {
    if (!appliedAt) return "";
    const date = new Date(appliedAt);
    // Check if date is valid and not epoch (1970) or before 2000
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "";
    return date.toLocaleDateString("ja-JP") + " 応募";
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            応募履歴
          </h1>

          {/* 統計情報 */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-sm">総応募数</p>
                <p className="text-2xl font-bold">{stats.applied}</p>
              </div>
              <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/30">
                <p className="text-green-400 text-sm">当選数</p>
                <p className="text-2xl font-bold text-green-400">{stats.won}</p>
              </div>
              <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/30">
                <p className="text-red-400 text-sm">落選数</p>
                <p className="text-2xl font-bold text-red-400">{stats.lost}</p>
              </div>
              <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30">
                <p className="text-purple-400 text-sm">当選率</p>
                <p className="text-2xl font-bold text-purple-400">{stats.rate}%</p>
              </div>
            </div>
          )}

          {/* フィルターボタン */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/40'
                }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter('won')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'won'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/40'
                }`}
            >
              当選
            </button>
            <button
              onClick={() => setFilter('lost')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'lost'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/40'
                }`}
            >
              落選
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/40'
                }`}
            >
              結果待ち
            </button>
          </div>

          {/* 履歴リスト */}
          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                {filter === 'all' ? '履歴がありません' : 'このフィルターに該当する履歴がありません'}
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.record_id || event.id}
                  className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-all shadow-lg hover:shadow-xl flex flex-col md:flex-row gap-5 items-start"
                >
                  {/* 画像 */}
                  <div className="w-28 h-28 md:w-32 md:h-32 relative rounded-xl overflow-hidden flex-shrink-0 bg-gray-900/50 border border-gray-700/30">
                    <img
                      src={event.img}
                      alt={event.title}
                      className="object-contain w-full h-full p-2"
                    />
                  </div>

                  {/* 詳細 */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    {/* ステータスと応募日 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(event.result_status, event.advance)}
                      <span className="text-xs text-gray-500">
                        {formatAppliedDate(event.applied_at)}
                      </span>
                      {/* 応募数表示（グループ化されている場合） */}
                      {!event.is_individual && event.application_count && event.application_count > 1 && (
                        <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/30">
                          {event.application_count}口応募
                        </span>
                      )}
                    </div>

                    {/* タイトルとサイト */}
                    <div>
                      <h3 className="font-bold text-xl mb-1 text-white">{event.title}</h3>
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <span className="text-gray-500">📍</span>
                        {event.site}
                      </p>
                    </div>

                    {/* 利益情報（当選・購入済みのみ） */}
                    {(event.result_status === 'won' || event.result_status === 'partial' || event.result_status === 'purchased') && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">購入額</span>
                          <span className="text-base font-semibold text-white">
                            {(event.purchase_price !== null && event.purchase_price !== undefined && event.purchase_price > 0) ? `¥${Math.floor(event.purchase_price).toLocaleString()}` : '-'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">売却額</span>
                          <span className="text-base font-semibold text-white">
                            {(event.sale_price !== null && event.sale_price !== undefined && event.sale_price > 0) ? `¥${Math.floor(event.sale_price).toLocaleString()}` : '-'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 mb-1">利益</span>
                          <span className={`text-base font-bold ${event.profit && event.profit > 0 ? "text-green-400" : event.profit && event.profit < 0 ? "text-red-400" : "text-gray-400"}`}>
                            {(event.profit !== null && event.profit !== undefined && event.profit !== 0) ? (
                              <>
                                {event.profit > 0 ? '+' : ''}¥{Math.floor(event.profit).toLocaleString()}
                              </>
                            ) : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[140px]">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2.5 bg-gray-700/80 hover:bg-gray-600 rounded-lg text-sm font-medium transition-all text-center border border-gray-600/50 hover:border-gray-500"
                    >
                      商品ページ
                    </a>

                    {/* 先着イベントの購入記録ボタン */}
                    {event.advance && event.result_status === 'pending' && (
                      <button
                        onClick={() => handlePurchaseClick(event)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all border border-blue-500/50"
                      >
                        購入記録
                      </button>
                    )}

                    {/* 抽選イベントの結果入力ボタン（結果待ちの場合） */}
                    {!event.advance && event.result_status === 'pending' && (
                      <button
                        onClick={() => handleResultClick(event)}
                        className="w-full px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-all border border-yellow-500/50"
                      >
                        結果を入力
                      </button>
                    )}

                    {/* 詳細編集ボタン（当選・購入済みの場合） */}
                    {(event.result_status === 'won' || event.result_status === 'partial' || event.result_status === 'purchased') && (
                      <button
                        onClick={() => handleEditClick(event)}
                        className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all border border-blue-500/50"
                      >
                        詳細を編集
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 詳細編集モーダル */}
          {
            isEditModalOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">取引詳細を編集</h2>
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* 商品テンプレート選択 */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <label className="block text-sm font-bold text-blue-400 mb-2">
                        商品テンプレートから自動入力
                      </label>
                      <select
                        value={editForm.product_template_id}
                        onChange={handleTemplateChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">テンプレートを選択...</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.brand})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        ※ 選択すると購入価格と売却価格が自動で入力されます
                      </p>
                    </div>

                    {/* 購入情報 */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 mb-3">購入情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">購入価格</label>
                          <input
                            type="number"
                            step="1"
                            value={editForm.purchase_price}
                            onChange={(e) => setEditForm({ ...editForm, purchase_price: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">購入日</label>
                          <input
                            type="date"
                            value={editForm.purchase_date}
                            onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">購入時送料</label>
                          <input
                            type="number"
                            step="1"
                            value={editForm.purchase_shipping}
                            onChange={(e) => setEditForm({ ...editForm, purchase_shipping: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 売却済みチェックボックス */}
                    <div className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/30">
                      <input
                        type="checkbox"
                        id="is_sold"
                        checked={editForm.is_sold}
                        onChange={(e) => setEditForm({ ...editForm, is_sold: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
                      />
                      <label htmlFor="is_sold" className="text-sm font-medium text-gray-300 cursor-pointer">
                        売却済み
                      </label>
                      <span className="text-xs text-gray-500 ml-2">
                        （チェックを外すと購入情報のみ保存できます）
                      </span>
                    </div>

                    {/* 売却情報 */}
                    {editForm.is_sold && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 mb-3">売却情報</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">売却価格</label>
                          <input
                            type="number"
                            step="1"
                            value={editForm.sale_price}
                            onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">売却日</label>
                          <input
                            type="date"
                            value={editForm.sale_date}
                            onChange={(e) => setEditForm({ ...editForm, sale_date: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">プラットフォーム</label>
                          <select
                            value={editForm.platform}
                            onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          >
                            <option value="">選択してください</option>
                            <option value="Mercari">メルカリ（手数料 10%）</option>
                            <option value="SNKRDUNK">スニダン（手数料 9.5%）</option>
                            <option value="StockX">StockX（手数料 12%）</option>
                            <option value="YahooAuctions">ヤフオク（手数料 10%）</option>
                            <option value="Rakuma">ラクマ（手数料 6.6%）</option>
                            <option value="Other">その他（手動入力）</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            ※ プラットフォーム選択時に手数料が自動計算されます
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 経費・その他 */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-400 mb-3">経費・その他</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">販売手数料</label>
                          <input
                            type="number"
                            step="1"
                            value={editForm.fees}
                            onChange={(e) => setEditForm({ ...editForm, fees: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                          {editForm.platform && PLATFORM_FEE_RATES[editForm.platform] > 0 && (
                            <p className="text-xs text-blue-400 mt-1">
                              {editForm.platform}: {PLATFORM_FEE_RATES[editForm.platform]}% で自動計算済み
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">発送送料</label>
                          <input
                            type="number"
                            step="1"
                            value={editForm.shipping_cost}
                            onChange={(e) => setEditForm({ ...editForm, shipping_cost: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                    )}

                    {/* メモ（常に表示） */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">メモ</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
                      />
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-800 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => setIsEditModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 text-gray-400 hover:text-white transition-colors text-center"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                    >
                      保存する
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {/* 結果入力モーダル */}
          {
            isResultModalOpen && selectedEvent && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold">抽選結果を入力</h2>
                    <p className="text-sm text-gray-400 mt-1">{selectedEvent.title}</p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-400 mb-1">応募口数</p>
                      <p className="text-2xl font-bold">{selectedEvent.application_count || 1}口</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-300 mb-2">
                        当選数
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={selectedEvent.application_count || 1}
                        value={resultForm.won_count}
                        onChange={(e) => setResultForm({ won_count: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        ※ 残りの {Math.max(0, (selectedEvent.application_count || 1) - resultForm.won_count)}口 は「落選」として記録されます
                      </p>
                    </div>
                  </div>

                  <div className="p-6 border-t border-gray-800 flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => setIsResultModalOpen(false)}
                      className="w-full sm:w-auto px-4 py-2 text-gray-400 hover:text-white transition-colors text-center"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveResult}
                      className="w-full sm:w-auto px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold transition-colors"
                    >
                      結果を保存
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {/* 購入記録モーダル（先着イベント用） */}
          {
            isPurchaseModalOpen && selectedEvent && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 rounded-2xl w-full max-w-md border border-gray-800">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold">購入記録を入力</h2>
                    <p className="text-sm text-gray-400 mt-1">{selectedEvent.title}</p>
                  </div>

                  <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-300">
                      この先着イベントの商品を購入しましたか？
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleSavePurchaseRecord(true)}
                        className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                      >
                        購入した
                      </button>
                      <button
                        onClick={() => handleSavePurchaseRecord(false)}
                        className="px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold transition-colors"
                      >
                        購入せず
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      ※「購入した」を選択すると、購入価格や販売価格を入力できます
                    </p>
                  </div>

                  <div className="p-6 border-t border-gray-800 flex justify-end">
                    <button
                      onClick={() => setIsPurchaseModalOpen(false)}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )
          }
        </div>
      </div>
    </>
  );
}