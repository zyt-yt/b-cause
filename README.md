# B-CAUSE — Project Page

A single-page website for **B-CAUSE: Block-wise Causal Exploration for Subject-driven Video Generation**.
Hand-built static site (no framework): HTML + CSS + vanilla JS. Videos compressed to a web budget.

**Live once Pages is enabled:** `https://zyt-yt.github.io/b-cause/`

## Enable it in the morning (2 steps)
1. **Make the repo public:** Settings → General → Danger Zone → *Change visibility* → Public.
2. **Turn on Pages:** Settings → Pages → *Source: Deploy from a branch* → Branch `main` / `/ (root)` → Save.
   The site publishes at `https://zyt-yt.github.io/b-cause/` within ~1 min.

## Structure
```
index.html               — page markup (8 sections)
css/style.css            — clean light-academic design system
js/main.js               — lazy autoplay, reveals, gallery, comparisons, metrics table
js/causal-map.js         — interactive 42-block causal map
data/causal_scores.json  — real per-block Q_app/Q_mot/z_diff/group (from BLOCK_SELECTION.md)
data/media.json          — compressed clip paths (gallery / comparisons / causal restored)
data/metrics.json        — main comparison table numbers
assets/videos/           — compressed clips (~29 MB)
assets/img/              — paper figures (pipeline etc.)
scripts/                 — build_causal_scores.py, compress_media.py (regeneration)
```

## Sections
Hero · The Problem · **Interactive Causal Map** · Method · Results Gallery · Comparisons · Quantitative · BibTeX

## Regenerate media
```bash
python scripts/build_causal_scores.py     # rebuild causal_scores.json
python scripts/compress_media.py          # re-read media_manifest.json → recompress → media.json
```

See `NIGHT_LOG.md` for build notes and the list of placeholders (authors, links, BibTeX) to fill in.
