"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [unenteredGiveawayCount, setUnenteredGiveawayCount] = useState(0);

  useEffect(() => {
    checkAdmin();
    fetchUnenteredGiveaways();
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

  const fetchUnenteredGiveaways = async () => {
    try {
      const res = await fetch("/api/giveaway/events?status=active");
      if (res.ok) {
        const data = await res.json();
        const now = new Date();

        // 現在のユーザーIDを取得
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        const currentUserId = session?.user?.id;

        // 未応募かつ応募期間中かつ作成者でないイベントをカウント
        const count = data.events.filter((event: any) => {
          const start = new Date(event.start_date);
          const end = new Date(event.end_date);
          const isActive = now >= start && now <= end;
          const isNotCreator = currentUserId && event.created_by !== currentUserId;
          return !event.user_entered && isActive && isNotCreator;
        }).length;

        setUnenteredGiveawayCount(count);
      }
    } catch (error) {
      console.error("Error fetching giveaway count:", error);
    }
  };

  const baseNavItems = [
    { name: "カレンダー", path: "/calendar", badge: 0 },
    { name: "ダッシュボード", path: "/dashboard", badge: 0 },
    { name: "統計", path: "/stats", badge: 0 },
    { name: "履歴", path: "/history", badge: 0 },
    { name: "プレゼント", path: "/giveaway", badge: unenteredGiveawayCount },
    { name: "設定", path: "/settings", badge: 0 },
  ];

  const navItems = baseNavItems;

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-surface-secondary/95 backdrop-blur-sm border-b border-[var(--color-border-subtle)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <button
            onClick={() => handleNavClick("/calendar")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="https://chimpancommunity.com/src/icon/logo_no_txt.png"
              alt="Logo"
              className="w-9 h-9 rounded-lg shadow-refined"
            />
            <span className="text-lg font-semibold hidden sm:block text-[var(--color-text-primary)]">ちんぱんコミュニティ</span>
          </button>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`px-3 py-2 rounded-md font-medium transition-colors text-sm relative ${
                  pathname === item.path
                    ? "bg-accent text-white"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary"
                }`}
              >
                {item.name}
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}

            {/* 管理メニュー（管理者のみ） */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`px-3 py-2 rounded-md font-medium transition-colors flex items-center gap-1 text-sm ${
                    pathname?.startsWith("/admin")
                      ? "bg-accent text-white"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary"
                  }`}
                >
                  管理
                  <svg
                    className={`w-4 h-4 transition-transform ${showAdminMenu ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAdminMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-surface-elevated rounded-lg shadow-refined-lg border border-[var(--color-border-medium)] overflow-hidden z-50">
                    <button
                      onClick={() => {
                        handleNavClick("/admin/events");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary transition-colors text-sm"
                    >
                      イベント管理
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick("/admin/templates");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary transition-colors text-sm"
                    >
                      テンプレート管理
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick("/admin/activity");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary transition-colors text-sm"
                    >
                      アクティビティ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ハンバーガーメニューボタン（モバイル） */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-surface-tertiary transition-colors text-[var(--color-text-secondary)]"
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
            className="hidden md:block px-3 py-2 bg-[var(--color-error)] hover:bg-[#dc2626] rounded-md font-medium transition-colors text-sm text-white"
          >
            ログアウト
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`px-4 py-2.5 rounded-md font-medium text-left transition-colors text-sm relative ${
                    pathname === item.path
                      ? "bg-accent text-white"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </button>
              ))}

              {/* 管理メニュー（管理者のみ・モバイル） */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`px-4 py-2.5 rounded-md font-medium text-left transition-colors flex items-center justify-between text-sm ${
                      pathname?.startsWith("/admin")
                        ? "bg-accent text-white"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary"
                    }`}
                  >
                    管理
                    <svg
                      className={`w-4 h-4 transition-transform ${showAdminMenu ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAdminMenu && (
                    <div className="pl-4 flex flex-col gap-1 mt-1">
                      <button
                        onClick={() => {
                          handleNavClick("/admin/events");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary text-left transition-colors text-sm"
                      >
                        イベント管理
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick("/admin/templates");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary text-left transition-colors text-sm"
                      >
                        テンプレート管理
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick("/admin/activity");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-surface-tertiary text-left transition-colors text-sm"
                      >
                        アクティビティ
                      </button>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => {
                  router.push("/api/auth/signout");
                  setIsMenuOpen(false);
                }}
                className="px-4 py-2.5 bg-[var(--color-error)] hover:bg-[#dc2626] rounded-md font-medium text-left transition-colors mt-2 text-sm text-white"
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