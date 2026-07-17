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

    // ---- core-vs-rest mini comparison (shows core is strongest on BOTH axes) ----
    const host = $("#cmCoreCompare");
    if (host) {
      const core = blocks.filter((b) => b.group === "core"), rest = blocks.filter((b) => b.group !== "core");
      const mean = (a, k) => a.reduce((s, b) => s + b[k], 0) / a.length;
      const cA = mean(core, "q_app"), rA = mean(rest, "q_app"), cM = mean(core, "q_mot"), rM = mean(rest, "q_mot");
      const W = 300, H = 132, base = 104, bw = 30, maxV = 1.0;
      const s = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "cm-mini" });
      // legend
      s.appendChild(sv("rect", { x: 150, y: 6, width: 11, height: 11, rx: 2, fill: GC.core }));
      const lc = sv("text", { x: 165, y: 15, class: "cm-mini-leg", fill: GC.core }); lc.textContent = "core"; s.appendChild(lc);
      s.appendChild(sv("rect", { x: 205, y: 6, width: 11, height: 11, rx: 2, fill: "#cfd4dd" }));
      const lr = sv("text", { x: 220, y: 15, class: "cm-mini-leg", fill: "#9096a4" }); lr.textContent = "rest"; s.appendChild(lr);
      const groups = [{ x: 66, lab: "Appearance", c: cA, r: rA }, { x: 196, lab: "Motion", c: cM, r: rM }];
      groups.forEach((g) => {
        const hc = g.c / maxV * 80, hr = g.r / maxV * 80;
        s.appendChild(sv("rect", { x: g.x - bw - 4, y: base - hr, width: bw, height: hr, rx: 3, fill: "#cfd4dd" }));
        s.appendChild(sv("rect", { x: g.x + 4, y: base - hc, width: bw, height: hc, rx: 3, fill: GC.core }));
        const t1 = sv("text", { x: g.x - bw + 11, y: base - hr - 4, class: "cm-mini-v", "text-anchor": "middle" }); t1.textContent = g.r.toFixed(2); s.appendChild(t1);
        const t2 = sv("text", { x: g.x + bw - 15, y: base - hc - 4, class: "cm-mini-v core", "text-anchor": "middle" }); t2.textContent = g.c.toFixed(2); s.appendChild(t2);
        const gl = sv("text", { x: g.x, y: base + 16, class: "cm-mini-lab", "text-anchor": "middle" }); gl.textContent = g.lab; s.appendChild(gl);
      });
      host.appendChild(s);
    }

    // ---- specialization slope chart: appearance rank vs motion rank ----
    const byApp = blocks.slice().sort((a, b) => b.q_app - a.q_app);
    const byMot = blocks.slice().sort((a, b) => b.q_mot - a.q_mot);
    const appRank = {}, motRank = {};
    byApp.forEach((b, i) => (appRank[b.block] = i + 1));
    byMot.forEach((b, i) => (motRank[b.block] = i + 1));
    const N = blocks.length;

    const appSel = blocks.filter((b) => b.group === "app").sort((a, b) => b.z_diff - a.z_diff).slice(0, 2);
    const motSel = blocks.filter((b) => b.group === "mot").sort((a, b) => a.z_diff - b.z_diff).slice(0, 2);
    const picks = [...appSel.map((b) => ({ b, grp: "app" })), ...motSel.map((b) => ({ b, grp: "mot" }))];

    const VBW = 760, VBH = 360, topY = 58, botY = 300, leftX = 232, rightX = 528;
    const yR = (r) => topY + (r - 1) / (N - 1) * (botY - topY);
    const svg = sv("svg", { viewBox: `0 0 ${VBW} ${VBH}`, class: "cm-dumb", preserveAspectRatio: "xMidYMid meet" });

    // axes
    [leftX, rightX].forEach((x) => svg.appendChild(sv("line", { x1: x, y1: topY, x2: x, y2: botY, stroke: "#dfe2e9", "stroke-width": 1.5 })));
    // top/bottom rank markers
    [[leftX, "end", -14], [rightX, "start", 14]].forEach(([x, anc, dx]) => {
      const t1 = sv("text", { x: x + dx, y: topY - 12, class: "cm-zlab", "text-anchor": "middle" }); t1.textContent = "rank 1"; svg.appendChild(t1);
      const t2 = sv("text", { x: x + dx, y: botY + 18, class: "cm-zlab", "text-anchor": "middle" }); t2.textContent = N; svg.appendChild(t2);
    });
    const ua = sv("text", { x: (leftX + rightX) / 2, y: topY - 12, class: "cm-dircue", fill: "#9096a4", "text-anchor": "middle" }); ua.textContent = "▲ stronger"; svg.appendChild(ua);
    // axis titles
    const la = sv("text", { x: leftX, y: botY + 44, class: "cm-glab", fill: GC.app, "text-anchor": "middle" }); la.textContent = "Appearance rank"; svg.appendChild(la);
    const lm = sv("text", { x: rightX, y: botY + 44, class: "cm-glab", fill: GC.mot, "text-anchor": "middle" }); lm.textContent = "Motion rank"; svg.appendChild(lm);

    const cols = [];
    picks.forEach((p) => {
      const ya = yR(appRank[p.b.block]), ym = yR(motRank[p.b.block]);
      const col = GC[p.grp];
      const g = sv("g", { class: "cm-dz" });
      g.appendChild(sv("line", { x1: leftX, y1: ya, x2: rightX, y2: ym, stroke: col, "stroke-width": 3, "stroke-linecap": "round", class: "cm-slope" }));
      g.appendChild(sv("circle", { cx: leftX, cy: ya, r: 6, fill: col, stroke: "#fff", "stroke-width": 2, class: "cm-sd" }));
      g.appendChild(sv("circle", { cx: rightX, cy: ym, r: 6, fill: col, stroke: "#fff", "stroke-width": 2, class: "cm-sd" }));
      const l1 = sv("text", { x: leftX - 16, y: ya + 4, class: "cm-blab", "text-anchor": "end" }); l1.textContent = "block " + p.b.block; g.appendChild(l1);
      g.addEventListener("mouseenter", () => select(p.b, g));
      g.addEventListener("click", () => select(p.b, g));
      svg.appendChild(g);
      cols.push({ b: p.b, col: g });
    });
    barsEl.appendChild(svg);

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
