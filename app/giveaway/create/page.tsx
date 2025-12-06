"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

interface Prize {
  name: string;
  description: string;
  image_url: string;
  winner_count: number;
}

export default function CreateGiveawayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"url" | "upload">("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCreator, setShowCreator] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([
    { name: "", description: "", image_url: "", winner_count: 1 }
  ]);
  const [loading, setLoading] = useState(false);
  const [prizeImageModes, setPrizeImageModes] = useState<("url" | "upload" | "library")[]>(["url"]);
  const [storageImages, setStorageImages] = useState<any[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingPrizeImage, setUploadingPrizeImage] = useState<number | null>(null);

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

  const addPrize = () => {
    setPrizes([...prizes, { name: "", description: "", image_url: "", winner_count: 1 }]);
    setPrizeImageModes([...prizeImageModes, "url"]);
  };

  const removePrize = (index: number) => {
    if (prizes.length === 1) {
      alert("最低1つの賞品が必要です");
      return;
    }
    setPrizes(prizes.filter((_, i) => i !== index));
    setPrizeImageModes(prizeImageModes.filter((_, i) => i !== index));
  };

  const updatePrize = (index: number, field: keyof Prize, value: string | number) => {
    const newPrizes = [...prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    setPrizes(newPrizes);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
        alert("画像をアップロードしました");
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

  const handlePrizeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, prizeIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください");
      return;
    }

    setUploadingPrizeImage(prizeIndex);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        updatePrize(prizeIndex, "image_url", data.url);
        alert("画像をアップロードしました");
        // ライブラリを再読み込み
        fetchStorageImages();
      } else {
        alert("アップロードに失敗しました");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("アップロードエラーが発生しました");
    } finally {
      setUploadingPrizeImage(null);
    }
  };

  const setPrizeImageMode = (index: number, mode: "url" | "upload" | "library") => {
    const newModes = [...prizeImageModes];
    newModes[index] = mode;
    setPrizeImageModes(newModes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !startDate || !endDate) {
      alert("タイトル、開始日時、終了日時は必須です");
      return;
    }

    if (prizes.some(p => !p.name || p.winner_count < 1)) {
      alert("すべての賞品に名前と当選者数を設定してください");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      alert("終了日時は開始日時より後に設定してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/giveaway/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          image_url: imageUrl,
          show_creator: showCreator,
          start_date: startDate,
          end_date: endDate,
          prizes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("イベントを作成しました");
        router.push(`/giveaway/${data.event_id}`);
      } else {
        alert(data.error || "作成に失敗しました");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
          <div className="text-white text-xl">読み込み中...</div>
        </div>
      </>
    );
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/giveaway")}
            className="mb-6 text-gray-400 hover:text-white transition-all flex items-center gap-2"
          >
            ← 一覧に戻る
          </button>

          <h1 className="text-3xl font-bold mb-8 font-display text-[var(--color-text-primary)]">
            プレゼント企画を作成
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">基本情報</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    タイトル <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例: 新年プレゼント企画"
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">説明</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="イベントの詳細を入力してください"
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 min-h-[120px]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="showCreator"
                    checked={showCreator}
                    onChange={(e) => setShowCreator(e.target.checked)}
                    className="w-5 h-5 bg-gray-900/70 border-2 border-gray-700 rounded"
                  />
                  <label htmlFor="showCreator" className="text-gray-300">
                    提供者名を公開する
                  </label>
                </div>
              </div>
            </div>

            {/* 期間設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4">応募期間</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    開始日時 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    終了日時 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 賞品設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">賞品</h2>
                <button
                  type="button"
                  onClick={addPrize}
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-all"
                >
                  賞品を追加
                </button>
              </div>

              <div className="space-y-4">
                {prizes.map((prize, index) => (
                  <div
                    key={index}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold">賞品 {index + 1}</h3>
                      {prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrize(index)}
                          className="text-red-400 hover:text-red-300 transition-all"
                        >
                          削除
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          賞品名 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={prize.name}
                          onChange={(e) => updatePrize(index, "name", e.target.value)}
                          placeholder="例: Amazonギフトカード 1000円分"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">説明</label>
                        <input
                          type="text"
                          value={prize.description}
                          onChange={(e) => updatePrize(index, "description", e.target.value)}
                          placeholder="賞品の詳細"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-2">賞品画像</label>

                        {/* モード切替タブ */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setPrizeImageMode(index, "url")}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              prizeImageModes[index] === "url"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                          >
                            URL入力
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrizeImageMode(index, "upload")}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              prizeImageModes[index] === "upload"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                          >
                            アップロード
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrizeImageMode(index, "library")}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              prizeImageModes[index] === "library"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                            }`}
                          >
                            ライブラリ
                          </button>
                        </div>

                        {/* URL入力モード */}
                        {prizeImageModes[index] === "url" && (
                          <input
                            type="url"
                            value={prize.image_url}
                            onChange={(e) => updatePrize(index, "image_url", e.target.value)}
                            placeholder="https://example.com/prize.jpg"
                            className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          />
                        )}

                        {/* アップロードモード */}
                        {prizeImageModes[index] === "upload" && (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePrizeImageUpload(e, index)}
                            disabled={uploadingPrizeImage === index}
                            className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer disabled:opacity-50"
                          />
                        )}

                        {/* ライブラリモード */}
                        {prizeImageModes[index] === "library" && (
                          <div>
                            {loadingImages ? (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                                <p className="text-xs text-gray-400">読み込み中...</p>
                              </div>
                            ) : storageImages.length === 0 ? (
                              <div className="text-center py-4 bg-gray-800/50 rounded-lg">
                                <p className="text-xs text-gray-400">画像がありません</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-800/30 rounded-lg">
                                {storageImages.map((image, imgIndex) => (
                                  <button
                                    key={imgIndex}
                                    type="button"
                                    onClick={() => updatePrize(index, "image_url", image.url)}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                      prize.image_url === image.url
                                        ? "border-purple-500 ring-2 ring-purple-500/50"
                                        : "border-gray-700 hover:border-gray-600"
                                    }`}
                                  >
                                    <img
                                      src={image.url}
                                      alt={image.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                    {prize.image_url === image.url && (
                                      <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
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
                        {prize.image_url && (
                          <div className="mt-3">
                            <img
                              src={prize.image_url}
                              alt="賞品画像プレビュー"
                              className="max-w-[200px] rounded-lg border border-gray-700"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-400 mb-1">
                          当選者数 <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          value={prize.winner_count}
                          onChange={(e) => updatePrize(index, "winner_count", parseInt(e.target.value) || 1)}
                          min="1"
                          className="w-full bg-gray-900/70 border-2 border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 送信ボタン */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/giveaway")}
                className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-4 rounded-xl font-bold text-lg transition-all"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-4 rounded-xl font-bold text-lg transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "作成中..." : "作成"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
