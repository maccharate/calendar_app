#!/bin/bash

###############################################################################
# Xserver VPS 自動デプロイスクリプト
#
# 使い方:
#   chmod +x scripts/deploy-xserver.sh
#   ./scripts/deploy-xserver.sh
###############################################################################

set -e  # エラーで停止

echo "🚀 Xserver VPS デプロイスクリプト"
echo "=================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# デプロイ方法を選択
echo "デプロイ方法を選択してください:"
echo "1) Docker Compose（推奨）"
echo "2) PM2（Node.js直接実行）"
read -p "選択 (1/2): " DEPLOY_METHOD

if [ "$DEPLOY_METHOD" = "1" ]; then
    echo -e "${GREEN}✓${NC} Docker Composeでデプロイします"

    # Dockerインストール確認
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠${NC}  Dockerがインストールされていません。インストールしますか？ (y/n)"
        read -p "> " INSTALL_DOCKER

        if [ "$INSTALL_DOCKER" = "y" ]; then
            echo "Dockerをインストール中..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sh get-docker.sh
            apt install -y docker-compose
            rm get-docker.sh
            echo -e "${GREEN}✓${NC} Dockerインストール完了"
        else
            echo -e "${RED}✗${NC} Dockerが必要です。終了します。"
            exit 1
        fi
    fi

    # .envファイル作成
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠${NC}  .envファイルが見つかりません。"
        echo ".env.exampleから作成しますか？ (y/n)"
        read -p "> " CREATE_ENV

        if [ "$CREATE_ENV" = "y" ]; then
            cp .env.example .env
            echo -e "${GREEN}✓${NC} .envファイルを作成しました"
            echo -e "${YELLOW}⚠${NC}  .envファイルを編集してください！"
            echo "編集後、このスクリプトを再実行してください。"
            exit 0
        else
            echo -e "${RED}✗${NC} .envファイルが必要です。終了します。"
            exit 1
        fi
    fi

    # Docker Composeで起動
    echo "Docker Composeで起動中..."
    docker-compose up -d

    echo ""
    echo -e "${GREEN}✓${NC} デプロイ完了！"
    echo ""
    echo "ステータス確認:"
    docker-compose ps

    echo ""
    echo "ログ確認:"
    echo "  docker-compose logs -f app"

elif [ "$DEPLOY_METHOD" = "2" ]; then
    echo -e "${GREEN}✓${NC} PM2でデプロイします"

    # Node.jsインストール確認
    if ! command -v node &> /dev/null; then
        echo -e "${YELLOW}⚠${NC}  Node.jsがインストールされていません。インストールしますか？ (y/n)"
        read -p "> " INSTALL_NODE

        if [ "$INSTALL_NODE" = "y" ]; then
            echo "Node.js 20.xをインストール中..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt install -y nodejs
            npm install -g pm2
            echo -e "${GREEN}✓${NC} Node.jsとPM2のインストール完了"
        else
            echo -e "${RED}✗${NC} Node.jsが必要です。終了します。"
            exit 1
        fi
    fi

    # PM2インストール確認
    if ! command -v pm2 &> /dev/null; then
        echo "PM2をインストール中..."
        npm install -g pm2
        echo -e "${GREEN}✓${NC} PM2インストール完了"
    fi

    # .envファイル作成
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠${NC}  .envファイルが見つかりません。"
        cp .env.example .env
        echo -e "${GREEN}✓${NC} .envファイルを作成しました"
        echo -e "${YELLOW}⚠${NC}  .envファイルを編集してください！"
        exit 0
    fi

    # 依存関係インストール
    echo "依存関係をインストール中..."
    npm ci --only=production

    # ビルド
    echo "アプリケーションをビルド中..."
    npm run build

    # アップロードディレクトリ作成
    mkdir -p uploads/events

    # PM2で起動
    if pm2 list | grep -q "calendar-app"; then
        echo "既存のアプリを再起動中..."
        pm2 restart calendar-app
    else
        echo "PM2でアプリを起動中..."
        pm2 start npm --name calendar-app -- start
        pm2 save
    fi

    echo ""
    echo -e "${GREEN}✓${NC} デプロイ完了！"
    echo ""
    echo "ステータス確認:"
    pm2 status

    echo ""
    echo "ログ確認:"
    echo "  pm2 logs calendar-app"

else
    echo -e "${RED}✗${NC} 無効な選択です。終了します。"
    exit 1
fi

echo ""
echo "=========================================="
echo "次のステップ:"
echo "1. Nginxの設定（SSL証明書取得）"
echo "2. ファイアウォール設定（UFW）"
echo "3. 自動バックアップ設定"
echo ""
echo "詳細はDEPLOYMENT_XSERVER.mdを参照してください。"
echo "=========================================="
