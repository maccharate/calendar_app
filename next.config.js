/** @type {import('next').NextConfig} */
module.exports = {
  // output: 'standalone', // Commented out: causes issues with "next start"

  images: {
    // 開発中の外部画像を素早く表示するため、最適化を無効化（本番では見直す）
    unoptimized: true,
    // 外部ホストを許可（スクリーンショットのエラーに基づく）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'chimpanccommunity.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'chimpancommunity.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'chimpancommunity.com',
        pathname: '/**',
      },
    ],
  },
};