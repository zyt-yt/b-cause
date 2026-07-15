#!/usr/bin/env python3
"""Regenerate poster JPGs at ~40% of each clip's duration (avoids blank/transition
first frames). Videos are left untouched; only assets/posters/*.jpg are rewritten."""
import json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FFMPEG = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
FFPROBE = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffprobe"
VID = os.path.join(ROOT, "assets", "videos")
POS = os.path.join(ROOT, "assets", "posters")


def dur(path):
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nk=1:nw=1", path], capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception:
        return 0.0


def main():
    n = 0
    for f in sorted(os.listdir(VID)):
        if not f.endswith(".mp4"):
            continue
        name = f[:-4]
        pout = os.path.join(POS, name + ".jpg")
        if not os.path.exists(pout):
            continue  # only refresh posters we already emit
        vpath = os.path.join(VID, f)
        t = max(0.3, dur(vpath) * 0.4)
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}",
                        "-i", vpath, "-vframes", "1", "-q:v", "3", pout], capture_output=True)
        n += 1
    print("refreshed", n, "posters at 40% frame")


if __name__ == "__main__":
    main()
