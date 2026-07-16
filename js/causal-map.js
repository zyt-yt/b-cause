/* B-CAUSE — interactive causal map: appearance vs motion contribution scatter */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

  const GC = { core: "#6b40cf", app: "#2f6fd0", mot: "#e5822f", weak: "#aeb5c2" };
  const GROUP = {
    core: { label: "Core", cls: "grp-core", desc: "Strong on <b>both</b> axes — the global integrators. Trained." },
    app:  { label: "Appearance", cls: "grp-app", desc: "Appearance-leaning specialists. <b>Fine-tuned</b> for identity." },
    mot:  { label: "Motion", cls: "grp-mot", desc: "Motion-leaning specialists. <b>Frozen</b>; used for guidance." },
    weak: { label: "Weak", cls: "grp-weak", desc: "Below-median / mixed. Excluded from specialist use." },
  };

  async function getJSON(p) { try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

  async function init() {
    const data = await getJSON("data/causal_scores.json");
    if (!data) return;
    const blocks = data.blocks.slice();
    const legendEl = $("#cmLegend");
    const readoutEl = $("#cmReadout");
    const host = $("#cmScatter");
    if (!host) return;

    // z-score each axis so the four groups separate and "core" sits far top-right
    const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    const qa = blocks.map((b) => b.q_app), qm = blocks.map((b) => b.q_mot);
    const ma = mean(qa), mm = mean(qm);
    const sa = Math.sqrt(mean(qa.map((x) => (x - ma) ** 2))), sm = Math.sqrt(mean(qm.map((x) => (x - mm) ** 2)));
    blocks.forEach((b) => { b.za = (b.q_app - ma) / sa; b.zm = (b.q_mot - mm) / sm; });

    const hidden = new Set();
    /* legend / group filters */
    Object.keys(GROUP).forEach((g) => {
      const n = data.groups[g] ? data.groups[g].blocks.length : 0;
      const chip = el("span", "lg", `<span class="sw" style="background:${GC[g]}"></span>${GROUP[g].label} <span style="color:var(--muted)">(${n})</span>`);
      chip.dataset.g = g;
      chip.addEventListener("click", () => {
        if (hidden.has(g)) hidden.delete(g); else hidden.add(g);
        chip.classList.toggle("off", hidden.has(g));
        pts.forEach((p) => p.g.style.opacity = hidden.has(p.b.group) ? 0.1 : 1);
      });
      legendEl.appendChild(chip);
    });

    // geometry
    const VBW = 760, VBH = 470, L = 60, R = 30, T = 28, B = 56;
    const iW = VBW - L - R, iH = VBH - T - B;
    let lo = Infinity, hi = -Infinity;
    blocks.forEach((b) => { lo = Math.min(lo, b.za, b.zm); hi = Math.max(hi, b.za, b.zm); });
    lo -= 0.5; hi += 0.55;
    const X = (zm) => L + (zm - lo) / (hi - lo) * iW;
    const Y = (za) => T + (1 - (za - lo) / (hi - lo)) * iH;

    const svg = svgEl("svg", { viewBox: `0 0 ${VBW} ${VBH}`, class: "cm-svg", preserveAspectRatio: "xMidYMid meet" });
    // plot frame
    svg.appendChild(svgEl("rect", { x: L, y: T, width: iW, height: iH, rx: 10, fill: "#fcfcfd", stroke: "#eceef2" }));
    // origin gridlines (z = 0)
    if (X(0) > L && X(0) < L + iW) svg.appendChild(svgEl("line", { x1: X(0), y1: T, x2: X(0), y2: T + iH, stroke: "#e9ebf0", "stroke-width": 1 }));
    if (Y(0) > T && Y(0) < T + iH) svg.appendChild(svgEl("line", { x1: L, y1: Y(0), x2: L + iW, y2: Y(0), stroke: "#e9ebf0", "stroke-width": 1 }));
    // diagonal (equal contribution)
    svg.appendChild(svgEl("line", { x1: X(lo), y1: Y(lo), x2: X(hi), y2: Y(hi), stroke: "#d7dbe3", "stroke-width": 1.5, "stroke-dasharray": "5 5" }));
    const dl = svgEl("text", { x: X(hi) - 6, y: Y(hi) + 16, class: "cm-diaglab", "text-anchor": "end" }); dl.textContent = "equal contribution"; svg.appendChild(dl);
    // axis labels
    const xl = svgEl("text", { x: L + iW / 2, y: VBH - 14, class: "cm-axlab", "text-anchor": "middle" }); xl.textContent = "motion contribution  →"; svg.appendChild(xl);
    const yl = svgEl("text", { x: 18, y: T + iH / 2, class: "cm-axlab", "text-anchor": "middle", transform: `rotate(-90 18 ${T + iH / 2})` }); yl.textContent = "appearance contribution  →"; svg.appendChild(yl);
    // core-zone hint (top-right)
    const cz = svgEl("text", { x: X(hi) - 10, y: Y(hi) - 6, class: "cm-zonelab", "text-anchor": "end" }); cz.textContent = "strong on both"; svg.appendChild(cz);

    // points
    const order = { weak: 0, mot: 1, app: 2, core: 3 }; // draw core last (on top)
    const sorted = blocks.slice().sort((a, b) => order[a.group] - order[b.group]);
    const pts = [];
    let activeBlock = null;
    sorted.forEach((b) => {
      const g = svgEl("g", { class: "cm-pt", "data-block": b.block });
      const isCore = b.group === "core";
      const isWeak = b.group === "weak";
      const r = isCore ? 11 : isWeak ? 5.5 : 8;
      if (isCore) svg && g.appendChild(svgEl("circle", { cx: X(b.zm), cy: Y(b.za), r: r + 4, fill: "none", stroke: GC.core, "stroke-width": 1.5, opacity: 0.35 }));
      g.appendChild(svgEl("circle", { cx: X(b.zm), cy: Y(b.za), r, fill: GC[b.group], stroke: "#fff", "stroke-width": 1.5, opacity: isWeak ? 0.75 : 1, class: "cm-dot2" }));
      if (!isWeak) {
        const t = svgEl("text", { x: X(b.zm), y: Y(b.za) + (isCore ? 3.2 : 2.8), class: "cm-ptlab", "text-anchor": "middle", "font-size": isCore ? 9.5 : 8 });
        t.textContent = b.block; g.appendChild(t);
      }
      g.addEventListener("mouseenter", () => select(b));
      g.addEventListener("click", () => select(b));
      svg.appendChild(g);
      pts.push({ b, g });
    });
    host.appendChild(svg);

    function select(b) {
      if (activeBlock === b.block) return;
      activeBlock = b.block;
      pts.forEach((p) => p.g.classList.toggle("active", p.b.block === b.block));
      const ap = pts.find((p) => p.b.block === b.block);
      if (ap) svg.appendChild(ap.g); // bring to front
      renderReadout(b);
    }
    function renderReadout(b) {
      const gp = GROUP[b.group];
      readoutEl.innerHTML = `
        <span class="ro-block">Block ${b.block}<span class="grp ${gp.cls}">${gp.label}</span></span>
        <span class="ro-desc">${gp.desc}</span>`;
    }
    select(blocks.find((b) => b.block === 23) || blocks[0]);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
