/* B-CAUSE — interactive causal map over 42 blocks */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  const GROUP = {
    core: { label: "Core", color: "var(--core)", cls: "grp-core", desc: "Top-5 on <b>both</b> axes — global integrators. Trained." },
    app:  { label: "Appearance", color: "var(--app)", cls: "grp-app", desc: "Appearance-leaning specialists. <b>Fine-tuned</b> for identity." },
    mot:  { label: "Motion", color: "var(--mot)", cls: "grp-mot", desc: "Motion-leaning specialists. <b>Frozen</b>; used for guidance." },
    weak: { label: "Weak", color: "var(--weak)", cls: "grp-weak", desc: "Below-median / mixed. Excluded from specialist use." },
  };

  async function getJSON(p) { try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

  async function init() {
    const data = await getJSON("data/causal_scores.json");
    if (!data) return;
    const blocks = data.blocks.slice().sort((a, b) => a.block - b.block);

    const barsEl = $("#cmBars");
    const legendEl = $("#cmLegend");
    const readoutEl = $("#cmReadout");

    const HALF = 148; // px per half (up = appearance, down = motion)
    const maxAbs = Math.max(0.1, ...blocks.map((b) => Math.abs(b.z_diff)));
    const hidden = new Set();

    /* legend / group filters */
    Object.keys(GROUP).forEach((g) => {
      const n = data.groups[g] ? data.groups[g].blocks.length : 0;
      const chip = el("span", "lg", `<span class="sw" style="background:${GROUP[g].color}"></span>${GROUP[g].label} <span style="color:var(--muted)">(${n})</span>`);
      chip.dataset.g = g;
      chip.addEventListener("click", () => {
        if (hidden.has(g)) hidden.delete(g); else hidden.add(g);
        chip.classList.toggle("off", hidden.has(g));
        applyFilter();
      });
      legendEl.appendChild(chip);
    });

    /* diverging specialization bars: up = appearance-leaning (z_diff>0), down = motion-leaning */
    const cols = [];
    blocks.forEach((b) => {
      const col = el("div", "cm-col");
      col.dataset.block = b.block; col.dataset.group = b.group;
      const up = el("div", "cm-half up");
      const down = el("div", "cm-half down");
      const bar = el("div", "bar");
      bar.style.height = (Math.abs(b.z_diff) / maxAbs * HALF) + "px";
      bar.style.background = GROUP[b.group].color;
      (b.z_diff >= 0 ? up : down).appendChild(bar);
      const lbl = el("div", "lbl", (b.block % 4 === 0 || b.group === "core") ? b.block : "");
      col.appendChild(up); col.appendChild(down); col.appendChild(lbl);
      col.addEventListener("mouseenter", () => select(b, col));
      col.addEventListener("click", () => select(b, col));
      barsEl.appendChild(col);
      cols.push({ b, col });
    });
    barsEl.appendChild(el("div", "cm-baseline"));

    function applyFilter() {
      cols.forEach(({ b, col }) => col.classList.toggle("dim", hidden.has(b.group)));
    }

    let activeBlock = null;
    function select(b, col) {
      if (activeBlock === b.block) return;
      activeBlock = b.block;
      cols.forEach((c) => c.col.classList.toggle("active", c.col === col));
      renderReadout(b);
    }

    function renderReadout(b) {
      const g = GROUP[b.group];
      const sgn = (v) => (v > 0 ? "+" : "") + v.toFixed(2);
      readoutEl.innerHTML = `
        <span class="ro-block">Block ${b.block}<span class="grp ${g.cls}">${g.label}</span></span>
        <span class="ro-m app">Q<sub>app</sub> <b>${b.q_app.toFixed(2)}</b></span>
        <span class="ro-m mot">Q<sub>mot</sub> <b>${b.q_mot.toFixed(2)}</b></span>
        <span class="ro-m">z<sub>diff</sub> <b>${sgn(b.z_diff)}</b></span>
        <span class="ro-desc">${g.desc}</span>`;
    }

    /* default state: a core block (23 = strongest) */
    const def = blocks.find((b) => b.block === 23) || blocks[0];
    const defCol = cols.find((c) => c.b.block === def.block);
    select(def, defCol.col);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
