#!/usr/bin/env python3
"""读取 _frames.json，通过 SSH 在 PC 上运行 FFmpeg 截帧。

用法: python3 ffmpeg_export.py <json_path> [--pc PC_IP]
示例: python3 ffmpeg_export.py D:/screenshots/_frames.json
"""
import json, subprocess, sys

PC_IP = "192.168.3.71"
PC_USER = "shaobaojia"
SSH_KEY = "/opt/data/home/.ssh/id_ed25519_homepc"

def ssh_ps(cmd):
    """Run a PowerShell command on the PC."""
    return subprocess.run(
        ["ssh", "-i", SSH_KEY, f"{PC_USER}@{PC_IP}", f"powershell -Command {cmd}"],
        capture_output=True, text=True, timeout=30, encoding="utf-8")

def main():
    json_path = sys.argv[1] if len(sys.argv) > 1 else None
    if not json_path:
        print("Usage: python3 ffmpeg_export.py <_frames.json>")
        sys.exit(1)

    # Read JSON from PC
    r = ssh_ps(f"\"Get-Content -Path '{json_path}' -Raw\"")
    if r.returncode != 0:
        print(f"Failed to read {json_path}: {r.stderr}")
        sys.exit(1)

    try:
        items = json.loads(r.stdout.strip())
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}\nFirst 200 chars: {r.stdout[:200]}")
        sys.exit(1)

    print(f"Found {len(items)} frames to export")

    for i, item in enumerate(items, 1):
        name = item["name"]
        src = item["sourceFile"]
        t = item["sourceTime"]
        out = item["outputPath"]

        # Ensure output dir exists
        out_dir = out.rsplit("\\", 1)[0]
        ssh_ps(f"\"New-Item -ItemType Directory -Force -Path '{out_dir}' | Out-Null\"")

        # ffmpeg: seek + single frame
        ff_cmd = f"ffmpeg -y -ss {t} -i '{src}' -vframes 1 '{out}' 2>&1"
        r = ssh_ps(f"\"& {{ {ff_cmd} }}\"")

        if r.returncode == 0 and b"Output" not in (r.stdout or "").encode():
            pass  # ffmpeg outputs to stderr even on success
        if "Output" in (r.stderr or "") or r.returncode == 0:
            print(f"[{i}/{len(items)}] {name} ✓")
        else:
            err = (r.stderr or r.stdout or "")[:120]
            print(f"[{i}/{len(items)}] {name} ✗ {err}")

    print("Done.")

if __name__ == "__main__":
    main()
