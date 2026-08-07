#!/usr/bin/env python3
"""
Claude Code セッションログ解析スクリプト
~/.claude/projects/ 以下のJSONLファイルを解析して作業内容をJSONで出力する

使い方:
  python3 extract_logs.py --days 0          # 今日
  python3 extract_logs.py --days 1          # 昨日
  python3 extract_logs.py --days 7          # 過去7日間
  python3 extract_logs.py --start 2026-04-14 --end 2026-04-14  # 日付指定
  python3 extract_logs.py --days 0 --project ai-coach          # プロジェクト絞り込み
"""

import json
import sys
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path


def get_date_range(days_back=None, start=None, end=None):
    now = datetime.now(timezone.utc)

    if start and end:
        start_dt = datetime.fromisoformat(f"{start}T00:00:00+00:00")
        end_dt = datetime.fromisoformat(f"{end}T23:59:59+00:00")
    elif days_back is not None:
        if days_back == 0:
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
        elif days_back == 1:
            yesterday = now - timedelta(days=1)
            start_dt = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = yesterday.replace(hour=23, minute=59, second=59, microsecond=0)
        else:
            start_dt = (now - timedelta(days=days_back)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end_dt = now
    else:
        # デフォルト: 今日
        start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now

    return start_dt, end_dt


def extract_text(content):
    """content フィールドからプレーンテキストを抽出（最大500文字）"""
    if isinstance(content, str):
        return content[:500]
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", "")[:500])
            elif isinstance(item, str):
                parts.append(item[:500])
        return " ".join(p for p in parts if p)[:600]
    return ""


def extract_tools(content):
    """アシスタントのcontentからツール使用一覧を抽出"""
    tools = []
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "tool_use":
                name = item.get("name", "")
                if name:
                    tools.append(name)
    return tools


def is_system_message(text):
    """システムメッセージや内部コマンドをフィルタ"""
    if not text or len(text) < 4:
        return True
    prefixes = ("<", "[", "Tool loaded", "Task #", "Updated task")
    return any(text.startswith(p) for p in prefixes)


def parse_session(jsonl_path: Path, start_dt: datetime, end_dt: datetime, project_name: str):
    messages = []
    all_tools = []
    session_id = None
    slug = None
    cwd = None
    first_ts = None
    last_ts = None

    try:
        with open(jsonl_path, encoding="utf-8", errors="ignore") as f:
            for raw in f:
                raw = raw.strip()
                if not raw:
                    continue
                try:
                    e = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                ts_str = e.get("timestamp")
                if not ts_str:
                    continue

                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except ValueError:
                    continue

                if ts < start_dt or ts > end_dt:
                    continue

                # セッションメタ
                session_id = e.get("sessionId", session_id)
                slug = e.get("slug", slug)
                cwd = e.get("cwd", cwd)
                if first_ts is None:
                    first_ts = ts
                last_ts = ts

                etype = e.get("type")

                if etype == "user":
                    msg = e.get("message", {})
                    if msg.get("role") == "user":
                        text = extract_text(msg.get("content", ""))
                        if not is_system_message(text):
                            messages.append({"role": "user", "text": text, "ts": ts_str})

                elif etype == "assistant":
                    msg = e.get("message", {})
                    if msg.get("role") == "assistant":
                        content = msg.get("content", [])
                        text = extract_text(content)
                        tools = extract_tools(content)
                        all_tools.extend(tools)
                        if text and not is_system_message(text):
                            messages.append({
                                "role": "assistant",
                                "text": text,
                                "tools": tools,
                                "ts": ts_str,
                            })

    except Exception:
        return None

    if not messages:
        return None

    # ツール使用頻度集計
    tool_counts: dict[str, int] = {}
    for t in all_tools:
        tool_counts[t] = tool_counts.get(t, 0) + 1
    top_tools = sorted(tool_counts.items(), key=lambda x: -x[1])[:15]

    # セッション時間
    duration_min = None
    if first_ts and last_ts:
        duration_min = round((last_ts - first_ts).total_seconds() / 60, 1)

    return {
        "session_id": session_id,
        "slug": slug,
        "project": project_name,
        "cwd": cwd,
        "start_time": first_ts.isoformat() if first_ts else None,
        "end_time": last_ts.isoformat() if last_ts else None,
        "duration_minutes": duration_min,
        "message_count": len(messages),
        "top_tools": top_tools,
        # 多すぎる場合は最初と最後のメッセージ群を優先して保持
        "messages": messages[:30] if len(messages) <= 30 else messages[:15] + messages[-10:],
    }


def main():
    parser = argparse.ArgumentParser(description="Claude Code セッションログ解析")
    parser.add_argument("--days", type=int, default=None, help="過去N日間 (0=今日, 1=昨日, 7=先週)")
    parser.add_argument("--start", help="開始日 YYYY-MM-DD")
    parser.add_argument("--end", help="終了日 YYYY-MM-DD")
    parser.add_argument("--project", help="プロジェクト名フィルタ（部分一致）")
    args = parser.parse_args()

    start_dt, end_dt = get_date_range(days_back=args.days, start=args.start, end=args.end)

    projects_dir = Path.home() / ".claude" / "projects"
    sessions = []

    for project_dir in sorted(projects_dir.iterdir()):
        if not project_dir.is_dir():
            continue

        project_name = project_dir.name
        if args.project and args.project.lower() not in project_name.lower():
            continue

        for jsonl_file in project_dir.glob("*.jsonl"):
            # ファイルの更新時刻で事前スキップ（高速化）
            try:
                mtime = jsonl_file.stat().st_mtime
                file_mtime_dt = datetime.fromtimestamp(mtime, tz=timezone.utc)
                if file_mtime_dt < start_dt:
                    continue
            except Exception:
                pass

            session = parse_session(jsonl_file, start_dt, end_dt, project_name)
            if session:
                sessions.append(session)

    sessions.sort(key=lambda s: s.get("start_time") or "")

    # プロジェクト別集計
    project_summary: dict[str, dict] = {}
    for s in sessions:
        p = s["project"]
        if p not in project_summary:
            project_summary[p] = {"sessions": 0, "tools": {}, "cwd": s.get("cwd")}
        project_summary[p]["sessions"] += 1
        for tool, cnt in s.get("top_tools", []):
            project_summary[p]["tools"][tool] = (
                project_summary[p]["tools"].get(tool, 0) + cnt
            )

    # 全体のツール集計
    global_tools: dict[str, int] = {}
    for s in sessions:
        for tool, cnt in s.get("top_tools", []):
            global_tools[tool] = global_tools.get(tool, 0) + cnt

    result = {
        "period": {
            "start": start_dt.isoformat(),
            "end": end_dt.isoformat(),
        },
        "session_count": len(sessions),
        "global_top_tools": sorted(global_tools.items(), key=lambda x: -x[1])[:15],
        "project_summary": {
            p: {
                "sessions": d["sessions"],
                "cwd": d["cwd"],
                "top_tools": sorted(d["tools"].items(), key=lambda x: -x[1])[:10],
            }
            for p, d in project_summary.items()
        },
        "sessions": sessions,
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
