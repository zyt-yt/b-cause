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

    // ---- specialization dumbbell: plot z_app & z_mot per block; the GAP = z_app - z_mot ----
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const qaAll = blocks.map((b) => b.q_app), qmAll = blocks.map((b) => b.q_mot);
    const ma = mean(qaAll), mm = mean(qmAll);
    const sa = Math.sqrt(mean(qaAll.map((x) => (x - ma) ** 2))), sm = Math.sqrt(mean(qmAll.map((x) => (x - mm) ** 2)));
    const zA = (q) => (q - ma) / sa, zM = (q) => (q - mm) / sm;

    const appSel = blocks.filter((b) => b.group === "app").sort((a, b) => b.z_diff - a.z_diff).slice(0, 5);
    const motSel = blocks.filter((b) => b.group === "mot").sort((a, b) => a.z_diff - b.z_diff).slice(0, 5);
    const items = [...appSel.map((b) => ({ b })), null, ...motSel.map((b) => ({ b }))];

    const VBW = 760, VBH = 366, LM = 66, RM = 22, PT = 26, PB = 288;
    const plotW = VBW - LM - RM, slots = appSel.length + 1 + motSel.length, step = plotW / slots;
    const xOf = (i) => LM + (i + 0.5) * step;
    const midY = (PT + PB) / 2, halfH = (PB - PT) / 2;
    const zMax = Math.max(...[...appSel, ...motSel].map((b) => Math.abs(b.z_diff))) + 0.3;
    const Y = (z) => midY - z / zMax * halfH;
    const barW = 26;

    const svg = sv("svg", { viewBox: `0 0 ${VBW} ${VBH}`, class: "cm-dumb", preserveAspectRatio: "xMidYMid meet" });
    // gridlines + y ticks (the z_app - z_mot scale)
    [1, 0, -1].forEach((t) => {
      svg.appendChild(sv("line", { x1: LM, y1: Y(t), x2: VBW - RM, y2: Y(t), stroke: t === 0 ? "#d7dbe3" : "#eef0f4", "stroke-width": t === 0 ? 1.5 : 1, "stroke-dasharray": t === 0 ? "none" : "3 4" }));
      const tl = sv("text", { x: LM - 10, y: Y(t) + 4, class: "cm-zlab", "text-anchor": "end" }); tl.textContent = t > 0 ? "+" + t : t; svg.appendChild(tl);
    });
    // y-axis title + direction cues
    const yt = sv("text", { x: 18, y: midY, class: "cm-axtitle", "text-anchor": "middle", transform: `rotate(-90 18 ${midY})` }); yt.textContent = "z_app − z_mot"; svg.appendChild(yt);
    const du = sv("text", { x: LM + 6, y: PT + 14, class: "cm-dircue", fill: GC.app }); du.textContent = "▲ appearance-leaning"; svg.appendChild(du);
    const dd = sv("text", { x: LM + 6, y: PB - 6, class: "cm-dircue", fill: GC.mot }); dd.textContent = "▼ motion-leaning"; svg.appendChild(dd);

    const cols = [];
    let xi = 0;
    items.forEach((it) => {
      if (!it) { xi++; return; }
      const b = it.b, x = xOf(xi); xi++;
      const y0 = Y(0), yz = Y(b.z_diff);
      const up = b.z_diff >= 0;
      const g = sv("g", { class: "cm-dz" });
      g.appendChild(sv("rect", { x: x - step / 2 + 3, y: PT, width: step - 6, height: PB - PT, fill: "transparent", class: "cm-hit" }));
      g.appendChild(sv("rect", { x: x - barW / 2, y: Math.min(y0, yz), width: barW, height: Math.max(3, Math.abs(yz - y0)), rx: 5, fill: GC[b.group], class: "cm-sbar" }));
      const bl = sv("text", { x, y: up ? y0 + 20 : y0 - 12, class: "cm-blab", "text-anchor": "middle" }); bl.textContent = b.block; g.appendChild(bl);
      g.addEventListener("mouseenter", () => select(b, g));
      g.addEventListener("click", () => select(b, g));
      svg.appendChild(g);
      cols.push({ b, col: g });
    });
    // group captions
    const ga = sv("text", { x: xOf(2), y: PB + 40, class: "cm-glab", fill: GC.app, "text-anchor": "middle" }); ga.textContent = "Appearance specialists — fine-tuned"; svg.appendChild(ga);
    const gm = sv("text", { x: xOf(appSel.length + 1 + 2), y: PB + 40, class: "cm-glab", fill: GC.mot, "text-anchor": "middle" }); gm.textContent = "Motion specialists — guidance"; svg.appendChild(gm);
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
