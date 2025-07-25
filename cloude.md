# Discord請求書Bot 連携モーダル入力（複数回フォーム）設計ドキュメント

## 目的
Discordモーダルは最大5フィールドまでの制限があり、請求書登録に必要な項目数が多いため、
2回のモーダル入力に分割し、1回目の入力データを`custom_id`にエンコードして引き継ぎ、
2回目入力時に統合したデータを最終的にスプレッドシートに送信する。

---

## 入力フォーム仕様

### 1回目モーダル（基本情報 + 請求日・請求書番号など）
- 請求日（必須）
- 請求書番号（必須）
- 顧客名
- 件名

※ 入金締切日はサーバー側で請求日の翌月最終営業日を自動計算（ユーザー入力なし）

### 2回目モーダル（摘要・数量・単価の複数項目 + 備考）
- 摘要（カンマ区切り複数入力可）
- 数量（カンマ区切り複数入力可）
- 単価（カンマ区切り複数入力可）
- 備考（任意）

---

## 連携の流れ

1. ユーザーがDiscordで `/invoice` コマンドを実行
2. Botが1回目モーダルを表示
3. ユーザーが1回目モーダルを送信 → Botが1回目データを検証し、エンコードして`custom_id`に含めて2回目モーダルを表示
4. ユーザーが2回目モーダルを送信 → Botが`custom_id`から1回目データをデコードし、2回目データと統合
5. 請求日から入金締切日を計算
6. 統合データをスプレッドシートに送信（生成ステータスは「未生成」で初期化）
7. 完了メッセージをユーザーに送信

---

## 技術的ポイント

- **`custom_id`へのデータ格納制限**
  - Discordの`custom_id`は最大512バイト（UTF-8エンコード後）まで
  - 入力文字数が多い場合はBase64エンコード＋URLエンコードなどで圧縮を工夫するか、
    もしくはサーバー側の一時保存（キャッシュやDB）にIDのみを格納して渡す設計も検討する

- **入金締切日の計算ロジック**
  - 請求日（例: 2025-07-06）から翌月の最終営業日を算出
  - 営業日は土日祝除くため、祝日はAPIや定義ファイルで管理推奨
  - 簡易的には「翌月の最終日が土日なら前営業日に繰り上げる」処理を実装

- **スプレッドシートの列追加**
  - 生成ステータス（プルダウン: 未生成, 生成済み。初期値は未生成） X列
  - 摘要（複数カンマ区切り）Y列
  - 数量（複数カンマ区切り）Z列
  - 単価（複数カンマ区切り）AA列
  - 備考 列は既存のまま or 必要あれば追加可能

---

## 例：custom_idに含めるエンコード例

```ts
// 1回目データをJSON文字列化
const jsonStr = JSON.stringify({
  請求日: '2025-07-06',
  請求書番号: 'INV-001',
  顧客名: '株式会社サンプル',
  件名: '7月分請求書',
});

// Base64エンコードしURLセーフに変換
const base64 = Buffer.from(jsonStr).toString('base64');
const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// これをcustom_idに含めて2回目モーダル表示時にデコードする
**注意**
インフラに関するコードは変えないこと
開発環境は開発終了まで変えるつもりはありません
