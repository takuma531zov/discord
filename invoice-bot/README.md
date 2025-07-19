# Discord Invoice Bot

Discord上で請求書情報を入力し、Google Spreadsheetに自動登録するボットシステムです。

## 📝 概要

Discordのスラッシュコマンドで請求書情報を入力し、Google Apps Script（GAS）経由でスプレッドシートに自動登録します。

### システム構成

```
Discord Bot → Vercel/Cloudflare Functions → Google Apps Script → Google Spreadsheet
```

## 🚀 主な機能

- `/invoice` スラッシュコマンドによる2段階入力フォーム
- 環境別設定（開発/本番）による最適化処理
- 祝日API連携による営業日自動計算
- リアルタイムデータバリデーション
- 環境に応じた応答メッセージ最適化

### 入力項目

**第1モーダル（基本情報）:**
- 請求日
- 請求書番号
- 顧客名
- 件名

**第2モーダル（詳細情報）:**
- 摘要（カンマ区切り）
- 数量（カンマ区切り）
- 単価（カンマ区切り）
- 備考（任意）

**自動計算項目:**
- 入金締切日（翌月最終営業日）
- 登録日時

## 📋 必要要件

- Node.js 18以上
- Discord Bot Token
- Google Apps Script Webhook URL
- Vercel または Cloudflare Pages アカウント

## ⚙️ セットアップ

### 1. 環境変数設定

```env
# Discord設定
DISCORD_TOKEN=your_discord_bot_token
DISCORD_PUBLIC_KEY=your_discord_public_key

# GAS Webhook
GAS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# 環境判定（Vercelが自動設定）
VERCEL_ENV=production  # Vercelが自動設定
```

### 2. Discord Bot設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーション作成
2. Bot Token と Public Key を取得
3. 必要な権限: `applications.commands`, `bot`, Send Messages
4. サーバーに招待後、スラッシュコマンドを登録

### 3. デプロイ

**Vercel**
```bash
pnpm i -g vercel
vercel --prod
```

**Cloudflare Pages:**
```bash
pnpm run build
# Cloudflare Pagesにデプロイ
```

## 🖥️ 環境別動作

### 開発環境（Vercel）
- **タイムアウト**: 2秒（Vercelの制約）
- **処理方式**: 同期処理（Vercelのサーバーレス関数は、レスポンス送信後にFollow-up APIで追加メッセージを送る非同期処理ができない）
- **メッセージ**: 一律成功表示（ステートレス制約。Vercelはレスポンス後に実際のGAS送信結果を確認してユーザーに再通知する仕組みが使えない）
- **削除処理**: スキップ（Vercel制約回避）

### 本番環境（Cloudflare）
- **タイムアウト**: 5秒
- **処理方式**: Follow-up API
- **メッセージ**: 実際の結果表示
- **削除処理**: 実行

## 🔧 開発コマンド

```bash
# 依存関係インストール
pnpm install

# TypeScript型チェック
pnpm exec tsc --noEmit

# ローカル開発
pnpm run dev
```

## 📁 プロジェクト構成

```
invoice-bot/
├── api/
│   ├── interactions.ts        # Discord Webhook エンドポイント
│   ├── handlers/
│   │   ├── dataHandler.ts     # データ処理・GAS送信
│   │   └── modalHandler.ts    # モーダル処理
│   ├── utils/
│   │   ├── dateUtils.ts       # 祝日API・営業日計算
│   │   └── encoder.ts         # データエンコード
│   └── types/
│       └── index.ts           # TypeScript型定義
└── vercel.json                # Vercel設定
```

## 🎯 使用方法

1. Discordで `/invoice` コマンド実行
2. 第1モーダルで基本情報入力
3. 「続きを入力」ボタンクリック
4. 第2モーダルで詳細情報入力
5. 自動でスプレッドシートに登録完了

## 📊 技術仕様

### API連携
- **祝日取得**: `holidays-jp.github.io` API
- **営業日計算**: 土日祝を考慮した自動計算
- **エラーハンドリング**: 環境別タイムアウト設定

### データフロー
1. Discord → Vercel/Cloudflare Functions
2. 営業日計算（祝日API連携）
3. GAS Webhook送信
4. スプレッドシート登録
5. 結果通知

## ⚠️ 重要事項

### Discord API制限
- インタラクション応答: 3秒以内
- Custom ID長: 100文字以内
- モーダル項目: 最大5個

### エラー対策
- GAS応答遅延による `Unknown interaction` 回避
- 環境別タイムアウト設定
- 自動リトライ機能

## 🔗 関連リンク

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Google Apps Script](https://script.google.com/)
- [祝日API](https://holidays-jp.github.io/)

---

**最終更新**: 2025-07-19
**バージョン**: 2.0 (リファクタリング完了)
