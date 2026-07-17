/* B-CAUSE — interactive causal map: per-block appearance(up) / motion(down) bars */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  const GC = { core: "#6b40cf", app: "#2f6fd0", mot: "#e5822f", weak: "#b4bac6" };
  const GROUP = {
    core: { label: "Core", cls: "grp-core", desc: "Strong on <b>both</b> axes — the global integrators. Always trained." },
    app:  { label: "Appearance", cls: "grp-app", desc: "Appearance-leaning specialists. <b>Fine-tuned</b> for identity." },
    mot:  { label: "Motion", cls: "grp-mot", desc: "Motion-leaning specialists. <b>Frozen</b>; used for guidance." },
    weak: { label: "Weak", cls: "grp-weak", desc: "Below-median / mixed. Excluded from specialist use." },
  };

  async function getJSON(p) { try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

  async function init() {
    const data = await getJSON("data/causal_scores.json");
    if (!data) return;
    const blocks = data.blocks.slice().sort((a, b) => a.block - b.block);
    const legendEl = $("#cmLegend");
    const readoutEl = $("#cmReadout");
    const barsEl = $("#cmBars");
    if (!barsEl) return;

    // range-normalize each axis (zoom into the real range so variation is visible)
    const qa = blocks.map((b) => b.q_app), qm = blocks.map((b) => b.q_mot);
    const aLo = Math.min(...qa) - 0.03, aHi = Math.max(...qa);
    const mLo = Math.min(...qm) - 0.02, mHi = Math.max(...qm);
    const HALF = 132;
    const nA = (q) => Math.max(0.04, (q - aLo) / (aHi - aLo)) * HALF;
    const nM = (q) => Math.max(0.04, (q - mLo) / (mHi - mLo)) * HALF;

    const hidden = new Set();
    Object.keys(GROUP).forEach((g) => {
      const n = data.groups[g] ? data.groups[g].blocks.length : 0;
      const chip = el("span", "lg", `<span class="sw" style="background:${GC[g]}"></span>${GROUP[g].label} <span style="color:var(--muted)">(${n})</span>`);
      chip.dataset.g = g;
      chip.addEventListener("click", () => {
        if (hidden.has(g)) hidden.delete(g); else hidden.add(g);
        chip.classList.toggle("off", hidden.has(g));
        cols.forEach(({ b, col }) => col.classList.toggle("dim", hidden.has(b.group)));
      });
      legendEl.appendChild(chip);
    });

    const cols = [];
    blocks.forEach((b) => {
      const isCore = b.group === "core";
      const col = el("div", "cm-col" + (isCore ? " core" : ""));
      col.dataset.block = b.block; col.dataset.group = b.group;
      if (isCore) col.appendChild(el("div", "cm-coreband"));
      const up = el("div", "cm-half up");
      const down = el("div", "cm-half down");
      const bu = el("div", "bar"); bu.style.height = nA(b.q_app) + "px"; bu.style.background = GC[b.group];
      const bd = el("div", "bar"); bd.style.height = nM(b.q_mot) + "px"; bd.style.background = GC[b.group];
      up.appendChild(bu); down.appendChild(bd);
      if (isCore) col.appendChild(el("div", "cm-star", "&#9670;"));
      const lbl = el("div", "lbl", (b.block % 4 === 0 || isCore) ? b.block : "");
      col.appendChild(up); col.appendChild(down); col.appendChild(lbl);
      col.addEventListener("mouseenter", () => select(b, col));
      col.addEventListener("click", () => select(b, col));
      barsEl.appendChild(col);
      cols.push({ b, col });
    });
    barsEl.appendChild(el("div", "cm-baseline"));

    let activeBlock = null;
    function select(b, col) {
      if (activeBlock === b.block) return;
      activeBlock = b.block;
      cols.forEach((c) => c.col.classList.toggle("active", c.col === col));
      const gp = GROUP[b.group];
      readoutEl.innerHTML = `
        <span class="ro-block">Block ${b.block}<span class="grp ${gp.cls}">${gp.label}</span></span>
        <span class="ro-desc">${gp.desc}</span>`;
    }
    const def = cols.find((c) => c.b.block === 23) || cols[0];
    select(def.b, def.col);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
