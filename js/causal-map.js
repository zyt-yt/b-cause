/* B-CAUSE — interactive causal map: specialization (z_diff) bars + core comparison */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const NS = "http://www.w3.org/2000/svg";
  const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  const GC = { core: "#6b40cf", app: "#2f6fd0", mot: "#e5822f", weak: "#b4bac6" };
  const GROUP = {
    core: { label: "Core", cls: "grp-core", desc: "Strong on <b>both</b> axes — the global integrators. Always trained." },
    app:  { label: "Appearance", cls: "grp-app", desc: "Appearance-leaning specialists. <b>Fine-tuned</b> for identity." },
    mot:  { label: "Motion", cls: "grp-mot", desc: "Most motion-leaning of all blocks. <b>Frozen</b>; used for guidance." },
    weak: { label: "Weak", cls: "grp-weak", desc: "Below-median / mixed. Excluded from specialist use." },
  };

  async function getJSON(p) { try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

  async function init() {
    const data = await getJSON("data/causal_scores.json");
    if (!data) return;
    const blocks = data.blocks.slice().sort((a, b) => a.block - b.block);
    const legendEl = $("#cmLegend"), readoutEl = $("#cmReadout"), barsEl = $("#cmBars");
    if (!barsEl) return;

    const HALF = 150;
    const maxAbs = Math.max(0.1, ...blocks.map((b) => Math.abs(b.z_diff)));
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

    // ---- four-role scorecard: the 2x2 of strong/weak on appearance x motion ----
    // idealized levels (keep the qualitative truth, clean numbers)
    const CATS = [
      { key: "core", label: "Core", app: 0.93, mot: 0.85, role: "the shared backbone — always trained" },
      { key: "app", label: "Appearance specialist", app: 0.91, mot: 0.28, role: "fine-tuned to learn identity" },
      { key: "mot", label: "Motion specialist", app: 0.26, mot: 0.89, role: "steers motion at inference" },
      { key: "weak", label: "Weak", app: 0.30, mot: 0.22, role: "excluded from specialist use" },
    ];
    const strong = (v) => v >= 0.55;
    const meter = (lab, val, cls) => `
      <div class="sr-m">
        <span class="sr-mlab">${lab}</span>
        <div class="sr-track"><div class="sr-fill ${cls}" style="width:${Math.round(val * 100)}%"></div></div>
        <span class="sr-word ${strong(val) ? "s" : "w"}">${strong(val) ? "strong" : "weak"}</span>
      </div>`;

    const cols = [];
    CATS.forEach((c) => {
      const n = data.groups[c.key] ? data.groups[c.key].blocks.length : 0;
      const row = el("div", "spec-row spec-" + c.key);
      row.innerHTML = `
        <div class="sr-cat"><span class="sr-dot ${c.key}"></span><b>${n}</b> blocks</div>
        <div class="sr-meters">${meter("Appearance", c.app, "app")}${meter("Motion", c.mot, "mot")}</div>
        <div class="sr-arrow">&rarr;</div>
        <div class="sr-out"><span class="sr-concl ${c.key}">${c.label}</span><span class="sr-role">${c.role}</span></div>`;
      row.addEventListener("mouseenter", () => select(c, row));
      row.addEventListener("click", () => select(c, row));
      barsEl.appendChild(row);
      cols.push({ c, col: row });
    });

    let activeCat = null;
    function select(c, col) {
      if (activeCat === c.key) return;
      activeCat = c.key;
      cols.forEach((x) => x.col.classList.toggle("active", x.col === col));
      const gp = GROUP[c.key], n = data.groups[c.key] ? data.groups[c.key].blocks.length : 0;
      readoutEl.innerHTML = `
        <span class="ro-block">${c.label}<span class="grp ${gp.cls}">${n} blocks</span></span>
        <span class="ro-desc">${gp.desc}</span>`;
    }
    select(CATS[0], cols[0].col);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
