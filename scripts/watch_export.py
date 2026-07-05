#!/usr/bin/env python3
"""后台守护：监控 PC 上的 _frames.json，一旦更新自动运行 FFmpeg 截帧。
NAS 侧运行: python3 watch_export.py &"""
import json, subprocess, time, os

JSON_PATH = r"D:\screenshots\_frames.json"
SSH = ['ssh', '-i', '/opt/data/home/.ssh/id_ed25519_homepc', 'shaobaojia@192.168.3.71']
last_mtime = 0
POLL_SEC = 5

def read_json() -> list | None:
    """SCP 拉 JSON，解析 GBK"""
    r = subprocess.run(['scp', '-i', '/opt/data/home/.ssh/id_ed25519_homepc',
        f'shaobaojia@192.168.3.71:{JSON_PATH}', '/tmp/_watch_frames.json'],
        capture_output=True, timeout=10)
    if r.returncode != 0:
        return None
    with open('/tmp/_watch_frames.json', 'rb') as f:
        raw = f.read()
    if not raw.strip():
        return None
    return json.loads(raw.decode('gbk'))

def run_ffmpeg(items):
    ok = fail = 0
    for i, item in enumerate(items, 1):
        out_dir = item['outputPath'].rsplit('\\', 1)[0]
        subprocess.run(SSH + [f'powershell -Command "New-Item -Type Directory -Force -Path \'{out_dir}\' | Out-Null"'],
                       timeout=5, capture_output=True)
        ff = f'ffmpeg -y -ss {item["sourceTime"]} -i "{item["sourceFile"]}" -vframes 1 "{item["outputPath"]}" -loglevel error'
        r = subprocess.run(SSH + [f'powershell -Command "& {{ {ff} 2>&1 }}"'],
                           capture_output=True, timeout=30)
        if r.returncode == 0:
            ok += 1
        else:
            fail += 1
    return ok, fail

print(f"👀 监控 {JSON_PATH}（每 {POLL_SEC}s）")
while True:
    items = read_json()
    if items:
        current_mtime = len(json.dumps(items, ensure_ascii=False))  # 粗糙的变更检测
        if current_mtime != last_mtime:
            last_mtime = current_mtime
            print(f"📸 检测到新 JSON ({len(items)} 帧)，开始导出...")
            ok, fail = run_ffmpeg(items)
            print(f"✅ 完成: {ok} 成功, {fail} 失败")
    time.sleep(POLL_SEC)
