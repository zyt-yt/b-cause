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

    // ---- specialization slope chart (idealized concept figure) ----
    const appSel = blocks.filter((b) => b.group === "app").sort((a, b) => b.z_diff - a.z_diff).slice(0, 2);
    const motSel = blocks.filter((b) => b.group === "mot").sort((a, b) => a.z_diff - b.z_diff).slice(0, 2);
    // idealized positions (0 = weak/bottom, 1 = strong/top): keep the qualitative truth, clean the layout
    const POS = { app: [[0.90, 0.40], [0.72, 0.24]], mot: [[0.16, 0.88], [0.32, 0.64]] };
    const picks = [];
    appSel.forEach((b, i) => picks.push({ b, grp: "app", yL: POS.app[i][0], yR: POS.app[i][1] }));
    motSel.forEach((b, i) => picks.push({ b, grp: "mot", yL: POS.mot[i][0], yR: POS.mot[i][1] }));

    const VBW = 760, VBH = 372, topY = 74, botY = 300, leftX = 258, rightX = 502;
    const yP = (f) => botY - f * (botY - topY);
    const dx = (rightX - leftX) * 0.42;
    const svg = sv("svg", { viewBox: `0 0 ${VBW} ${VBH}`, class: "cm-dumb", preserveAspectRatio: "xMidYMid meet" });
    const defs = sv("defs", {}); svg.appendChild(defs);

    // faint column guides
    [leftX, rightX].forEach((x) => svg.appendChild(sv("line", { x1: x, y1: topY - 12, x2: x, y2: botY + 12, stroke: "#eceef3", "stroke-width": 1.5 })));
    // column headers
    const ha = sv("text", { x: leftX, y: topY - 26, class: "cm-glab", fill: GC.app, "text-anchor": "middle" }); ha.textContent = "Appearance"; svg.appendChild(ha);
    const hm = sv("text", { x: rightX, y: topY - 26, class: "cm-glab", fill: GC.mot, "text-anchor": "middle" }); hm.textContent = "Motion"; svg.appendChild(hm);
    const sTop = sv("text", { x: 58, y: topY + 3, class: "cm-zlab", "text-anchor": "start" }); sTop.textContent = "stronger ▲"; svg.appendChild(sTop);
    const sBot = sv("text", { x: 58, y: botY + 3, class: "cm-zlab", "text-anchor": "start" }); sBot.textContent = "weaker ▽"; svg.appendChild(sBot);

    const cols = [];
    picks.forEach((p, i) => {
      const col = GC[p.grp], ya = yP(p.yL), ym = yP(p.yR);
      const grad = sv("linearGradient", { id: `sg${i}`, gradientUnits: "userSpaceOnUse", x1: leftX, y1: ya, x2: rightX, y2: ym });
      grad.appendChild(sv("stop", { offset: "0%", "stop-color": col, "stop-opacity": 0.95 }));
      grad.appendChild(sv("stop", { offset: "100%", "stop-color": col, "stop-opacity": 0.5 }));
      defs.appendChild(grad);
      const g = sv("g", { class: "cm-dz" });
      const d = `M ${leftX} ${ya} C ${leftX + dx} ${ya}, ${rightX - dx} ${ym}, ${rightX} ${ym}`;
      g.appendChild(sv("path", { d, fill: "none", stroke: `url(#sg${i})`, "stroke-width": 3.5, "stroke-linecap": "round", class: "cm-slope" }));
      [[leftX, ya], [rightX, ym]].forEach(([cx, cy]) => {
        g.appendChild(sv("circle", { cx, cy, r: 11, fill: col, opacity: 0.16, class: "cm-halo" }));
        g.appendChild(sv("circle", { cx, cy, r: 6.5, fill: col, stroke: "#fff", "stroke-width": 2.2, class: "cm-sd" }));
      });
      const l1 = sv("text", { x: leftX - 18, y: ya + 4, class: "cm-blab", "text-anchor": "end" }); l1.textContent = "block " + p.b.block; g.appendChild(l1);
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
