#!/usr/bin/env python3
"""Compress a BROAD candidate pool (all v3_enhanced/main clips across every
subject) and generate picker.html. User taps clips to keep; we rebuild the
gallery from their IDs. Previously-picked files are pre-selected."""
import glob, json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FF = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
D = "/data3/lizn/CogVideoX-finetune/DATASETS"
PVID = os.path.join(ROOT, "assets", "picker")
os.makedirs(PVID, exist_ok=True)

CATEGORY = {
    "cat1": "animal", "dog2": "animal", "dog3": "animal", "dog10": "animal", "dog11": "animal",
    "plushie_bunny": "plushie", "plushie_panda": "plushie", "plushie_unicorn": "plushie",
    "plushie_grey_sloth": "plushie",
    "monster_toy": "toy", "robot_toy": "toy",
    "actionfigure_1": "action-figure", "actionfigure_2": "action-figure",
    "anime_1": "anime", "anime_2": "anime",
    "duck_toy": "duck-toy",
}
# order groups animals-first for a nice scan
CAT_ORDER = ["animal", "plushie", "toy", "action-figure", "anime", "duck-toy"]
CAP = {"cat1": 24}  # cat1 has 48; cap to keep the page balanced

# clips directly observed as total failures (solid-color screen / heavy dither)
SKIP = {
    "cat1/chasing_blossoms_seed1234.mp4", "cat1/chasing_blossoms_seed7890.mp4",
    "cat1/jumping_library_seed1234.mp4", "cat1/jumping_logs_seed1234.mp4",
    "cat1/jumping_cushions_seed1234.mp4",
    "dog3/chasing_frisbee_seed7890.mp4",
    "plushie_panda/swinging_branch_seed7890.mp4",
    "monster_toy/dancing_room_seed7890.mp4",
    "robot_toy/p1_seed7890.mp4",
}
# files the user already picked -> pre-selected in the new picker
PRESELECT = {
    "dog11/p16_seed7890.mp4", "plushie_panda/sliding_snow_seed7890.mp4",
    "robot_toy/circling_chess_seed7890.mp4", "duck_toy/floating_pond_seed7890.mp4",
}


def main():
    for f in os.listdir(PVID):
        os.remove(os.path.join(PVID, f))

    subjects = sorted([s for s in os.listdir(D)
                       if os.path.isdir(f"{D}/{s}/v3_enhanced/main") and s in CATEGORY],
                      key=lambda s: (CAT_ORDER.index(CATEGORY[s]), s))
    items, idx = [], 0
    for subj in subjects:
        files = sorted(glob.glob(f"{D}/{subj}/v3_enhanced/main/*.mp4"))
        files = [f for f in files if f"{subj}/{os.path.basename(f)}" not in SKIP]
        cap = CAP.get(subj)
        if cap and len(files) > cap:
            step = len(files) / cap
            files = [files[int(i * step)] for i in range(cap)]
        for src in files:
            idx += 1
            name = f"c{idx:03d}"
            out = os.path.join(PVID, name + ".mp4")
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-an",
                            "-vf", "scale=-2:360:flags=lanczos", "-c:v", "libx264",
                            "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "fast",
                            "-movflags", "+faststart", out], check=True)
            key = f"{subj}/{os.path.basename(src)}"
            items.append({"id": name, "n": idx, "subject": subj, "category": CATEGORY[subj],
                          "file": os.path.basename(src), "video": os.path.relpath(out, ROOT),
                          "pre": key in PRESELECT})
    json.dump(items, open(os.path.join(ROOT, "data", "picker.json"), "w"), indent=2)
    total = sum(os.path.getsize(os.path.join(PVID, f)) for f in os.listdir(PVID))
    npre = sum(1 for it in items if it["pre"])
    print(f"{len(items)} clips ({npre} pre-selected); picker videos = {total/1e6:.1f} MB")
    from collections import Counter
    for c, n in Counter(it["subject"] for it in items).most_common():
        print(f"  {c}: {n}")


if __name__ == "__main__":
    main()
