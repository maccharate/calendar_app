"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleDiscordSignIn = () => {
    signIn("discord", { callbackUrl });
  };

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "unauthorized":
        return "アクセス権限がありません。ログインしてください。";
      case "OAuthSignin":
        return "Discord認証の開始に失敗しました。";
      case "OAuthCallback":
        return "Discord認証に失敗しました。もう一度お試しください。";
      case "OAuthCreateAccount":
        return "アカウントの作成に失敗しました。";
      case "EmailCreateAccount":
        return "アカウントの作成に失敗しました。";
      case "Callback":
        return "認証処理中にエラーが発生しました。";
      case "OAuthAccountNotLinked":
        return "このアカウントは別の認証方法で登録されています。";
      case "SessionRequired":
        return "このページにアクセスするにはログインが必要です。";
      case "Default":
        return "認証エラーが発生しました。もう一度お試しください。";
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and App Name */}
        <div className="text-center mb-8">
          <div className="w-28 h-28 mx-auto mb-6 flex items-center justify-center">
            <img
              src="https://chimpancommunity.com/src/icon/logo_no_txt.png"
              alt="Owl Calendar"
              className="w-full h-full object-contain transition-transform hover:scale-105"
              style={{
                borderRadius: '22.5%',
                boxShadow: `
                  0 20px 40px -10px rgba(0, 0, 0, 0.5),
                  0 15px 20px -10px rgba(0, 0, 0, 0.4)
                `
              }}
            />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Owl Calendar
          </h1>
          <p className="text-xl text-blue-300 mb-2">for ちんぱんコミュニティ</p>
          <p className="text-gray-400 text-sm">メンバー専用スケジュール管理アプリ</p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-red-200 text-sm">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50">
          <h2 className="text-xl font-bold mb-6 text-center">ログイン</h2>

          <button
            onClick={handleDiscordSignIn}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-3 group"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 71 55"
              fill="currentColor"
            >
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" />
            </svg>
            <span>Discordでログイン</span>
          </button>

          <p className="text-xs text-gray-500 text-center mt-6">
            ログインすることで、
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline mx-1"
            >
              利用規約
            </a>
            と
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline mx-1"
            >
              プライバシーポリシー
            </a>
            に同意したものとみなされます。
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            このアプリケーションはDiscordアカウントでログインします
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
