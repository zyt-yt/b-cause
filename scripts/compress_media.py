#!/usr/bin/env python3
"""Read data/media_manifest.json (absolute source paths), compress every clip to
web-friendly H.264 under assets/videos/, extract poster frames, and write
data/media.json with RELATIVE paths for the page to consume.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FFMPEG = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
VID_DIR = os.path.join(ROOT, "assets", "videos")
POS_DIR = os.path.join(ROOT, "assets", "posters")
os.makedirs(VID_DIR, exist_ok=True)
os.makedirs(POS_DIR, exist_ok=True)


def slug(s):
    return re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()


def encode(src, name, poster=True):
    """Compress src -> assets/videos/name.mp4 (+ poster). Return (rel_video, rel_poster|None)."""
    out = os.path.join(VID_DIR, name + ".mp4")
    if not os.path.exists(src):
        print("  MISSING:", src)
        return None, None
    if not os.path.exists(out):
        cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", src, "-an",
               "-vf", "scale=-2:480:flags=lanczos",
               "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
               "-crf", "28", "-preset", "slow", "-movflags", "+faststart", out]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print("  FFMPEG FAIL", name, r.stderr[-300:])
            return None, None
    rel_v = os.path.relpath(out, ROOT)
    rel_p = None
    if poster:
        pout = os.path.join(POS_DIR, name + ".jpg")
        if not os.path.exists(pout):
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", out,
                            "-vframes", "1", "-q:v", "3", pout], capture_output=True)
        if os.path.exists(pout):
            rel_p = os.path.relpath(pout, ROOT)
    return rel_v, rel_p


def main():
    man = json.load(open(os.path.join(ROOT, "data", "media_manifest.json")))
    out = {"gallery": [], "comparisons": [], "causal_map": {}}

    print("== gallery ==")
    for i, g in enumerate(man["gallery"]):
        name = f"gal_{slug(g['subject'])}_{i}"
        v, p = encode(g["src"], name)
        if v:
            out["gallery"].append({"subject": g["subject"], "category": g["category"],
                                   "prompt_label": g["prompt_label"], "video": v, "poster": p})
        print(" ", name, "ok" if v else "skip")

    print("== comparisons ==")
    for c in man["comparisons"]:
        methods = {}
        for m in ["ours", "customcrafter", "videobooth", "pia"]:
            src = c.get(m)
            if not src:
                continue
            name = f"cmp_{slug(c['subject'])}_{m}"
            v, p = encode(src, name)
            if v:
                methods[m] = {"video": v, "poster": p}
        if methods:
            out["comparisons"].append({"subject": c["subject"], "prompt_label": c["prompt_label"],
                                       "methods": methods})
        print(" ", c["subject"], list(methods.keys()))

    print("== causal map ==")
    cm = man["causal_map"]
    cmo = {"prompt_label": cm.get("prompt_label"), "restored_by_layer": {}}
    for key in ["clean", "corrupted"]:
        if cm.get(key):
            v, p = encode(cm[key], f"causal_{key}")
            if v:
                cmo[key] = {"video": v, "poster": p}
    for L, src in cm["restored_by_layer"].items():
        v, _ = encode(src, f"causal_restored_l{L}", poster=False)
        if v:
            cmo["restored_by_layer"][L] = {"video": v}
    out["causal_map"] = cmo
    print("  restored layers:", len(cmo["restored_by_layer"]))

    json.dump(out, open(os.path.join(ROOT, "data", "media.json"), "w"), indent=2)
    # size report
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(VID_DIR) for f in fs)
    print(f"\nDONE. assets/videos total = {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
