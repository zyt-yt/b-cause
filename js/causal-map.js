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
    const media = await getJSON("data/media.json");
    if (!data) return;
    const blocks = data.blocks.slice().sort((a, b) => a.block - b.block);
    const causal = media && media.causal_map ? media.causal_map : null;

    const barsEl = $("#cmBars");
    const legendEl = $("#cmLegend");
    const readoutEl = $("#cmReadout");
    const videoEl = $("#cmVideo");

    const maxH = 168; // px for Q=1
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

    /* bars */
    const cols = [];
    blocks.forEach((b) => {
      const col = el("div", "cm-col");
      col.dataset.block = b.block; col.dataset.group = b.group;
      const pair = el("div", "pair");
      const bApp = el("div", "bar app"); bApp.style.height = (b.q_app * maxH) + "px";
      const bMot = el("div", "bar mot"); bMot.style.height = (b.q_mot * maxH) + "px";
      pair.appendChild(bApp); pair.appendChild(bMot);
      const tick = el("div", "tick"); tick.style.background = GROUP[b.group].color;
      const lbl = el("div", "lbl", (b.block % 4 === 0 || b.group === "core") ? b.block : "");
      col.appendChild(pair); col.appendChild(tick); col.appendChild(lbl);
      col.addEventListener("mouseenter", () => select(b, col));
      col.addEventListener("click", () => select(b, col));
      barsEl.appendChild(col);
      cols.push({ b, col });
    });

    function applyFilter() {
      cols.forEach(({ b, col }) => col.classList.toggle("dim", hidden.has(b.group)));
    }

    let activeBlock = null;
    function select(b, col) {
      if (activeBlock === b.block) return;
      activeBlock = b.block;
      cols.forEach((c) => c.col.classList.toggle("active", c.col === col));
      renderReadout(b);
      swapVideo(b.block);
    }

    function renderReadout(b) {
      const g = GROUP[b.group];
      readoutEl.innerHTML = `
        <div class="rt">Block</div>
        <div class="rblock">${b.block}<span class="grp ${g.cls}">${g.label}</span></div>
        <div class="cm-metrics">
          <div class="cm-metric app"><div class="k">Q&#8202;<sub>app</sub></div><div class="v">${b.q_app.toFixed(2)}</div></div>
          <div class="cm-metric mot"><div class="k">Q&#8202;<sub>mot</sub></div><div class="v">${b.q_mot.toFixed(2)}</div></div>
          <div class="cm-metric"><div class="k">z&#8202;<sub>diff</sub></div><div class="v">${b.z_diff > 0 ? "+" : ""}${b.z_diff.toFixed(2)}</div></div>
        </div>
        <p style="font-size:13.5px;color:var(--ink-2);margin:12px 0 0">${g.desc}</p>`;
    }

    function swapVideo(block) {
      if (!causal || !causal.restored_by_layer) return;
      const entry = causal.restored_by_layer[String(block)];
      if (!entry) return;
      if (videoEl.dataset.cur === entry.video) return;
      videoEl.dataset.cur = entry.video;
      videoEl.src = entry.video;
      const p = videoEl.play(); if (p) p.catch(() => {});
    }

    /* default state: a core block (23 = strongest) */
    const def = blocks.find((b) => b.block === 23) || blocks[0];
    const defCol = cols.find((c) => c.b.block === def.block);
    if (causal && causal.clean) { videoEl.poster = causal.clean.poster || ""; }
    select(def, defCol.col);
    if (!causal) {
      readoutEl.insertAdjacentHTML("beforeend",
        '<p style="font-size:12.5px;color:var(--muted);margin-top:10px">Restored clips load once media is compressed.</p>');
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
