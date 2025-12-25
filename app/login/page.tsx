"use client";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [hover, setHover] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/calendar");
    }
  }, [status, router]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-[#111827] to-[#0a0a0f] text-white overflow-hidden">
      {/* 動く背景グラデーション */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-purple-900/10 to-transparent animate-[pulse_8s_infinite]" />

      {/* 光の粒（クライアントマウント後に生成して SSR と一致させない） */}
      <div className="absolute inset-0 overflow-hidden">
        {/**
         * 乱数で位置やサイズを生成するとサーバーとクライアントで値が変わり
         * ハイドレーション不一致の原因になるため、マウント後に生成します。
         */}
        {/** 初期は何も描画せず、クライアントで blobs を生成 */}
        <ClientBlobs />
      </div>

      {/* メインカード */}
      <div className="relative z-10 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-12 shadow-2xl max-w-md w-full mx-4 text-center">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/40 blur-2xl rounded-full group-hover:blur-3xl transition-all duration-500" />
            <Image
              src="https://chimpancommunity.com/chimpancommunity_logo1.png"
              alt="Chimpan Logo"
              width={120}
              height={120}
              className="relative rounded-3xl border-2 border-blue-500/30 group-hover:border-blue-400/70 transition-all duration-500"
            />
          </div>
          <h1 className="text-3xl font-extrabold mt-8 font-semibold text-[var(--color-text-primary)] animate-[gradient_5s_infinite]">
            ちんぱんコミュニティ
          </h1>
          <p className="text-sm text-gray-400 mt-2">限定メンバー専用カレンダーポータル</p>
        </div>

        {/* ログインボタン */}
        <button
          onClick={() => signIn("discord", { callbackUrl: "/calendar" })}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className="relative w-full py-4 px-6 mt-6 bg-gradient-to-r from-[#5865F2] to-[#7289DA] rounded-xl font-bold text-white shadow-lg shadow-[#5865F2]/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-[#7289DA]/50 flex items-center justify-center gap-3"
        >
          <Image
            src="https://cdn-icons-png.flaticon.com/512/5968/5968756.png"
            alt="Discord Icon"
            width={28}
            height={28}
            className={`transition-transform duration-300 ${hover ? "scale-110 rotate-12" : ""}`}
          />
          Discordでログイン
        </button>

        {/* 利用規約 */}
        <p className="text-xs text-gray-500 mt-6 leading-relaxed">
          ログインすることで、利用規約およびプライバシーポリシーに同意したものとみなされます。
        </p>
      </div>

      {/* フッター */}
      <footer className="relative z-10 mt-8 text-gray-500 text-sm">
        © 2025 Chimpan Community
      </footer>

      {/* カスタムアニメーション */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-40px); opacity: 0.8; }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </main>
  );
}

  function ClientBlobs() {
    const [blobs, setBlobs] = useState<Array<{ top: string; left: string; width: string; height: string; delay: string }>>([]);

    useEffect(() => {
      const b = Array.from({ length: 25 }).map((_, i) => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        width: `${Math.random() * 180 + 60}px`,
        height: `${Math.random() * 180 + 60}px`,
        delay: `${i * 1.5}s`,
      }));
      setBlobs(b);
    }, []);

    if (blobs.length === 0) return null;

    return (
      <>
        {blobs.map((blob, i) => (
          <div
            key={i}
            className="absolute bg-blue-400/10 rounded-full blur-2xl animate-[float_15s_infinite]"
            style={{
              top: blob.top,
              left: blob.left,
              width: blob.width,
              height: blob.height,
              animationDelay: blob.delay,
            }}
          />
        ))}
      </>
    );
  }
