"use client";

import { SessionProvider } from "next-auth/react";
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="text-gray-100">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}