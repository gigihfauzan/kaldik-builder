(() => {
  const M = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const D = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const p = (n) => String(n).padStart(2, "0");
  const iso = (d) => `\( {d.getFullYear()}- \){p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const par = (s) => {
    if (!s) return null;
    const a = s.split("-").map(Number);
    return new Date(a[0], a[1] - 1, a[2]);
  };
  const dim = (y, m) => new Date(y, m, 0).getDate();
  const rng = (d, a, b) => d >= a && d <= b;

  const mmap = (ms) => {
    const m = new Map();
    ms.forEach((x) => {
      const a = par(x.start);
      const b = par(x.end || x.start);
      for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
        const k = iso(new Date(d));
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(x);
      }
    });
    return m;
  };

  const months = (s, e) => {
    const a = par(s);
    const b = par(e);
    if (!a || !b || a > b) return [];
    const o = [];
    const c = new Date(a.getFullYear(), a.getMonth(), 1);
    const end = new Date(b.getFullYear(), b.getMonth(), 1);
    while (c <= end) {
      o.push({ y: c.getFullYear(), m: c.getMonth() + 1 });
      c.setMonth(c.getMonth() + 1);
    }
    return o.slice(0, 6);
  };

  const rows = (ms) => {
    let mx = 0;
    ms.forEach(({ y, m }) => {
      const f = new Date(y, m - 1, 1);
      const n = dim(y, m);
      const st = f.getDay();
      const r = Math.ceil((st + n) / 7);
      if (r > mx) mx = r;
    });
    return Math.max(mx, 6);
  };

  const eff = (y, m, ss, se, mm, wl) => {
    let c = 0;
    for (let d = 1; d <= dim(y, m); d++) {
      const dt = new Date(y, m - 1, d);
      if (!rng(dt, ss, se)) continue;
      const w = dt.getDay();
      if (wl && (w === 0 || w === 6)) continue;
      if ((mm.get(iso(dt)) || []).some((t) => t.libur)) continue;
      c++;
    }
    return c;
  };

  const mt = (y, m, rw, mm, ss, se) => {
    const f = new Date(y, m - 1, 1);
    const n = dim(y, m);
    const st = f.getDay();
    const cells = [];
    for (let i = 0; i < st; i++) cells.push(0);
    for (let d = 1; d <= n; d++) cells.push(d);
    while (cells.length < rw * 7) cells.push(0);

    let h = `<table class="cal-month"><thead><tr>`;
    D.forEach((x) => (h += `<th>${x}</th>`));
    h += `</tr></thead><tbody>`;

    for (let rr = 0; rr < rw; rr++) {
      h += `<tr>`;
      for (let cc = 0; cc < 7; cc++) {
        const v = cells[rr * 7 + cc];
        if (!v) {
          h += `<td class="empty"></td>`;
          continue;
        }
        const dt = new Date(y, m - 1, v);
        const id = iso(dt);
        const ok = rng(dt, ss, se);
        const ms = ok ? mm.get(id) || [] : [];
        const stl = ms[0] ? `background:\( {ms[0].color}22;border-color: \){ms[0].color}` : "";
        const ic = ms[0] && ms[0].icon ? `<span class="ico">${ms[0].icon}</span>` : "";
        const cl = ["day"];
        if (!ok) cl.push("out");
        if (ms.length) cl.push("marked");
        h += `<td class="\( {cl.join(" ")}" style=" \){stl}">\( {ic} \){v}</td>`;
      }
      h += `</tr>`;
    }
    return h + `</tbody></table>`;
  };

  const fid = (isoStr) => {
    const d = par(isoStr);
    return d ? `${d.getDate()} ${M[d.getMonth() + 1]} ${d.getFullYear()}` : isoStr;
  };

  const leg = (ms, ss, se, sn) => {
    const seen = new Set();
    const o = [];
    ms
      .filter((m) => m.semester === "all" || String(m.semester) === String(sn))
      .forEach((m) => {
        const k = m.label + m.color + (m.icon || "");
        if (seen.has(k)) return;
        const a = par(m.start);
        const b = par(m.end || m.start);
        if (b < ss || a > se) return;
        seen.add(k);
        o.push({
          label: m.label,
          color: m.color,
          icon: m.icon || "",
          range:
            m.start === m.end
              ? fid(m.start)
              : `${fid(m.start)} – ${fid(m.end)}`,
        });
      });
    return o;
  };

  const rs = (cfg, sn) => {
    const sem = cfg.semesters[sn];
    const ss = par(sem.start);
    const se = par(sem.end);
    const ms = months(sem.start, sem.end);
    const rw = rows(ms);
    const mm = mmap(cfg.markers);
    const ori = cfg.orientation;
    const gc = ori === "landscape" ? "months landscape" : "months portrait";

    let mh = `<div class="${gc}">`;
    ms.forEach(({ y, m }) => {
      mh += `<div class="month-card">
        <div class="month-head">
          <span class="name">${M[m]} ${y}</span>
          <span class="eff">Hari efektif: ${eff(y, m, ss, se, mm, cfg.weekendLibur)}</span>
        </div>
        ${mt(y, m, rw, mm, ss, se)}
      </div>`;
    });
    mh += `</div>`;

    const lg = leg(cfg.markers, ss, se, sn);
    let lh = `<div class="legend"><h4>Keterangan</h4><ul>`;
    lg.forEach((it) => {
      lh += `<li>
        <span class="sw" style="background:${it.color}"></span>
        \( {it.icon ? `<span class="lico"> \){it.icon}</span>` : ""}
        <span>\( {it.label} ( \){it.range})</span>
      </li>`;
    });
    lh += `</ul></div>`;

    const sig = `<div class="signature">
      <p>${cfg.ttdTempat}</p>
      <p class="role">Kepala Sekolah</p>
      <p class="name">${cfg.kepalaSekolah}</p>
      <p class="nip">NIP. ${cfg.nipKepala}</p>
    </div>`;

    const fc = ori === "landscape" ? "footer landscape" : "footer portrait";

    return `<section class="print-page" data-sem="${sn}">
      <header class="doc-head">
        <h2>KALENDER PENDIDIKAN</h2>
        <h3>${cfg.schoolName}</h3>
        <p class="ta">Tahun Ajaran ${cfg.tahunAjaran} — Semester ${sn}</p>
      </header>
      ${mh}
      <div class="\( {fc}"> \){lh}${sig}</div>
    </section>`;
  };

  window.CalendarEngine = {
    renderAll: (cfg) => [1, 2].map((n) => rs(cfg, n)).join(""),
    parseISO: par,
    toISO: iso,
    monthsBetween: months,
  };
})();
