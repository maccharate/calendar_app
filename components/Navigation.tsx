"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const res = await fetch("/api/admin/check");
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error("Admin check error:", error);
    }
  };

  const baseNavItems = [
    { name: "カレンダー", path: "/calendar" },
    { name: "ダッシュボード", path: "/dashboard" },
    { name: "統計", path: "/stats" },
    { name: "履歴", path: "/history" },
    { name: "マイイベント", path: "/my-events/new" },
    { name: "設定", path: "/settings" },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { name: "管理", path: "/admin/events" }]
    : baseNavItems;

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-gray-900/80 backdrop-blur-md border-b border-gray-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <button
            onClick={() => handleNavClick("/calendar")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              🐵
            </div>
            <span className="text-xl font-bold hidden sm:block">ちんぱんコミュニティ</span>
          </button>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  pathname === item.path
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* ハンバーガーメニューボタン（モバイル） */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* ログアウトボタン（デスクトップ） */}
          <button
            onClick={() => router.push("/api/auth/signout")}
            className="hidden md:block px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all"
          >
            ログアウト
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800/50">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`px-4 py-3 rounded-lg font-medium text-left transition-all ${
                    pathname === item.path
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {item.name}
                </button>
              ))}
              <button
                onClick={() => {
                  router.push("/api/auth/signout");
                  setIsMenuOpen(false);
                }}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-left transition-all mt-2"
              >
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}