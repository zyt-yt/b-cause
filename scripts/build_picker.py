#!/usr/bin/env python3
"""Compress a broad candidate pool and generate picker.html so the user can
watch every clip (autoplay loop) and tell us which IDs to keep."""
import glob, json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FF = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
D = "/data3/lizn/CogVideoX-finetune/DATASETS"
PVID = os.path.join(ROOT, "assets", "picker")
os.makedirs(PVID, exist_ok=True)

# subjects to sample, with per-subject cap
SUBJECTS = [
    ("cat1", "animal", 6), ("dog3", "animal", 5), ("dog11", "animal", 4),
    ("plushie_panda", "plushie", 5), ("plushie_unicorn", "plushie", 4),
    ("monster_toy", "toy", 5), ("robot_toy", "toy", 5),
    ("actionfigure_1", "action-figure", 4), ("actionfigure_2", "action-figure", 3),
    ("anime_1", "anime", 5), ("duck_toy", "animal-toy", 4),
]
# clips I directly observed as total failures (green/blue/red screen, dither)
SKIP = {
    "cat1/chasing_blossoms_seed1234.mp4", "cat1/chasing_blossoms_seed7890.mp4",
    "cat1/jumping_library_seed1234.mp4", "cat1/jumping_logs_seed1234.mp4",
    "cat1/jumping_cushions_seed1234.mp4",
    "dog3/chasing_frisbee_seed7890.mp4",
    "plushie_panda/swinging_branch_seed7890.mp4",
    "monster_toy/dancing_room_seed7890.mp4",
    "robot_toy/p1_seed7890.mp4", "robot_toy/p5_seed7890.mp4",
}


def main():
    for f in os.listdir(PVID):
        os.remove(os.path.join(PVID, f))
    items = []
    idx = 0
    for subj, cat, cap in SUBJECTS:
        files = sorted(glob.glob(f"{D}/{subj}/v3_enhanced/main/*.mp4"))
        # prefer variety: spread across the list, prefer seed7890
        files = [f for f in files if f"{subj}/{os.path.basename(f)}" not in SKIP]
        # spread sample up to cap
        if len(files) > cap:
            step = len(files) / cap
            files = [files[int(i * step)] for i in range(cap)]
        for src in files:
            idx += 1
            name = f"c{idx:02d}"
            out = os.path.join(PVID, name + ".mp4")
            subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-an",
                            "-vf", "scale=-2:360:flags=lanczos", "-c:v", "libx264",
                            "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "fast",
                            "-movflags", "+faststart", out], check=True)
            items.append({"id": name, "n": idx, "subject": subj, "category": cat,
                          "file": os.path.basename(src),
                          "video": os.path.relpath(out, ROOT)})
            print(name, subj, os.path.basename(src))
    json.dump(items, open(os.path.join(ROOT, "data", "picker.json"), "w"), indent=2)
    total = sum(os.path.getsize(os.path.join(PVID, f)) for f in os.listdir(PVID))
    print(f"\n{len(items)} clips; picker videos = {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
