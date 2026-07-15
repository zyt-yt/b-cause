# B-CAUSE Project Page — Overnight Build Log (2026-07-15 → 16)

Autonomous build while user sleeps. Morning summary lives at the bottom.

## Decisions locked with user
- Purpose: **interview portfolio** page. No author names. Not double-blind constrained.
- Repo: **private** `zyt-yt/b-cause` (created). Build overnight → user makes **public + enables Pages** in the morning.
- Aesthetic: **modern clean light academic**. Palette aligned to paper Fig. B: appearance = blue, motion = orange.
- Experiments: launch only *verified-missing* WAN work; otherwise prepare + defer.

## Verified environment (no further auth needed)
- `gh` authed (zyt-yt), push to b-cause works. ffmpeg 6.0 + ffprobe on PATH. Network OK.
- GPUs 2/3/4/5 free (0/1 used by another user). conda envs: `cog`, `wan`, `ltx`, etc.

## WAN ablation — INVESTIGATED, essentially COMPLETE (important, read this)
- All `run_downstream_5b.sh` experiments (full/app5/random5, attn1) = DONE (weights+val+eval).
- Corrected **attn2 lane** (app5={6,8,14,20,27}) = DONE, 4-prompt eval on monster_toy.
- 1.3B 8-condition pilot = DONE.
- **No WAN training is genuinely missing.** Did NOT launch any training (honoring the "verify-then-launch" guardrail).
- Honest caveat: identity ordering is `full > app5 > random5` even on the clean attn2 lane; rebuttal already does not cite it. Re-running won't change that.
- **One real gap fixed (no GPU):** attn2 flow metric wasn't aggregated. Root cause: `load_flow()` in `reports/wan_downstream_attn2/aggregate_metrics.py` expected the wrong JSON shape. Fixed it, re-ran → flow now folded in:
  - **motion axis: app5 0.0167 > random5 0.0136 > full 0.0105** — appearance-only LoRA preserves the MOST motion; full LoRA suppresses it most. This *supports* the motion-preservation story.
  - Changed files (research repo, NOT committed to avoid muddying the `2phase` branch): `reports/wan_downstream_attn2/aggregate_metrics.py`, `.../metrics.json`, `.../tables/comparison.md`.
- Optional decision for the user: 5B attn2 lane has no `mot5_attn2` (only app5/random5/full). Adding it = one ~15-min single-GPU run via `reports/wan_downstream_attn2/run_train_attn2.sh`. Not launched (not a verified gap). Say the word and I'll run it.

## Page build progress
- Scaffold: /data3/lizn/b-cause  (css/ js/ data/ assets/{videos,img,posters} scripts/)
- data/causal_scores.json — DONE, real 42-block Q_app/Q_mot/z_diff/group from BLOCK_SELECTION.md.
- Figures: converted paper_v2 teaser/pipeline/SOTA/train PDFs → assets/img/*.png.
- (in progress) curation manifest, video compression, index.html + css + js.

## A/B or blank placeholders to resolve in the morning
- (list grows as I hit uncertain content)
