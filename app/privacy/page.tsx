export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">プライバシーポリシー</h1>
          <p className="text-gray-400">最終更新日: 2024年12月</p>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. 収集する情報</h2>
            <p className="mb-2">
              本アプリケーションは、Discord OAuth認証を通じて以下の情報を収集します：
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>DiscordユーザーID</li>
              <li>ユーザー名</li>
              <li>メールアドレス（Discord側で公開設定されている場合）</li>
              <li>プロフィール画像</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. 情報の利用目的</h2>
            <p className="mb-2">収集した情報は以下の目的で利用されます：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>ユーザー認証およびログイン機能の提供</li>
              <li>カレンダーイベントへの応募管理</li>
              <li>抽選機能の提供</li>
              <li>購入・販売履歴の管理</li>
              <li>サービスの改善および機能追加</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. 情報の保存と管理</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                収集した情報は、セキュリティが確保されたデータベースに保存されます
              </li>
              <li>
                情報へのアクセスは、サービス運営に必要な管理者のみに制限されています
              </li>
              <li>
                ユーザーデータは、アカウント削除要求があった場合に削除されます
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. 第三者への開示</h2>
            <p>
              収集した個人情報は、法令に基づく場合を除き、第三者に開示・提供することはありません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Cookie等の利用</h2>
            <p>
              本アプリケーションは、ログイン状態の維持のためにセッションCookieを使用します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. プライバシーポリシーの変更</h2>
            <p>
              本プライバシーポリシーは、必要に応じて変更されることがあります。変更後のプライバシーポリシーは、本ページに掲載された時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. お問い合わせ</h2>
            <p>
              本プライバシーポリシーに関するお問い合わせは、ちんぱんコミュニティのDiscordサーバーまでご連絡ください。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-700">
          <a
            href="/auth/signin"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← ログインページに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
