export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">プライバシーポリシー</h1>
          <p className="text-gray-400">最終更新日: 2025年12月</p>
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

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. AIチャット機能における情報の取り扱い</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-blue-400 mb-2">収集する情報</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>AIチャットの会話内容（質問と回答）</li>
                  <li>トークン使用量</li>
                  <li>選択したモデル（Flash/Pro）</li>
                  <li>会話の日時</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-400 mb-2">利用目的</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>統計情報の提供</li>
                  <li>アプリの使い方に関する質問への回答</li>
                  <li>サービス改善のための分析</li>
                  <li>不適切な内容やセキュリティ脅威の検知</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-400 mb-2">第三者への提供</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>
                    会話内容は<span className="font-bold">Google Gemini API</span>に送信され、AI応答の生成に使用されます
                  </li>
                  <li>
                    Google Gemini APIのデータ取り扱いについては、<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Googleプライバシーポリシー</a>をご確認ください
                  </li>
                  <li>
                    会話内容は基本的に管理者が確認することはありませんが、セキュリティ脅威の検知や不適切な内容の検知、サービス品質向上のために分析される場合があります
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-blue-400 mb-2">データの保存期間</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>会話履歴は直近50件まで保存されます</li>
                  <li>トークン使用量は日次で記録され、定期的にリセットされます</li>
                  <li>アカウント削除時に関連データも削除されます</li>
                </ul>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4">
                <h3 className="font-bold text-red-400 mb-2">⚠️ 重要な注意事項</h3>
                <p className="text-red-300">
                  AIチャットには、パスワード、クレジットカード番号、マイナンバー、免許証番号などの<span className="font-bold">機密情報や個人を特定できる情報を絶対に入力しないでください</span>。これらの情報が入力された場合、Google Gemini APIに送信され、当サービスではその責任を負いかねます。
                </p>
              </div>
            </div>
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
