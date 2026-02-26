import os
import re
import glob
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCRIPT_DIR = os.path.abspath(os.path.dirname(__file__))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

CURSOR_IMPORT_ERROR = None
try:
    from cursor_api.cursor_cloud import CursorCloud
except Exception as exc:
    CURSOR_IMPORT_ERROR = exc
    CursorCloud = None

GAME_ROOT = SCRIPT_DIR

index_paths = [
    os.path.join(GAME_ROOT, "index.html"),
    os.path.join(GAME_ROOT, "demo2", "index.html"),
]
index_paths = [p for p in index_paths if os.path.exists(p)]
if not index_paths:
    index_paths = glob.glob(os.path.join(GAME_ROOT, "**", "index.html"), recursive=True)

results = []

def check(condition, ok_msg, bad_msg):
    results.append((condition, ok_msg, bad_msg))

check(bool(index_paths), "Found index.html", "index.html not found under GAME_ROOT")

index_path = index_paths[0] if index_paths else None
script_files = []

if index_path:
    with open(index_path, "r", encoding="utf-8") as f:
        index_html = f.read()
    srcs = re.findall(r'src=["\']([^"\']+)["\']', index_html)
    base_dir = os.path.dirname(index_path)
    for src in srcs:
        if src.startswith(("http://", "https://")):
            script_files.append((src, True))
        else:
            script_path = os.path.normpath(os.path.join(base_dir, src))
            script_files.append((script_path, os.path.exists(script_path)))

    check(any("phaser" in s for s in srcs), "Phaser script referenced", "Phaser script not referenced in index.html")
    check(any("main.js" in s for s in srcs), "main.js referenced", "main.js not referenced in index.html")

missing_scripts = [p for p, ok in script_files if not ok]
check(len(missing_scripts) == 0, "All local scripts exist", f"Missing scripts: {missing_scripts}")

main_js_path = None
for p, ok in script_files:
    if ok and isinstance(p, str) and p.endswith("main.js") and os.path.exists(p):
        main_js_path = p
        break

if main_js_path:
    with open(main_js_path, "r", encoding="utf-8") as f:
        main_js = f.read()
    check("BootScene" in main_js, "BootScene found", "BootScene not found in main.js")
    check("MainScene" in main_js, "MainScene found", "MainScene not found in main.js")
    check("GameOverScene" in main_js, "GameOverScene found", "GameOverScene not found in main.js")
else:
    check(False, "main.js resolved", "main.js path could not be resolved")

def build_fix_prompt(failed_items, index_path_value, script_candidates):
    failed_text = "\n".join(f"- {item}" for item in failed_items)
    candidates_text = "\n".join(f"- {item}" for item in script_candidates)
    return (
        "请自动修复当前项目并满足自检要求。\n"
        "要求：\n"
        "1) 修复失败项；\n"
        "2) 只做最小必要修改；\n"
        "3) 修复后重新运行 `python check_game.py` 并确保 Self-test passed；\n"
        "4) 输出修改文件与原因。\n\n"
        f"失败项：\n{failed_text}\n\n"
        f"index.html: {index_path_value}\n"
        f"候选脚本文件：\n{candidates_text}\n"
    )

failed = [bad for ok, _, bad in results if not ok]
for ok, good, bad in results:
    print(("PASS: " + good) if ok else ("FAIL: " + bad))

if failed:
    script_candidates = sorted(glob.glob(os.path.join(GAME_ROOT, "**", "*.js"), recursive=True))
    followup_prompt = build_fix_prompt(
        failed_items=failed,
        index_path_value=index_path or "N/A",
        script_candidates=script_candidates,
    )

    agent_id = os.environ.get("CURSOR_AGENT_ID")
    api_key = os.environ.get("CURSOR_API_KEY")
    if CursorCloud and agent_id and api_key:
        try:
            CursorCloud().send_followup(agent_id, followup_prompt)
            print("Sent auto-fix task to Cursor agent")
        except Exception as exc:
            print("WARN: send_followup failed:", exc)
            fallback_path = os.path.join(SCRIPT_DIR, "cursor_agent_followup.txt")
            with open(fallback_path, "w", encoding="utf-8") as f:
                f.write(followup_prompt)
            print(f"WARN: saved followup prompt to {fallback_path}")
            print("DEBUG: CURSOR_AGENT_ID set:", bool(agent_id))
            print("DEBUG: CURSOR_API_KEY set:", bool(api_key))
            print("DEBUG: CursorCloud available:", bool(CursorCloud))
    else:
        fallback_path = os.path.join(SCRIPT_DIR, "cursor_agent_followup.txt")
        with open(fallback_path, "w", encoding="utf-8") as f:
            f.write(followup_prompt)
        print("WARN: auto-followup not sent. Saved prompt for cursor_agent.")
        print(f"WARN: prompt file: {fallback_path}")
        print("DEBUG: CURSOR_AGENT_ID set:", bool(agent_id))
        print("DEBUG: CURSOR_API_KEY set:", bool(api_key))
        print("DEBUG: CursorCloud available:", bool(CursorCloud))
        if CURSOR_IMPORT_ERROR:
            print("DEBUG: CursorCloud import error:", repr(CURSOR_IMPORT_ERROR))
    raise SystemExit("Self-test failed")

print("Self-test passed")