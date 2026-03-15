# knowledge-base

**AIエージェントのための事前知識空間** — Claude Code Skill

## なぜこのスキルが必要か

AIエージェントの出力品質は、タスクに取り組む前に何を知っているかで決まる。

しかし、全ての知識をコンテキストウィンドウに載せることはできない。コンテキストはトークンという有限資源であり、知識を詰め込めば詰め込むほど、エージェントが実際の作業に使える余白が減る。

このスキルはこの矛盾を **INDEX パターン** で解決する:

```
┌─────────────────────────────────────────┐
│  コンテキストウィンドウ                      │
│                                          │
│  ┌──────────────────┐                    │
│  │ INDEX.md (~数百トークン)│ ← 常にロード     │
│  │ タイトル | 要約 | タグ │                  │
│  └──────────────────┘                    │
│           │                              │
│           │ 関連記事のみ選択的にロード         │
│           ▼                              │
│  ┌──────────────────┐                    │
│  │ article-a.md     │ ← 必要な時だけ        │
│  └──────────────────┘                    │
│                                          │
│  残りのコンテキスト → 実際のタスクに使える       │
└─────────────────────────────────────────┘
```

INDEXは軽量なテーブル（タイトル + 1行要約）なので、数十件の知識があってもコンテキストへの負荷は最小限。エージェントはINDEXだけ見て「このタスクに関連する知識はあるか？」を判断し、必要な記事だけをロードする。

## 設計思想

### 1. 知識の粒度 — 小さな参考資料の集合体

知識ベースの本質は **1つの巨大なリサーチ結果** ではなく、**小粒な参考資料が複数indexされている状態** にある。

```
❌ こうなってはいけない:
INDEX.md
└── authentication.md  (5000行の巨大記事)

✅ こうあるべき:
INDEX.md
├── oauth2-pkce-overview.md         ← PKCEの基本概念
├── oauth2-token-storage.md         ← トークンストレージ戦略比較
├── session-vs-jwt.md               ← Session vs JWT
├── auth-middleware-compliance.md   ← 法務要件との関係
└── nextauth-v5-migration.md        ← NextAuth v5移行の注意点
```

エージェントが認証トークンの保存方法で迷ったとき、5000行の巨大記事をロードするのではなく、`oauth2-token-storage.md` だけをピンポイントでロードする。これがINDEXパターンの真価。

大きなトピックをリサーチする場合は、まず3-7個の小さな観点に分解し、各々を独立した記事として保存する。

### 2. プロジェクトローカル — グローバルに置かない理由

知識は `docs/knowledge/` にプロジェクト単位で保存する。グローバルな知識ストアは持たない。

理由: LLMが既に持っている汎用知識（React の基本、HTTP の仕組み等）をわざわざ保存する価値はない。保存する価値があるのは **プロジェクト固有のリサーチ結果** — ドメイン知識、アーキテクチャ決定の背景、特定ライブラリの落とし穴など、LLMの訓練データに含まれない知見。

プロジェクトローカルにすることで、git管理され、チームで共有でき、プロジェクトと一緒に消える。

### 3. 非同期リサーチ

リサーチには Perplexity API（OpenRouter経由）を使う。エージェント自身がリサーチを回すのではなく、検索特化のLLMに委任する非同期モデル。

```
エージェント                    Perplexity API
    │                              │
    │  クエリ設計 (具体的に)          │
    │─────────────────────────────▶│
    │                              │ 多言語ソース検索
    │                              │ 情報統合
    │  フロントマター付きMarkdown     │
    │◀─────────────────────────────│
    │                              │
    │  INDEX更新                    │
    │  品質確認                     │
    ▼
```

リサーチの品質はクエリの具体性で決まる。「Reactについて」ではなく「React Server ComponentsのデータフェッチパターンにおけるSuspenseとuse()の使い分けとキャッシュ戦略」のように、観点と制約を明示する。

### 4. Progressive Disclosure

スキル自体もProgressive Disclosureで設計されている:

- **SKILL.md**（~90行）— コアワークフローとスクリプトの使い方のみ
- **references/research-guide.md** — クエリ設計・タグ・品質基準の詳細（必要時のみロード）
- **assets/article-template.md** — 記事のフロントマターテンプレート

## 機能

### リサーチ → 保存

Perplexity APIでトピックをディープリサーチし、フロントマター付きMarkdownとして保存する。

```bash
# リサーチ実行
uv run scripts/research.py \
  "OAuth 2.0 PKCE フローの実装 — SPAにおけるセキュリティ考慮事項" \
  --output docs/knowledge/articles/oauth2-pkce-spa.md \
  --tags "oauth,security,spa"

# INDEXに追加
bun run scripts/index-manager.ts add docs/knowledge/articles/oauth2-pkce-spa.md
```

生成される記事は以下の構造:

```markdown
---
title: "OAuth 2.0 PKCE フローの実装..."
summary: "..."
tags: ["oauth", "security", "spa"]
sources: ["https://...", "https://..."]
created: 2026-03-15
updated: 2026-03-15
---

## 概要
...
## 核心概念
...
## 実践的知見
...
## 比較・トレードオフ
...
## 注意点・落とし穴
...
## 情報源
1. https://...
```

### 既存ドキュメントの取り込み

プロジェクト内の既存Markdownを知識ベースに取り込む。フロントマターを自動付与し、INDEXも自動更新。元ファイルは変更しない。

```bash
bun run scripts/import-doc.ts docs/architecture-decision.md \
  --title "認証基盤のアーキテクチャ決定" \
  --summary "Session vs JWT比較、PKCE採用の経緯、トークンストレージ戦略" \
  --tags "auth,architecture,decision"
```

### INDEX管理

```bash
# 記事をINDEXに追加
bun run scripts/index-manager.ts add <article.md>

# INDEXから削除
bun run scripts/index-manager.ts remove <id>

# articlesディレクトリからINDEX全体を再構築
bun run scripts/index-manager.ts rebuild

# キーワード検索
bun run scripts/index-manager.ts search <keyword>
```

INDEX.mdの中身:

```markdown
# Knowledge Base Index

| id | title | summary | tags | updated |
|----|-------|---------|------|---------|
| oauth2-pkce-spa | OAuth 2.0 PKCE... | SPAにおけるPKCEフロー... | oauth, security, spa | 2026-03-15 |
| auth-architecture | 認証基盤の... | Session vs JWT比較... | auth, architecture | 2026-03-15 |
```

## セットアップ

### 1. スキルのインストール

```bash
# ~/.claude/skills/ にクローン
cd ~/.claude/skills
git clone https://github.com/konaito/knowledge-base.git

# 依存関係インストール
cd knowledge-base && bun install
```

### 2. APIキーの設定（リサーチ機能を使う場合）

```bash
echo 'OPENROUTER_API_KEY=sk-or-...' > ~/.claude/skills/knowledge-base/.env
```

[OpenRouter](https://openrouter.ai) でAPIキーを取得。Perplexity sonar-pro モデルを使用。

APIキーがなくても **取り込み・参照モードは使用可能**。

### 3. CLAUDE.mdに参照指示を追加（推奨）

プロジェクトまたはグローバルのCLAUDE.mdに以下を追加すると、エージェントがタスク着手前に自動的に知識を確認する:

```markdown
# 事前知識空間

タスクに取り組む前に、関連する事前知識がないか確認すること:
1. `docs/knowledge/INDEX.md` が存在すれば読み、関連する知識を特定
2. 関連する記事があれば `docs/knowledge/articles/<id>.md` を読んでからタスクに着手
```

## ファイル構成

```
knowledge-base/
├── SKILL.md                          # スキル本体（エージェントが読む指示書）
├── scripts/
│   ├── index-manager.ts              # INDEX.mdのCRUD操作
│   ├── research.py                   # Perplexity APIでディープリサーチ
│   └── import-doc.ts                 # 既存Markdownの取り込み
├── references/
│   └── research-guide.md             # クエリ設計・タグ・品質基準ガイド
├── assets/
│   └── article-template.md           # 記事フロントマターテンプレート
└── package.json                      # bun依存関係（gray-matter）
```

プロジェクト側に生成されるファイル:

```
<project>/
└── docs/knowledge/
    ├── INDEX.md                      # タイトル+要約テーブル
    └── articles/
        ├── oauth2-pkce-spa.md
        └── auth-architecture.md
```

## 要件

- [bun](https://bun.sh) — TypeScriptスクリプト実行
- [uv](https://docs.astral.sh/uv/) — Pythonスクリプト実行（research.pyのみ）
- [OpenRouter API Key](https://openrouter.ai) — リサーチ機能のみ

## License

MIT
