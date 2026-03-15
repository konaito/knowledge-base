#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "requests",
#   "python-dotenv",
# ]
# ///

import os
import sys
import argparse
import requests
import json
import re
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

SKILL_DIR = Path(__file__).resolve().parent.parent
SKILL_ENV = SKILL_DIR / ".env"

# スキルディレクトリの.envから読み込み（プロジェクトの.envには置かない）
load_dotenv(SKILL_ENV)

API_KEY = os.getenv("OPENROUTER_API_KEY")
if not API_KEY:
    print("エラー: OPENROUTER_API_KEY が設定されていません", file=sys.stderr)
    print(f"  {SKILL_ENV} に以下を追加してください:", file=sys.stderr)
    print("  OPENROUTER_API_KEY=sk-or-...", file=sys.stderr)
    sys.exit(1)

MODEL = "perplexity/sonar-pro"

TEMPLATE_PATH = Path.home() / ".claude/skills/prior-knowledge-skill/references/article-template.md"


def slugify(text: str) -> str:
    text = text.lower().strip()
    # Keep Unicode word chars (CJK, etc)
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80].strip("-") or "untitled"


def research(query: str, output: str | None, tags: list[str]) -> None:
    print(f"リサーチ中: {query}", file=sys.stderr)

    enhanced_query = f"""以下のトピックについて、英語と日本語を含む複数の言語の情報源を徹底的に検索し、ディープリサーチしてください。

## 出力要件

1. **構造**: 技術リファレンスドキュメントとして構造化する
   - `## 概要` — トピックの定義と重要性（3-5文）
   - `## 核心概念` — 最も重要な概念・原則を解説
   - `## 実践的知見` — 具体例、コードサンプル、ベストプラクティス
   - `## 比較・トレードオフ` — 代替手段との比較、メリット・デメリット
   - `## 注意点・落とし穴` — よくある間違い、アンチパターン
   - 該当しないセクションは省略可

2. **品質基準**:
   - 表面的な説明ではなく、**なぜそうなのか**の理由まで掘り下げる
   - 一般論ではなく、**具体的な数値・事例・コード**を含める
   - 複数の情報源をクロスリファレンスし、矛盾があれば明記する
   - 2024年以降の最新情報を優先する

3. **言語**: 必ず日本語で書く。技術用語は原語を括弧内に併記（例: 依存性注入（Dependency Injection））

トピック: {query}"""

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/user/prior-knowledge-skill",
            "X-Title": "Knowledge Base Research",
        },
        json={
            "model": MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "あなたは技術リサーチの専門家です。英語と日本語を含む複数の言語の情報源を徹底的に検索し、AIエージェントが後で参照する技術リファレンスドキュメントを作成します。表面的な要約ではなく、実務で使える深い知見を提供してください。必ず日本語で回答してください。",
                },
                {"role": "user", "content": enhanced_query},
            ],
        },
    )

    if response.status_code != 200:
        print(f"APIエラー: {response.status_code}", file=sys.stderr)
        print(response.text, file=sys.stderr)
        sys.exit(1)

    result = response.json()
    content = result["choices"][0]["message"]["content"]
    citations = result.get("citations", [])

    # Determine output path
    if output:
        out_path = Path(output)
    else:
        slug = slugify(query)
        out_path = Path.cwd() / f"docs/knowledge/articles/{slug}.md"

    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Build sources list
    sources = citations if citations else []

    today = datetime.now().strftime("%Y-%m-%d")

    # Build frontmatter + content
    frontmatter = f"""---
title: "{query}"
summary: "{query}に関するリサーチ結果"
tags: [{", ".join(f'"{t}"' for t in tags)}]
sources: [{", ".join(f'"{s}"' for s in sources)}]
created: {today}
updated: {today}
---"""

    full_content = f"{frontmatter}\n\n{content}\n"

    if sources:
        full_content += "\n## 情報源\n\n"
        for i, src in enumerate(sources, 1):
            full_content += f"{i}. {src}\n"

    out_path.write_text(full_content, encoding="utf-8")

    # Output path for agent to use with index-manager
    print(str(out_path))
    print(f"保存完了: {out_path}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="Perplexity APIでディープリサーチ")
    parser.add_argument("query", help="リサーチクエリ")
    parser.add_argument("--output", "-o", help="出力ファイルパス")
    parser.add_argument("--tags", "-t", default="", help="カンマ区切りタグ")

    args = parser.parse_args()
    tags = [t.strip() for t in args.tags.split(",") if t.strip()] if args.tags else []

    research(args.query, args.output, tags)


if __name__ == "__main__":
    main()
