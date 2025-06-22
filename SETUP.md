# 漫画ネーム生成アプリ - セットアップガイド

## 概要

このアプリケーションは以下のAPIサービスを使用して漫画のネーム（設計図）を自動生成します：

- **Dify**: ワークフローベースのAI処理（必須）
- **OpenAI**: テキスト生成と後処理（必須）

## 🔧 必要な設定

### 1. 環境変数ファイルの作成

```bash
# セキュアな設定ファイルをコピー
cp .env.local.example .env.local
```

### 2. APIキーの取得と設定

#### OpenAI API設定

1. [OpenAI Platform](https://platform.openai.com/)にアクセス
2. API Keysページで新しいAPIキーを生成
3. `.env.local`に設定：

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
```

#### Dify API設定

1. [Dify](https://dify.ai/)にアクセス・アカウント作成
2. 以下のワークフローを作成：

##### Flow1: シーン分割ワークフロー
- **目的**: ユーザー入力 → シーン分割
- **入力**: `user_input` (string)
- **出力**: JSON形式のシーン情報

```json
{
  "scene": [
    {
      "pagesNum": 1,
      "contents": [
        {
          "page": 1,
          "elements": ["introduction", "stimulation"],
          "characterEmotions": ["happy", "surprise"],
          "text": "ページのテキスト",
          "concept": "ページの概念",
          "place": "場所設定"
        }
      ],
      "isExcitement": 0
    }
  ]
}
```

##### Flow2: コマワリワークフロー
- **目的**: ページデータ → コマワリ生成
- **入力**: 
  - `page_data` (string): JSON文字列
  - `page_number` (number)
  - `elements` (string): カンマ区切り
  - `emotions` (string): カンマ区切り
  - `text` (string)
  - `concept` (string)
  - `place` (string)
- **出力**: JSON形式のパネル情報

```json
{
  "panels": [
    {
      "index": 1,
      "description": "パネルの説明",
      "type": ["event", "situation"]
    }
  ],
  "page": 1,
  "instructions": "描画指示"
}
```

3. ワークフローIDとAPIキーを`.env.local`に設定：

```bash
DIFY_API_KEY=dify-xxxxxxxxxxxxxxxx
DIFY_FLOW1_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIFY_FLOW2_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3. 設定例

完成した`.env.local`ファイルの例：

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx

# Dify Configuration
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=dify-xxxxxxxxxxxxxxxx
DIFY_FLOW1_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DIFY_FLOW2_WORKFLOW_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Development settings (optional)
# USE_MOCK_DIFY=false
# USE_OPENAI_POSTPROCESS=true
```

## 🚀 アプリケーションの起動

### 開発環境での起動

```bash
# 依存関係のインストール
npm run install:all

# 開発サーバーの起動
npm run dev
```

### 設定の確認

アプリケーション起動時に以下のようなログが表示されます：

```
📁 Loaded environment file: .env.local
📁 Loaded environment file: .env
🔧 Current configuration:
  - OpenAI API: ✅ Configured
  - Dify API: ✅ Configured
  - Environment: development

🚀 Server running on port 3001
📡 API available at http://localhost:3001/api
```

## 🔍 トラブルシューティング

### API設定に関する問題

#### 「Missing required environment variables」エラー

```bash
❌ Missing required environment variables:
  - OPENAI_API_KEY (OpenAI API key for AI processing)
  - DIFY_API_KEY (Dify API key for workflow processing)
```

**解決方法**: `.env.local`ファイルに正しいAPIキーが設定されているか確認

#### 「Dify configuration is incomplete」エラー

**解決方法**: 
1. DifyワークフローIDが正しく設定されているか確認
2. ワークフローが公開されているか確認
3. APIキーに正しい権限があるか確認

### 開発時のモック使用

API設定が不完全な場合、モックモードでテストできます：

```bash
# .env.local に追加
USE_MOCK_DIFY=true
```

## 📚 API仕様詳細

### Dify Flow1 (シーン分割) 仕様

**エンドポイント**: `POST /workflows/run`

**リクエスト**:
```json
{
  "inputs": {
    "user_input": "物語のテキスト"
  },
  "response_mode": "blocking",
  "user": "user-001",
  "workflow_id": "DIFY_FLOW1_WORKFLOW_ID"
}
```

**期待されるレスポンス**:
```json
{
  "data": {
    "outputs": {
      "scene": [...]
    }
  }
}
```

### Dify Flow2 (コマワリ) 仕様

**リクエスト**:
```json
{
  "inputs": {
    "page_data": "{...}",
    "page_number": 1,
    "elements": "introduction,stimulation",
    "emotions": "happy,surprise",
    "text": "ページテキスト",
    "concept": "ページ概念",
    "place": "場所"
  },
  "response_mode": "blocking",
  "user": "user-001", 
  "workflow_id": "DIFY_FLOW2_WORKFLOW_ID"
}
```

## 🔒 セキュリティ

- `.env.local`ファイルはGitにコミットされません
- APIキーは環境変数として安全に管理されます
- 本番環境では必須の環境変数が不足している場合、アプリケーションが起動しません

## 📞 サポート

問題が発生した場合は、アプリケーション起動時のログを確認し、環境変数の設定を見直してください。