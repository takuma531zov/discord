# Invoice Bot

Discord上で請求書情報を入力し、Google Apps Script（GAS）に転送するボットシステムです。

## 📝 概要

このプロジェクトは、Discordのスラッシュコマンドを使用して請求書情報を入力し、自動的にGASのWebhookに転送するシステムです。

### システム構成

**開発環境:**
```
Discord Bot → Local Relay Server → Google Apps Script
```

**本番環境:**
```
Discord Bot (常時稼働) → Cloud Functions (Relay Server) → Google Apps Script
```

## 🚀 機能

- `/invoice` スラッシュコマンドによる請求書入力
- 2段階モーダルフォーム（Discord APIの制限対応）
- 入力データの自動バリデーション
- GAS Webhookへの自動転送
- 詳細なログ出力
- 環境変数による設定管理

### 入力項目

**第1モーダル（基本情報）:**
- 請求日
- 請求書番号
- 顧客名
- 住所・担当者名（任意）
- 入金締切日

**第2モーダル（詳細情報）:**
- 件名
- 摘要
- 数量
- 単価
- 備考（任意）

## 📋 必要要件

- Node.js 16以上
- pnpm
- Discord Bot Token
- Google Apps Script Webhook URL

## ⚙️ セットアップ

### 1. パッケージインストール

```bash
pnpm install
```

### 2. 環境変数設定

`.env.example`をコピーして`.env`ファイルを作成：

```bash
cp .env.example .env
```

`.env`ファイルを編集（環境に応じて設定）：

**開発環境の設定例：**
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here

# Relay Server Configuration (開発時: Local Relay Server使用)
RELAY_SERVER_URL=http://localhost:3000/invoice

# GAS Webhook Configuration (開発時: Mock環境でテスト)
GAS_WEBHOOK_URL=https://httpbin.org/post
```

**本番環境の設定例：**
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here

# Relay Server Configuration (本番: Cloud Functions使用)
RELAY_SERVER_URL=https://us-central1-your-project.cloudfunctions.net/invoice-webhook

# GAS Webhook Configuration (本番: 実際のGAS環境)
GAS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 3. Discord Bot設定

1. [Discord Developer Portal](https://discord.com/developers/applications)でアプリケーション作成
2. Bot Tokenを取得
3. 必要な権限を設定：
   - `applications.commands`
   - `bot`
4. OAuth2 URLでサーバーに招待（詳細は後述）

### 4. Discordサーバーへの招待

1. **Discord Developer Portal でOAuth2 URL生成**
   - [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
   - 作成したアプリケーションを選択
   - 左メニューから「OAuth2」→「URL Generator」を選択

2. **必要な権限を選択**
   ```
   SCOPES:
   ☑️ bot
   ☑️ applications.commands

   BOT PERMISSIONS:
   ☑️ Send Messages
   ☑️ Use Slash Commands
   ☑️ Send Messages in Threads
   ☑️ Embed Links
   ☑️ Read Message History
   ```

3. **生成されたURLでサーバーに招待**
   - 生成されたURLをコピー
   - ブラウザでアクセス
   - 招待先のDiscordサーバーを選択
   - 「認証」をクリック

**簡単な招待方法:**
`.env`ファイルに記載されている`# Discord招待URL`をブラウザで開き、任意のサーバーを選択して招待することも可能です。

**重要:** 一度招待すれば、開発・本番環境どちらからでも同じBotが動作します。

### 5. コマンド登録

**Botをサーバーに招待後、スラッシュコマンドを登録（初回のみ）**

```bash
pnpm run register
```

**重要:** コマンド登録は**1回のみ**で、その後招待したサーバーでも自動的に利用可能です。

**再登録が必要なケース：**
- コマンド内容を変更した時（名前・説明・オプション等）
- 新しいコマンドを追加・削除した時

**再登録が不要なケース：**
- 新しいサーバーへの招待
- 既存コマンドの実装内容変更（index.ts）
- 環境変数の変更

## 🖥️ 開発環境での使用方法

### ローカルサーバー起動

**Relay Serverの起動:**
```bash
pnpm run webhook
```

**Discord Botの起動:**
```bash
pnpm start
```

### Discord での使用

**開発環境・本番環境共通:**

1. Discordで `/invoice` コマンドを実行
2. 第1モーダルに基本情報を入力
3. 「続けて入力する」ボタンをクリック
4. 第2モーダルに詳細情報を入力
5. 送信完了

## 🛠️ 開発コマンド一覧

```bash
# コマンド登録
pnpm run register

# 開発環境起動
pnpm run webhook    # Relay Server
pnpm start          # Discord Bot

# 本番環境では上記コマンドは不要（Cloud Run/VPS等で自動実行）
```

## 📁 プロジェクト構成

```
invoice-bot/
├── src/
│   ├── index.ts           # Discord Bot メインファイル
│   ├── webhook.ts         # Webhook サーバー
│   └── register-commands.ts  # コマンド登録
├── .env                   # 環境変数設定
├── .env.example          # 環境変数テンプレート
├── package.json
├── tsconfig.json
└── README.md
```


## 🚀 本番環境デプロイ

### 本番環境での常時稼働

**重要:** 本番環境では、Discord Botを常時稼働させる必要があります。ローカルPC（`pnpm start`）では、PCの電源OFFやネットワーク切断で停止してしまうため、クラウドサービスへのデプロイが必須です。

### デプロイ先の選択肢

**推奨: Google Cloud Run**
- 常時稼働設定（min-instances: 1）
- 自動スケーリング
- コンテナベース

**その他: VPS・Railway・Render等**
- 軽量VPS（さくらVPS、ConoHa等）
- PaaS（Railway、Render等）

### デプロイ手順

1. **Cloud Functionsにwebhook.tsをデプロイ**
   ```bash
   # webhook.tsの内容をベースにCloud Function作成
   # Express.jsアプリケーションとしてデプロイ
   ```

2. **Discord Botを常時稼働サーバーにデプロイ**
   ```bash
   # Cloud Run、VPS、またはPaaSにindex.tsをデプロイ
   # 24/7稼働設定を有効化
   ```

3. **環境変数を本番用に変更**
   ```env
   RELAY_SERVER_URL=https://us-central1-your-project.cloudfunctions.net/invoice-webhook
   ```

### 段階的移行手順

1. **開発環境での動作確認**
   - Local Relay Server + Mock GAS
   - 全機能のテスト実行

2. **本番GAS環境の準備**
   - GAS Webhook URLの取得
   - データ形式の確認

3. **Cloud Functionsデプロイ**
   - webhook.tsベースの関数作成
   - 環境変数設定（GAS_WEBHOOK_URL）

4. **Discord Bot本番デプロイ**
   - Cloud Run/VPS等に index.ts をデプロイ
   - 常時稼働設定を有効化
   - 環境変数設定（RELAY_SERVER_URL）

5. **本番環境切り替え完了**
   - ローカル環境（`pnpm start`）を停止
   - 本番環境で稼働開始
   - Discord での動作確認


### 環境別の特徴

| 環境 | Relay Server | GAS接続 | 用途 |
|------|---------------|---------|------|
| 開発 | Local (port 3000) | Mock/Test | 開発・テスト |
| 本番 | Cloud Functions | Production | 運用 |

## 📊 ログ確認

**Discord Bot ログ:**
- コマンド実行ログ
- モーダル送信ログ
- Relay Server送信ログ

**Relay Server ログ:**
- データ受信ログ
- GAS転送ログ
- レスポンス確認ログ

## ⚠️ 注意事項

### Discord API制限
- モーダルは最大5フィールドまで
- インタラクション応答は3秒以内
- Ephemeralメッセージは他ユーザーには非表示

### エラーハンドリング
- GAS応答遅延による`Unknown interaction`エラー対策済み
- 非同期処理によるタイムアウト回避
- 詳細なエラーログ出力

### 本番環境での考慮事項

**重要な違い:**
- **Discord Botの稼働場所**
  - 開発環境: ローカルPC（`pnpm start`）
  - 本番環境: Cloud Run/VPS等で24/7稼働
- **Relay Serverの稼働場所**
  - 開発環境: ローカルPC（`pnpm run webhook`）
  - 本番環境: Cloud Functions
- **環境切り替え方法**
  - RELAY_SERVER_URL の変更のみ
  - コード変更は不要
- **Bot招待**
  - 同一Bot使用なら1回のみ
  - 開発・本番で継続利用可能

## 🔗 関連リンク

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/applications)
- [Google Apps Script](https://script.google.com/)

## 📝 ライセンス

ISC License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

---

**開発者:** takuma531zov
**作成日:** 2025-07-12
  環境分岐

  - 開発環境（Vercel）: VERCEL_ENVが存在する場合
  - 本番環境（Cloudflare）: VERCEL_ENVが存在しない場合

  開発環境の動作

  1. 同期処理: GAS送信を2秒タイムアウトで実行
  2. 一律成功メッセージ: 成功/失敗に関わらず成功メッセージを返す
  3. メッセージ削除スキップ: Vercelの制約によりスキップ
  4. トークに残す: flags: 64なしで通常メッセージとして残す

  本番環境の動作

  1. Follow-up API: 処理中メッセージ → 結果通知の2段階
  2. 5秒タイムアウト: 十分な処理時間
  3. 正確な結果通知: 実際の成功/失敗を報告
  4. メッセージ削除: 途中メッセージを削除してから最終メッセージ送信

  主要関数

  - sendToGAS(): 環境に応じたタイムアウト設定でGAS送信
  - deleteIntermediateMessages(): メッセージ削除（本番環境のみ）
  - sendFollowupMessage(): Follow-up API（ephemeral設定可能）
  - handleDataSubmission(): メイン処理ロジック
