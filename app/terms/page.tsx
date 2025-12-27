export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">利用規約</h1>
          <p className="text-gray-400">最終更新日: 2025年12月</p>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. サービスの概要</h2>
            <p>
              本アプリケーション（以下「本サービス」）は、ちんぱんコミュニティのメンバー限定で提供されるカレンダー・抽選管理アプリケーションです。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. 利用資格</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                本サービスは、ちんぱんコミュニティのメンバーのみが利用できます
              </li>
              <li>
                Discord認証によりメンバーシップが確認されます
              </li>
              <li>
                メンバーシップを喪失した場合、本サービスの利用資格も喪失します
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. 禁止事項</h2>
            <p className="mb-2">本サービスの利用にあたり、以下の行為を禁止します：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーに迷惑をかける行為</li>
              <li>不正アクセスその他の不正行為</li>
              <li>本サービスの複製、改変、リバースエンジニアリング等</li>
              <li>商用目的での利用（コミュニティ内での個人的な転売活動は除く）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. データの取り扱い</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                ユーザーが入力した購入・販売履歴等のデータは、ユーザー自身が管理します
              </li>
              <li>
                管理者は、サービスの運営・改善のためにデータにアクセスすることがあります
              </li>
              <li>
                データのバックアップは定期的に行われますが、データの完全性は保証されません
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. 免責事項</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                本サービスは「現状のまま」提供され、可用性、正確性、完全性等について保証しません
              </li>
              <li>
                本サービスの利用によって生じた損害について、運営者は一切の責任を負いません
              </li>
              <li>
                外部サービス（Discord等）の障害により本サービスが利用できない場合があります
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. サービスの変更・停止</h2>
            <p>
              運営者は、事前の通知なく本サービスの内容を変更、または本サービスの提供を停止することができます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. 利用規約の変更</h2>
            <p>
              本利用規約は、必要に応じて変更されることがあります。変更後の利用規約は、本ページに掲載された時点で効力を生じるものとします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. お問い合わせ</h2>
            <p>
              本利用規約に関するお問い合わせは、ちんぱんコミュニティのDiscordサーバーまでご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. AIチャット機能</h2>
            <p className="mb-2">本サービスには、統計情報の確認やアプリの使い方を質問できるAIチャット機能が含まれます。</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>
                <span className="font-bold text-red-400">パスワード、クレジットカード番号、マイナンバー、免許証番号などの機密情報や個人を特定できる情報を入力しないでください</span>
              </li>
              <li>
                会話内容は基本的に確認しませんが、セキュリティ脅威の検知や不適切な内容の検知、サービス改善のために分析される場合があります
              </li>
              <li>
                AIチャットの利用には1日あたり80,000クレジットの上限があります（モデルによって消費クレジットが異なります）
              </li>
              <li>
                会話内容はGoogle Gemini APIに送信されます。詳細はプライバシーポリシーをご確認ください
              </li>
              <li>
                AIによる回答の正確性は保証されません。重要な判断には必ず自身で確認してください
              </li>
            </ul>
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
