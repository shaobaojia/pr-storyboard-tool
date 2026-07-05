#!/usr/bin/env python3
"""双击运行或拖拽 _frames.json 到本文件即可。
没有 _frames.json 时，默认读取 D:\screenshots\_frames.json"""
import json, subprocess, sys, os

json_path = sys.argv[1] if len(sys.argv) > 1 else r"D:\screenshots\_frames.json"
if not os.path.exists(json_path):
    input(f"找不到 {json_path}\n请先在 PR 面板点「导出截图 (FFmpeg)」\n按回车退出")
    sys.exit(1)

with open(json_path, "r", encoding="gbk") as f:
    items = json.load(f)

print(f"共 {len(items)} 帧，开始导出...")
ok = fail = 0

for i, item in enumerate(items, 1):
    out_dir = os.path.dirname(item["outputPath"])
    os.makedirs(out_dir, exist_ok=True)
    cmd = f'ffmpeg -y -ss {item["sourceTime"]} -i "{item["sourceFile"]}" -vframes 1 "{item["outputPath"]}" -loglevel error'
    r = subprocess.run(cmd, shell=True, capture_output=True)
    if r.returncode == 0:
        ok += 1
        if ok % 10 == 0: print(f"{ok}/{len(items)}")
    else:
        fail += 1
        print(f"[{i}] {item['name']} 失败: {r.stderr.decode('gbk','ignore')[:80]}")

print(f"\n完成: {ok} 成功, {fail} 失败")
input("按回车关闭")
