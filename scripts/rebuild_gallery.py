#!/usr/bin/env python3
"""Recompress a hand-curated gallery (strong clips only) and update media.json gallery.
Comparisons + causal_map in media.json are left untouched."""
import json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FF = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
FP = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffprobe"
D = "/data3/lizn/CogVideoX-finetune/DATASETS"
VID = os.path.join(ROOT, "assets", "videos")
POS = os.path.join(ROOT, "assets", "posters")

# user-curated via picker; (subject, category, label, filename)
GAL = [
    ("plushie_panda", "plushie", "panda sledding down a snowy hill", "sliding_snow_seed7890.mp4"),
    ("dog11", "animal", "corgi bounding down a boardwalk", "p16_seed7890.mp4"),
    ("robot_toy", "toy", "robot circling a chessboard", "circling_chess_seed7890.mp4"),
    ("plushie_bunny", "plushie", "bunny plushie on a sunlit bed", "p1_seed7890.mp4"),
    ("dog2", "animal", "dog running through snow", "running_snow_seed7890.mp4"),
    ("duck_toy", "toy", "duck toy drifting on a pond", "floating_pond_seed7890.mp4"),
]


def dur(p):
    try:
        r = subprocess.run([FP, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=nk=1:nw=1", p], capture_output=True, text=True)
        return float(r.stdout.strip())
    except Exception:
        return 3.0


def main():
    # remove old gallery files so nothing stale lingers
    for f in os.listdir(VID):
        if f.startswith("gal_"):
            os.remove(os.path.join(VID, f))
            p = os.path.join(POS, f[:-4] + ".jpg")
            if os.path.exists(p):
                os.remove(p)

    out = []
    for i, (subj, cat, label, fn) in enumerate(GAL):
        src = f"{D}/{subj}/v3_enhanced/main/{fn}"
        if not os.path.exists(src):
            print("MISS", src); continue
        name = f"gal_{i:02d}_{subj}"
        vout = os.path.join(VID, name + ".mp4")
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-an",
                        "-vf", "scale=-2:480:flags=lanczos", "-c:v", "libx264",
                        "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "28",
                        "-preset", "slow", "-movflags", "+faststart", vout], check=True)
        # poster at 40%
        t = max(0.3, dur(vout) * 0.4)
        pout = os.path.join(POS, name + ".jpg")
        subprocess.run([FF, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", vout,
                        "-vframes", "1", "-q:v", "3", pout], capture_output=True)
        out.append({"subject": subj, "category": cat, "prompt_label": label,
                    "video": os.path.relpath(vout, ROOT), "poster": os.path.relpath(pout, ROOT)})
        print("ok", name, "|", label)

    media = json.load(open(os.path.join(ROOT, "data", "media.json")))
    media["gallery"] = out
    json.dump(media, open(os.path.join(ROOT, "data", "media.json"), "w"), indent=2)
    total = sum(os.path.getsize(os.path.join(VID, f)) for f in os.listdir(VID))
    print(f"\ngallery = {len(out)} clips; assets/videos total = {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
