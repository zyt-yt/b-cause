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

## Page build — COMPLETE
Full single-page site built, verified on desktop (1280px) + mobile (390px) via headless Chromium, committed & pushed to `zyt-yt/b-cause` (private).
- **8 sections**: Hero · The Problem · Interactive Causal Map · Method · Results Gallery · Comparisons · Quantitative · BibTeX.
- **Interactive Causal Map** (signature): 42 blocks, blue=appearance / orange=motion paired bars bound to real `analysis_30x30_zdiff.json` scores; hover/tap a block → live scores + that layer's restored bicycle clip. Group legend filters. Palette passed the colorblind-safety validator (blue↔orange ΔE 27.8).
- **Gallery**: 12 curated clips (5 artifact/no-subject clips dropped after a visual QC pass), category filter, viewport-triggered muted autoplay.
- **Comparisons**: 4 subjects × {ours, CustomCrafter, VideoBooth, PIA}, ours outlined.
- **Metrics**: real Table-1 numbers (ours best on CLIP-T/CLIP-I/DINO-I; CustomCrafter best T.Cons).
- Media: 72 clips compressed to **~28 MB** (H.264/480p). Repo tracked size **~29 MB**. No file >2 MB.

## TO RESOLVE IN THE MORNING (placeholders left blank / TBD on purpose)
1. **Make it live** — Settings → make repo Public, then Pages → branch `main` / root. URL: `https://zyt-yt.github.io/b-cause/`. (See README.)
2. **Header links** — Paper / Code / arXiv buttons are `href="#"` with a `TBD` tag. Fill real URLs in `index.html` (search `data-placeholder`).
3. **BibTeX** — author + booktitle are `TBD` in `index.html` (`#bibtex` block).
4. **Authors** — intentionally omitted (portfolio version). Add an author line in the hero if you want one (there's an HTML comment marking the spot).
5. **Naive-finetune "breaks motion" clip** — the Problem section is currently text-only. If you want the before/after degradation clip you mentioned, drop it in and I'll wire a slot.
6. **Vehicle category** — no vehicle subject had a `v3_enhanced/main` dir, so the gallery has none (bicycle appears in the causal map). Add one if you have it.
7. **Baseline caveat** — baseline comparison clips differ in native res/frame-count (CustomCrafter 512², VideoBooth 256², PIA 49f); fine visually but worth a footnote if a reviewer-type asks.

## How to iterate
- Re-run `python scripts/compress_media.py` after editing `data/media_manifest.json` to swap clips.
- Re-screenshot: `python scripts/shoot.py` (desktop) / `scripts/shoot_mobile.py` (writes to gitignored `scripts/shots/`).
