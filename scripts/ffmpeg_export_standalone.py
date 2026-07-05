"""双击「导出截图.bat」即可运行。
读取同目录下的 _frames.json，用 ffmpeg 批量截帧。"""
import json, subprocess, os, sys

FFMPEG = os.path.expandvars(
    r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe")
JSON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_frames.json")

if not os.path.exists(JSON):
    msg = f"[错误] 找不到 {JSON}\n請先在 PR 面板點「導出截圖 (FFmpeg)」"
    print(msg)
    if sys.stdin.isatty():
        input("按回车退出")
    exit(1)

with open(JSON, "r", encoding="gbk") as f:
    items = json.load(f)

print(f"共 {len(items)} 帧，开始...")
ok = 0; fail = 0

for i, item in enumerate(items, 1):
    d = os.path.dirname(item["outputPath"])
    os.makedirs(d, exist_ok=True)
    cmd = [FFMPEG, "-y", "-ss", str(item["sourceTime"]), "-i", item["sourceFile"],
           "-vframes", "1", item["outputPath"], "-loglevel", "error"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode == 0:
        ok += 1
        if ok % 10 == 0 or i == len(items):
            print(f"  {i}/{len(items)} (ok={ok})")
    else:
        fail += 1
        print(f"  [{i}] {item['name']} 失败")

total_time = (ok+fail) * 0.3  # rough estimate
print(f"\n完成: {ok} 成功, {fail} 失败 (约 {total_time:.1f}s)")
if sys.stdin.isatty():
    input("按回车关闭")
