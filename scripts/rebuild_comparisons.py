#!/usr/bin/env python3
"""Rebuild the Comparisons section using ONLY user-approved subjects.
ours = approved clip; baselines = whatever exists (CustomCrafter/VideoBooth/PIA)."""
import glob, json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FF = "/home/lzn/ffmpeg/ffmpeg-6.0-amd64-static/ffmpeg"
D = "/data3/lizn/CogVideoX-finetune/DATASETS"
VID = os.path.join(ROOT, "assets", "videos")
POS = os.path.join(ROOT, "assets", "posters")

# subject -> (label, approved ours filename)
SETS = [
    ("robot_toy", "Robot toy", "circling_chess_seed7890.mp4"),
    ("plushie_panda", "Panda plushie", "sliding_snow_seed7890.mp4"),
    ("dog11", "Corgi", "p16_seed7890.mp4"),
    ("duck_toy", "Duck toy", "floating_pond_seed7890.mp4"),
]


def cc_glob(s):
    return sorted(glob.glob(f"/data3/lizn/CustomCrafter/outputs/{s}/samples/*.mp4"))
def vb_glob(s):
    return sorted(glob.glob(f"/data3/lizn/VideoBooth/sample_results/{s}_*.mp4"))
def pia_glob(s):
    return sorted(glob.glob(f"/data3/lizn/PIA/data/{s}/generated_video*/*.mp4"))


def enc(src, name):
    out = os.path.join(VID, name + ".mp4")
    if not src or not os.path.exists(src):
        return None
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", src, "-an",
                    "-vf", "scale=-2:480:flags=lanczos", "-c:v", "libx264",
                    "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "28",
                    "-preset", "slow", "-movflags", "+faststart", out], check=True)
    p = os.path.join(POS, name + ".jpg")
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", "1.0", "-i", out,
                    "-vframes", "1", "-q:v", "3", p], capture_output=True)
    return {"video": os.path.relpath(out, ROOT), "poster": os.path.relpath(p, ROOT)}


def pick(lst, i=0):
    return lst[i] if len(lst) > i else (lst[0] if lst else None)


def main():
    # clear old cmp_ files
    for f in os.listdir(VID):
        if f.startswith("cmp_"):
            os.remove(os.path.join(VID, f))
    comps = []
    for subj, label, ours_fn in SETS:
        methods = {}
        m = enc(f"{D}/{subj}/v3_enhanced/main/{ours_fn}", f"cmp_{subj}_ours")
        if m: methods["ours"] = m
        cc = cc_glob(subj)
        if cc:
            m = enc(pick(cc), f"cmp_{subj}_customcrafter")
            if m: methods["customcrafter"] = m
        vb = vb_glob(subj)
        if vb:
            m = enc(pick(vb), f"cmp_{subj}_videobooth")
            if m: methods["videobooth"] = m
        pia = pia_glob(subj)
        if pia:
            m = enc(pick(pia), f"cmp_{subj}_pia")
            if m: methods["pia"] = m
        comps.append({"subject": subj, "label": label,
                      "prompt_label": "same subject · each method's own prompt", "methods": methods})
        print(subj, list(methods.keys()))

    media = json.load(open(os.path.join(ROOT, "data", "media.json")))
    media["comparisons"] = comps
    json.dump(media, open(os.path.join(ROOT, "data", "media.json"), "w"), indent=2)
    print("comparisons:", len(comps))


if __name__ == "__main__":
    main()
