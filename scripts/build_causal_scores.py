#!/usr/bin/env python3
"""Emit data/causal_scores.json for the interactive causal map.

Source of truth: causal_tracing_analysis/analysis/reports/BLOCK_SELECTION.md
(CogVideoX-5B, 30 Object + 30 Action subjects, P0_baseline weighted Q_restored).
Each block: Q_app, Q_mot, z_diff, and its group in {core, app, mot, weak}.
"""
import json
import os

# (block, Q_app, Q_mot, z_diff, group)
ROWS = [
    # core (5)
    (23, 0.9868, 0.7956, -0.715, "core"),
    (1,  0.9654, 0.6716, +0.133, "core"),
    (14, 0.9626, 0.6947, -0.086, "core"),
    (19, 0.9159, 0.6510, -0.137, "core"),
    (20, 0.9066, 0.6731, -0.407, "core"),
    # appearance-specific (16)
    (0,  0.8597, 0.4255, +1.251, "app"),
    (9,  0.8249, 0.4628, +0.626, "app"),
    (12, 0.8155, 0.4990, +0.239, "app"),
    (11, 0.7937, 0.4636, +0.340, "app"),
    (5,  0.7448, 0.3651, +0.729, "app"),
    (22, 0.7307, 0.4270, +0.082, "app"),
    (26, 0.7298, 0.4062, +0.249, "app"),
    (4,  0.6864, 0.3389, +0.426, "app"),
    (3,  0.6812, 0.3518, +0.271, "app"),
    (25, 0.6761, 0.3526, +0.219, "app"),
    (8,  0.6685, 0.3652, +0.045, "app"),
    (2,  0.6683, 0.3554, +0.125, "app"),
    (13, 0.6566, 0.3524, +0.045, "app"),
    (27, 0.6515, 0.3348, +0.147, "app"),
    (30, 0.6352, 0.3251, +0.083, "app"),
    (34, 0.6342, 0.3285, +0.045, "app"),
    # motion-specific (6)
    (17, 0.6090, 0.4446, -1.155, "mot"),
    (18, 0.5902, 0.4297, -1.199, "mot"),
    (7,  0.6563, 0.3752, -0.149, "mot"),
    (16, 0.6409, 0.3662, -0.211, "mot"),
    (21, 0.6014, 0.3416, -0.359, "mot"),
    (10, 0.6373, 0.3408, -0.030, "mot"),
    # weakly influential (15)
    (29, 0.6327, 0.3340, -0.015, "weak"),
    (36, 0.6319, 0.3273, +0.034, "weak"),
    (39, 0.6305, 0.3291, +0.007, "weak"),
    (28, 0.6297, 0.3298, -0.006, "weak"),
    (6,  0.6295, 0.3382, -0.078, "weak"),
    (33, 0.6281, 0.3260, +0.011, "weak"),
    (31, 0.6266, 0.3251, +0.005, "weak"),
    (37, 0.6229, 0.3263, -0.039, "weak"),
    (40, 0.6228, 0.3285, -0.058, "weak"),
    (32, 0.6224, 0.3281, -0.058, "weak"),
    (41, 0.6217, 0.3297, -0.076, "weak"),
    (35, 0.6211, 0.3283, -0.070, "weak"),
    (38, 0.6199, 0.3227, -0.034, "weak"),
    (24, 0.6136, 0.3191, -0.060, "weak"),
    (15, 0.5903, 0.3072, -0.169, "weak"),
]

assert len(ROWS) == 42, len(ROWS)
assert len({r[0] for r in ROWS}) == 42, "duplicate block ids"

blocks = []
for b, qapp, qmot, zdiff, group in sorted(ROWS, key=lambda r: r[0]):
    blocks.append({
        "block": b,
        "q_app": qapp,
        "q_mot": qmot,
        "z_diff": zdiff,
        "group": group,
    })

groups = {
    "core": {"label": "Core", "blocks": sorted(r[0] for r in ROWS if r[4] == "core"),
             "desc": "Top-5 on both appearance and motion. Global integrators; must be trained."},
    "app": {"label": "Appearance", "blocks": sorted(r[0] for r in ROWS if r[4] == "app"),
            "desc": "Above-median appearance restoration and appearance-leaning (z_diff > 0). Fine-tuned for identity."},
    "mot": {"label": "Motion", "blocks": sorted(r[0] for r in ROWS if r[4] == "mot"),
            "desc": "Above-median motion restoration and motion-leaning (z_diff < 0). Left frozen; used for inference-time guidance."},
    "weak": {"label": "Weak", "blocks": sorted(r[0] for r in ROWS if r[4] == "weak"),
             "desc": "Below-median or sign-contradicting. Excluded from specialist use."},
}

out = {
    "model": "CogVideoX-5B",
    "n_blocks": 42,
    "metric": "Q_restored (P0_baseline weighted), z-normalized for z_diff = z_app - z_mot",
    "subjects": {"object": 30, "action": 30},
    "medians": {"q_app_noncore": 0.6342, "q_mot_noncore": 0.3389},
    "groups": groups,
    "blocks": blocks,
}

dest = os.path.join(os.path.dirname(__file__), "..", "data", "causal_scores.json")
with open(dest, "w") as f:
    json.dump(out, f, indent=2)
print("wrote", os.path.abspath(dest), "with", len(blocks), "blocks")
