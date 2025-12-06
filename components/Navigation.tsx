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
    { name: "プレゼント", path: "/giveaway" },
    { name: "設定", path: "/settings" },
  ];

  const navItems = baseNavItems;

  const handleNavClick = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-surface-secondary/95 backdrop-blur-sm border-b border-[rgba(196,186,176,0.08)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* ロゴ */}
          <button
            onClick={() => handleNavClick("/calendar")}
            className="flex items-center gap-3 hover:opacity-80 transition-all duration-250 group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center text-surface-primary font-display font-bold text-lg shadow-refined group-hover:shadow-refined-md transition-all">
              C
            </div>
            <span className="text-xl font-display font-semibold tracking-tight hidden sm:block text-[var(--color-text-primary)]">ちんぱんコミュニティ</span>
          </button>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-250 text-sm ${
                  pathname === item.path
                    ? "bg-accent text-surface-primary shadow-refined"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary"
                }`}
              >
                {item.name}
              </button>
            ))}

            {/* 管理メニュー（管理者のみ） */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className={`px-4 py-2 rounded-md font-medium transition-all duration-250 flex items-center gap-1 text-sm ${
                    pathname?.startsWith("/admin")
                      ? "bg-accent text-surface-primary shadow-refined"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary"
                  }`}
                >
                  管理
                  <svg
                    className={`w-4 h-4 transition-transform duration-250 ${showAdminMenu ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAdminMenu && (
                  <div className="absolute top-full right-0 mt-2 w-52 bg-surface-elevated rounded-lg shadow-refined-lg border border-[var(--color-border-medium)] overflow-hidden z-50 animate-fade-in">
                    <button
                      onClick={() => {
                        handleNavClick("/admin/events");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary transition-all duration-250 text-sm"
                    >
                      イベント管理
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick("/admin/templates");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary transition-all duration-250 text-sm"
                    >
                      テンプレート管理
                    </button>
                    <button
                      onClick={() => {
                        handleNavClick("/admin/activity");
                        setShowAdminMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary transition-all duration-250 text-sm"
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
            className="md:hidden p-2 rounded-md hover:bg-surface-tertiary transition-all duration-250 text-[var(--color-text-secondary)]"
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
            className="hidden md:block px-4 py-2 bg-[var(--color-error)] hover:bg-[#c46666] rounded-md font-medium transition-all duration-250 text-sm shadow-refined"
          >
            ログアウト
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border-subtle)] animate-fade-in">
            <div className="flex flex-col gap-1.5">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`px-4 py-3 rounded-md font-medium text-left transition-all duration-250 text-sm ${
                    pathname === item.path
                      ? "bg-accent text-surface-primary shadow-refined"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary"
                  }`}
                >
                  {item.name}
                </button>
              ))}

              {/* 管理メニュー（管理者のみ・モバイル） */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className={`px-4 py-3 rounded-md font-medium text-left transition-all duration-250 flex items-center justify-between text-sm ${
                      pathname?.startsWith("/admin")
                        ? "bg-accent text-surface-primary shadow-refined"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary"
                    }`}
                  >
                    管理
                    <svg
                      className={`w-4 h-4 transition-transform duration-250 ${showAdminMenu ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAdminMenu && (
                    <div className="pl-4 flex flex-col gap-1.5 animate-slide-in">
                      <button
                        onClick={() => {
                          handleNavClick("/admin/events");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary text-left transition-all duration-250 text-sm"
                      >
                        イベント管理
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick("/admin/templates");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary text-left transition-all duration-250 text-sm"
                      >
                        テンプレート管理
                      </button>
                      <button
                        onClick={() => {
                          handleNavClick("/admin/activity");
                          setShowAdminMenu(false);
                        }}
                        className="px-4 py-2 rounded-md text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] hover:bg-surface-tertiary text-left transition-all duration-250 text-sm"
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
                className="px-4 py-3 bg-[var(--color-error)] hover:bg-[#c46666] rounded-md font-medium text-left transition-all duration-250 mt-2 text-sm shadow-refined"
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