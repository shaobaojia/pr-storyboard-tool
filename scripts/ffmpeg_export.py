#!/usr/bin/env python3
"""读取 _frames.json，通过 SSH 在 PC 上运行 FFmpeg 截帧。

用法: python3 ffmpeg_export.py <json_path> [--pc PC_IP]
示例: python3 ffmpeg_export.py D:/screenshots/_frames.json
"""
import json, subprocess, sys, os

PC_IP = "192.168.3.71"
PC_USER = "shaobaojia"
SSH_KEY = "/opt/data/home/.ssh/id_ed25519_homepc"

def ssh_cmd(cmd):
    return ["ssh", "-i", SSH_KEY, f"{PC_USER}@{PC_IP}", f"cmd /c {cmd}"]

def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not json_path:
        print("Usage: python3 ffmpeg_export.py <_frames.json>")
        sys.exit(1)

    # Read from PC via SSH
    r = subprocess.run(
        ["ssh", "-i", SSH_KEY, f"{PC_USER}@{PC_IP}", f"cmd /c type {json_path}"],
        capture_output=True, text=True, timeout=10
    )
    if r.returncode != 0:
        print(f"Failed to read {json_path}: {r.stderr}")
        sys.exit(1)

    try:
        items = json.loads(r.stdout)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}")
        sys.exit(1)

    print(f"Found {len(items)} frames to export")

    for i, item in enumerate(items, 1):
        name = item["name"]
        src = item["sourceFile"]
        t = item["sourceTime"]
        out = item["outputPath"]

        # Ensure output dir exists on PC
        out_dir = out.rsplit("\\", 1)[0]
        subprocess.run(ssh_cmd(f'mkdir "{out_dir}" 2>nul'), timeout=5)

        # ffmpeg: seek + single frame
        ff_cmd = (
            f'ffmpeg -y -ss {t} -i "{src}" -vframes 1 "{out}"'
            f" 2>&1"
        )
        r = subprocess.run(ssh_cmd(f'"{ff_cmd}"'), capture_output=True, text=True, timeout=30)

        if r.returncode == 0:
            print(f"[{i}/{len(items)}] {name} ✓")
        else:
            print(f"[{i}/{len(items)}] {name} ✗ {r.stderr[:100]}")

    print("Done.")

if __name__ == "__main__":
    main()
