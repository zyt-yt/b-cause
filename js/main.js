/* B-CAUSE page — nav, lazy autoplay, reveals, gallery, comparisons, metrics */
(function () {
  "use strict";

  /* ---------- lazy muted-loop autoplay when in viewport ---------- */
  const vidObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.dataset.loaded && v.dataset.src) {
          v.src = v.dataset.src;
          v.dataset.loaded = "1";
        }
        const p = v.play();
        if (p) p.catch(() => {});
      } else {
        v.pause();
      }
    });
  }, { threshold: 0.2 });

  function lazyVideo(src, poster, cls) {
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", "");
    v.preload = "none";
    if (poster) v.poster = poster;
    if (cls) v.className = cls;
    v.dataset.src = src;
    vidObserver.observe(v);
    return v;
  }
  window.__lazyVideo = lazyVideo;

  /* ---------- scroll reveal ---------- */
  const revObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); revObserver.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll("section").forEach((s) => {
    const wrap = s.querySelector(".wrap");
    if (wrap) { wrap.classList.add("reveal"); revObserver.observe(wrap); }
  });

  /* ---------- helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  async function getJSON(path) {
    try { const r = await fetch(path, { cache: "no-store" }); if (!r.ok) throw 0; return await r.json(); }
    catch { return null; }
  }

  /* ---------- build page from media.json + metrics.json ---------- */
  async function build() {
    const media = await getJSON("data/media.json");
    const metrics = await getJSON("data/metrics.json");

    if (media) {
      buildHero(media.gallery || []);
      buildGallery(media.gallery || []);
      buildComparisons(media.comparisons || []);
    }
    if (metrics) buildMetrics(metrics);
  }

  function buildHero(gallery) {
    const grid = $("#heroGrid");
    if (!grid) return;
    const pick = gallery.slice(0, 6);
    pick.forEach((g) => {
      const cell = el("div", "cell");
      cell.appendChild(lazyVideo(g.video, g.poster, ""));
      grid.appendChild(cell);
    });
  }

  const CAT_LABEL = { animal: "Animals", plushie: "Plushies", "action-figure": "Action figures", anime: "Anime", toy: "Toys", vehicle: "Vehicles" };

  function buildGallery(gallery) {
    const grid = $("#galleryGrid");
    const filt = $("#galFilters");
    if (!grid) return;
    const cats = Array.from(new Set(gallery.map((g) => g.category)));
    const mkChip = (val, label, on) => { const c = el("button", "chip" + (on ? " on" : ""), label); c.dataset.cat = val; return c; };
    filt.appendChild(mkChip("all", "All", true));
    cats.forEach((c) => filt.appendChild(mkChip(c, CAT_LABEL[c] || c, false)));

    function render(cat) {
      grid.innerHTML = "";
      gallery.filter((g) => cat === "all" || g.category === cat).forEach((g) => {
        const card = el("div", "vcard");
        card.appendChild(lazyVideo(g.video, g.poster, ""));
        card.appendChild(el("div", "cap", `<b>${cap(g.subject)}</b> &middot; ${g.prompt_label}`));
        grid.appendChild(card);
      });
    }
    filt.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip"); if (!btn) return;
      filt.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
      btn.classList.add("on"); render(btn.dataset.cat);
    });
    render("all");
  }

  const METHOD_LABEL = { ours: "B-CAUSE (ours)", customcrafter: "CustomCrafter", videobooth: "VideoBooth", pia: "PIA" };
  const METHOD_ORDER = ["ours", "customcrafter", "videobooth", "pia"];

  function buildComparisons(comps) {
    const box = $("#cmpContainer");
    if (!box) return;
    comps.forEach((c) => {
      const set = el("div", "cmp-set");
      set.appendChild(el("h3", null, c.label || cap(c.subject)));
      set.appendChild(el("p", "pl", c.prompt_label));
      const row = el("div", "cmp-row");
      METHOD_ORDER.forEach((m) => {
        if (!c.methods[m]) return;
        const cell = el("div", "cmp-cell" + (m === "ours" ? " ours" : ""));
        cell.appendChild(el("div", "tag", `<span class="dot"></span>${METHOD_LABEL[m]}`));
        const card = el("div", "vcard");
        card.appendChild(lazyVideo(c.methods[m].video, c.methods[m].poster, ""));
        cell.appendChild(card);
        row.appendChild(cell);
      });
      set.appendChild(row);
      box.appendChild(set);
    });
  }

  function buildMetrics(m) {
    const box = $("#metricsTable");
    if (!box || !m.columns) return;
    const t = el("table", "metrics");
    const thead = el("thead");
    const hr = el("tr");
    hr.appendChild(el("th", null, "Method"));
    m.columns.forEach((c) => hr.appendChild(el("th", null, c.label + (c.arrow ? " " + c.arrow : ""))));
    thead.appendChild(hr); t.appendChild(thead);
    const tb = el("tbody");
    m.rows.forEach((row) => {
      const tr = el("tr", row.ours ? "ours" : "");
      tr.appendChild(el("td", null, row.method));
      m.columns.forEach((c) => {
        const v = row.values[c.key];
        const isBest = m.best && m.best[c.key] === row.method;
        tr.appendChild(el("td", isBest ? "best" : "", v == null ? "&ndash;" : v));
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); box.innerHTML = ""; box.appendChild(t);
    if (m.note) $("#metricsNote").innerHTML = m.note;
    if (m.lead) $("#quantLead").innerHTML = m.lead;
  }

  const cap = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  /* ---------- nav active state ---------- */
  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const secObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach((a) => a.style.color = a.getAttribute("href") === "#" + id ? "var(--ink)" : "");
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll("section[id]").forEach((s) => secObserver.observe(s));

  window.copyBib = function () {
    const txt = $("#bibtex").innerText.replace(/^Copy\s*/, "");
    navigator.clipboard && navigator.clipboard.writeText(txt);
    const b = document.querySelector(".copy-btn"); if (b) { b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1400); }
  };

  document.addEventListener("DOMContentLoaded", build);
  if (document.readyState !== "loading") build();
})();
