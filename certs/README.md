# 証明書ディレクトリ

このディレクトリには以下の証明書を配置してください：

## 本番環境で必要なファイル

1. **mysql-ca.pem**
   - ConoHa VPS MySQL のSSL証明書
   - 参考: `CONOHA_MYSQL_SETUP.md`

2. **gcp-service-account.json**
   - GCP サービスアカウントキー（JSON形式）
   - 権限: Storage Admin または Storage Object Admin

## セキュリティ

これらのファイルは機密情報を含むため、`.gitignore` に含まれており、Gitにコミットされません。

## 権限設定

本番環境では以下の権限設定を推奨します：

```bash
chmod 600 certs/*
chown www-data:www-data certs/*
```

## ローカル開発環境

ローカル開発環境では、以下のいずれかの方法で証明書なしで動作させることができます：

1. **MySQL接続**: `DB_SSL_CA` を設定しない（SSLなしで接続）
2. **Cloud Storage**: GCS関連の環境変数を設定しない（画像アップロード機能は無効）
