"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    allow_multiple_applications: false,
    default_application_count: 1,
    show_application_modal: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    notifications_enabled: false,
    advance_before_start: true,
    raffle_on_start: true,
    raffle_before_end: true,
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    fetchSettings();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        console.error("Failed to fetch settings");
      }

      // 通知設定を取得
      const notifRes = await fetch("/api/user/notification-settings");
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotificationSettings(notifData);
        setPushSubscribed(notifData.has_subscription || false);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('このブラウザは通知をサポートしていません');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      alert('このブラウザはService Workerをサポートしていません');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        // Service Workerを登録してプッシュ通知をサブスクライブ
        await subscribeToPush();
      }
    } catch (error) {
      console.error('通知許可のリクエストに失敗:', error);
      alert('通知許可のリクエストに失敗しました');
    }
  };

  const subscribeToPush = async () => {
    try {
      // Service Workerが登録されるまで待つ
      console.log('Service Workerの準備を確認中...');
      const registration = await navigator.serviceWorker.ready;
      console.log('Service Worker準備完了:', registration);

      // VAPID公開鍵を取得
      console.log('VAPID公開鍵を取得中...');
      const vapidResponse = await fetch('/api/push/vapid-public-key');
      if (!vapidResponse.ok) {
        const error = await vapidResponse.json();
        throw new Error(`VAPID公開鍵の取得に失敗: ${error.error || 'Unknown error'}`);
      }
      const { publicKey } = await vapidResponse.json();
      console.log('VAPID公開鍵取得成功');

      // プッシュ通知をサブスクライブ
      console.log('プッシュマネージャーにサブスクライブ中...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log('サブスクリプション成功:', subscription);

      // サブスクリプションをサーバーに送信
      console.log('サーバーにサブスクリプションを送信中...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`サーバー登録失敗: ${error.error || error.details || 'Unknown error'}`);
      }

      console.log('プッシュ通知登録完了');
      setPushSubscribed(true);
      setNotificationSettings({ ...notificationSettings, notifications_enabled: true });
      alert('✅ プッシュ通知の登録が完了しました！');
    } catch (error: any) {
      console.error('プッシュ通知のサブスクライブに失敗:', error);

      // エラーメッセージを詳細に表示
      let errorMessage = 'プッシュ通知の登録に失敗しました';
      if (error.message) {
        errorMessage += `\n\n詳細: ${error.message}`;
      }
      if (error.name === 'NotAllowedError') {
        errorMessage += '\n\n通知の許可が拒否されています。ブラウザの設定を確認してください。';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += '\n\nこのブラウザはプッシュ通知をサポートしていません。';
      }

      alert(errorMessage);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      // 通知設定も保存
      const notifRes = await fetch("/api/user/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });

      if (res.ok && notifRes.ok) {
        // 成功通知
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100] animate-fade-in";
        notification.textContent = "✓ 設定を保存しました";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
      } else {
        const error = await res.json();
        alert(`❌ エラー: ${error.error}`);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("❌ エラーが発生しました");
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

          <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            設定
          </h1>

          <div className="space-y-6">
            {/* 応募設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">応募設定</h2>
              
              <div className="space-y-6">
                {/* 応募モーダル表示設定 */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">応募時に詳細入力を表示</h3>
                    <p className="text-sm text-gray-400">
                      OFFにすると、ワンクリックで1口応募できます（詳細は後から編集可能）
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        show_application_modal: !settings.show_application_modal,
                      })
                    }
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      settings.show_application_modal
                        ? "bg-blue-600"
                        : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        settings.show_application_modal
                          ? "translate-x-7"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* 複数応募許可 */}
                {settings.show_application_modal && (
                  <div className="pt-4 border-t border-gray-700/50">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">複数応募を許可</h3>
                        <p className="text-sm text-gray-400">
                          ONにすると、1つのイベントに複数口の応募ができます
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSettings({
                            ...settings,
                            allow_multiple_applications: !settings.allow_multiple_applications,
                          })
                        }
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          settings.allow_multiple_applications
                            ? "bg-blue-600"
                            : "bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            settings.allow_multiple_applications
                              ? "translate-x-7"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* デフォルト応募口数 */}
                    {settings.allow_multiple_applications && (
                      <div>
                        <label className="block font-semibold mb-2">
                          デフォルト応募口数
                        </label>
                        <p className="text-sm text-gray-400 mb-4">
                          応募時に自動入力される口数（1〜30）
                        </p>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={settings.default_application_count}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                default_application_count: parseInt(e.target.value),
                              })
                            }
                            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${
                                ((settings.default_application_count - 1) / 29) * 100
                              }%, rgb(55 65 81) ${
                                ((settings.default_application_count - 1) / 29) * 100
                              }%, rgb(55 65 81) 100%)`,
                            }}
                          />
                          <div className="w-16 text-center">
                            <span className="text-2xl font-bold text-blue-400">
                              {settings.default_application_count}
                            </span>
                            <span className="text-sm text-gray-400 ml-1">口</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 通知設定 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              <h2 className="text-xl font-bold mb-4 text-blue-400">プッシュ通知設定</h2>

              {/* プッシュ通知の許可状態 */}
              <div className="mb-6 p-4 rounded-lg bg-gray-900/50 border border-gray-700/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold mb-1">このデバイスの通知登録</h3>
                    <p className="text-sm text-gray-400">
                      {pushPermission === 'granted' ? (
                        pushSubscribed ? (
                          <span className="text-green-400">✓ 登録済み</span>
                        ) : (
                          <span className="text-yellow-400">許可済み（登録が必要）</span>
                        )
                      ) : pushPermission === 'denied' ? (
                        <span className="text-red-400">ブロック中</span>
                      ) : (
                        <span className="text-gray-400">未設定</span>
                      )}
                    </p>
                  </div>
                  {pushPermission !== 'granted' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      通知を許可
                    </button>
                  )}
                  {pushPermission === 'granted' && !pushSubscribed && (
                    <button
                      onClick={subscribeToPush}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      登録する
                    </button>
                  )}
                </div>
                {pushPermission === 'denied' && (
                  <p className="text-xs text-gray-500">
                    ブラウザの設定から通知を許可してください
                  </p>
                )}
                {pushSubscribed && (
                  <p className="text-xs text-gray-500 mt-2">
                    ℹ️ 通知はデバイスごとに登録が必要です。パソコンとスマホの両方で通知を受け取る場合は、それぞれで許可してください。
                  </p>
                )}
              </div>

              {/* 通知設定（プッシュが有効な場合のみ） */}
              {pushSubscribed && (
                <div className="space-y-6">
                  <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
                    <p className="text-xs text-blue-300">
                      💡 通知設定を変更した後は、ページ下部の「保存する」ボタンを押してください
                    </p>
                  </div>

                  {/* 通知全体のオンオフ */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">プッシュ通知を有効にする</h3>
                      <p className="text-sm text-gray-400">
                        イベント開始・終了前に通知を受け取る
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setNotificationSettings({
                          ...notificationSettings,
                          notifications_enabled: !notificationSettings.notifications_enabled,
                        })
                      }
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        notificationSettings.notifications_enabled
                          ? "bg-blue-600"
                          : "bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          notificationSettings.notifications_enabled
                            ? "translate-x-7"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* 個別の通知設定 */}
                  {notificationSettings.notifications_enabled && (
                    <div className="pt-4 border-t border-gray-700/50 space-y-4">
                      {/* 先着イベント開始前通知 */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">先着イベント開始前通知</h3>
                          <p className="text-sm text-gray-400">
                            販売開始10分前に通知
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              advance_before_start: !notificationSettings.advance_before_start,
                            })
                          }
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            notificationSettings.advance_before_start
                              ? "bg-blue-600"
                              : "bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              notificationSettings.advance_before_start
                                ? "translate-x-7"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 抽選イベント開始通知 */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">抽選イベント開始通知</h3>
                          <p className="text-sm text-gray-400">
                            抽選開始時に通知
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              raffle_on_start: !notificationSettings.raffle_on_start,
                            })
                          }
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            notificationSettings.raffle_on_start
                              ? "bg-blue-600"
                              : "bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              notificationSettings.raffle_on_start
                                ? "translate-x-7"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {/* 抽選イベント終了前通知 */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">抽選イベント終了前通知</h3>
                          <p className="text-sm text-gray-400">
                            抽選終了30分前に通知
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              raffle_before_end: !notificationSettings.raffle_before_end,
                            })
                          }
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            notificationSettings.raffle_before_end
                              ? "bg-blue-600"
                              : "bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              notificationSettings.raffle_before_end
                                ? "translate-x-7"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 opacity-50">
              <h2 className="text-xl font-bold mb-4 text-gray-400">表示設定</h2>
              <p className="text-sm text-gray-500">今後実装予定</p>
            </div>

            {/* 保存ボタン */}
            <div className="flex gap-4">
              <button
                onClick={() => router.back()}
                className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl font-semibold transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
              >
                {saving ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
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