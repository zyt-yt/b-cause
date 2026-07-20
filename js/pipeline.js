/* B-CAUSE — web-native pipeline diagram: Trace -> Map -> Use */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const GC = { core: "#6b40cf", app: "#2f6fd0", mot: "#e5822f", weak: "#c9cdd7" };

  async function getJSON(p) { try { const r = await fetch(p, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); } catch { return null; } }

  async function init() {
    const host = $("#pipeline");
    if (!host) return;
    const data = await getJSON("data/causal_scores.json");
    if (!data) return;
    const b2g = {};
    Object.keys(data.groups).forEach((k) => data.groups[k].blocks.forEach((b) => (b2g[b] = k)));
    const cnt = (k) => (data.groups[k] ? data.groups[k].blocks.length : 0);

    host.innerHTML = `
      <div class="pl-stage">
        <div class="pl-badge"><span class="pl-n">1</span> Trace</div>
        <div class="pl-trace">
          <figure><img src="assets/img/pl_clean.jpg" alt="clean"><figcaption>clean</figcaption></figure>
          <span class="pl-to">&rarr;</span>
          <figure><img src="assets/img/pl_corrupt.jpg" alt="corrupted"><figcaption class="bad">corrupted</figcaption></figure>
          <span class="pl-to">&rarr;</span>
          <figure class="hl"><img src="assets/img/pl_restore.jpg" alt="restored"><figcaption>restore 1 block</figcaption></figure>
        </div>
        <p class="pl-cap">Reinsert one block into a corrupted run &mdash; how much appearance &amp; motion return is that block&rsquo;s causal score.</p>
      </div>

      <div class="pl-arrow">&rarr;</div>

      <div class="pl-stage">
        <div class="pl-badge"><span class="pl-n">2</span> Map</div>
        <div class="pl-grid" id="plGrid"></div>
        <div class="pl-maplegend">
          <span><i style="background:${GC.core}"></i>Core ${cnt("core")}</span>
          <span><i style="background:${GC.app}"></i>App ${cnt("app")}</span>
          <span><i style="background:${GC.mot}"></i>Motion ${cnt("mot")}</span>
          <span><i style="background:${GC.weak}"></i>Weak ${cnt("weak")}</span>
        </div>
        <p class="pl-cap">All 42 blocks sort into four causal roles.</p>
      </div>

      <div class="pl-arrow">&rarr;</div>

      <div class="pl-stage">
        <div class="pl-badge"><span class="pl-n">3</span> Use</div>
        <div class="pl-use">
          <div class="pl-userow">
            <span class="pl-tag train">TRAIN</span>
            <div class="pl-brow" id="plTrain"></div>
          </div>
          <div class="pl-usecap">LoRA on <span class="hl-app">appearance</span> blocks (+ core)</div>
          <div class="pl-userow">
            <span class="pl-tag infer">INFER</span>
            <div class="pl-brow" id="plInfer"></div>
          </div>
          <div class="pl-usecap">latent guidance from <span class="hl-mot">motion</span> blocks</div>
        </div>
        <p class="pl-cap">Fine-tune only appearance blocks; steer dynamics with motion blocks.</p>
      </div>`;

    // stage 2: 42-block map colored by role
    const grid = $("#plGrid");
    for (let i = 0; i < 42; i++) {
      const c = el("div", "pl-cell");
      c.style.background = GC[b2g[i] || "weak"];
      c.title = "block " + i + " · " + (b2g[i] || "weak");
      grid.appendChild(c);
    }

    // stage 3: schematic 12-block rows
    const N = 12;
    const mkRow = (hostEl, litKeys) => {
      for (let i = 0; i < N; i++) {
        const on = litKeys.includes(b2g[i]);
        const cell = el("div", "pl-bcell" + (on ? " lit" : ""));
        if (on) cell.style.background = GC[b2g[i]];
        hostEl.appendChild(cell);
      }
    };
    mkRow($("#plTrain"), ["app", "core"]);
    mkRow($("#plInfer"), ["mot"]);
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();
})();
