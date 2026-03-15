---
name: knowledge-base
description: "事前知識空間の管理。リサーチ結果をindex化して蓄積し、エージェントが自発的に関連知識を選択・ロードする。トリガー: (1)「リサーチして知識ベースに保存」「事前に調べて」(2)「知識ベースから探して」「事前知識を参照」(3)既存ドキュメントを知識ベースに取り込みたい時"
---

# knowledge-base

## 重要: 知識の粒度

知識ベースの価値は **小粒な参考資料が複数indexされている状態** にある。1つの巨大な記事ではない。

```
❌ 悪い: 「認証」で1本の巨大記事
✅ 良い: 以下のように分解して複数記事にする
   - oauth2-pkce-overview.md        ← PKCEの基本概念
   - oauth2-token-storage.md        ← トークンストレージ戦略比較
   - session-vs-jwt.md              ← Session vs JWT
   - auth-middleware-compliance.md   ← 法務要件との関係
```

大きなトピックのリサーチを依頼された場合:
1. トピックを3-7個の小さな観点に分解する
2. 各観点ごとにresearch.pyを実行する（1観点 = 1記事）
3. エージェントがタスクに応じて必要な記事だけ選んで読める状態にする

3つのモードで使い分ける:

| モード | トリガー | 実行内容 |
|--------|---------|---------|
| **リサーチ** | 「調べて保存して」「事前に調べて」 | research.py → index-manager.ts add |
| **取り込み** | 既存ドキュメントを知識ベースに入れたい時 | import-doc.ts（INDEX自動更新） |
| **参照** | タスク着手前 | INDEX.md読み → 関連記事のみロード |

保存先: `docs/knowledge/articles/`、INDEX: `docs/knowledge/INDEX.md`

---

## リサーチ → 保存

Perplexity API（検索機能付きLLM）でトピックをリサーチし知識ベースに保存する。
クエリ設計・タグ・品質基準の詳細は [references/research-guide.md](references/research-guide.md) を参照。

**前提条件**: research.pyは `OPENROUTER_API_KEY` が必要。リサーチ実行前に `~/.claude/skills/knowledge-base/.env` を確認すること。

未設定の場合、ユーザーにAPIキーの設定を依頼する:

```bash
# ユーザーから提供されたAPIキーを保存
echo 'OPENROUTER_API_KEY=sk-or-...' >> ~/.claude/skills/knowledge-base/.env
```

APIキーがない場合でも **取り込み・参照モードは使用可能**。リサーチのみ制限される。

```bash
# 1. リサーチ実行（slug は英語で明示指定すること）
uv run ~/.claude/skills/knowledge-base/scripts/research.py \
  "具体的なクエリ" \
  --output docs/knowledge/articles/<slug>.md \
  --tags "tag1,tag2"

# 2. INDEXに追加（stdoutに出力されたパスを使用）
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts add docs/knowledge/articles/<slug>.md
```

## 既存ドキュメントの取り込み

```bash
bun run ~/.claude/skills/knowledge-base/scripts/import-doc.ts <source.md> \
  [--title "タイトル"] \
  [--summary "1行要約"] \
  [--tags "tag1,tag2"]
```

- `docs/knowledge/articles/` にフロントマター付きでコピーし、INDEX自動更新
- 元ファイルは変更しない（非破壊）
- summaryは具体的に書くこと（[research-guide.md](references/research-guide.md) 参照）

## 知識の参照

INDEX.mdはインテントINDEXデータベースとして機能する。コンテキストが圧縮されても、INDEX.mdを1回読むだけでプロジェクトの知識空間全体を把握し、必要な知識を自発的に選択できる。

タスク着手前に以下を実行:

1. `docs/knowledge/INDEX.md` を読む（タイトル+要約テーブルのみ、軽量）
2. タスクに関連する記事IDを特定する
3. `docs/knowledge/articles/<id>.md` を読んでからタスクに着手する
   - 関連記事が0件なら何もロードせず着手（無理に探さない）
   - 関連記事が多い場合は1-3件に絞る

キーワード検索も可能:

```bash
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts search "キーワード"
```

---

## INDEX管理

```bash
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts add <article.md>
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts remove <id>
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts rebuild
bun run ~/.claude/skills/knowledge-base/scripts/index-manager.ts search <keyword>
```

すべてデフォルトで `docs/knowledge/` を対象とする。`--index <path>` `--dir <path>` で変更可能。

## セットアップ

```bash
cd ~/.claude/skills/knowledge-base && bun install
```
