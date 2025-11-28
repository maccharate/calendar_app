export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          オフラインです
        </h1>
        <p className="text-gray-400 mb-8">
          インターネット接続を確認してください。<br />
          接続が復旧すると自動的に同期されます。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
