# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# Next.jsアプリをビルド
RUN npm run build

# 本番ステージ
FROM node:20-alpine AS runner

WORKDIR /app

# 必要な依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# アップロードディレクトリを作成
RUN mkdir -p /app/uploads /app/logs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
