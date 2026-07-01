/* ========== CALENDAR ENGINE (inline) ========== */
(function () {
  "use strict";
  var M = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  var D = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function toISO(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) {
    if (!s) return null;
    var a = s.split("-");
    return new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
  }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function inRange(dt, start, end) { return dt >= start && dt <= end; }

  function markerMap(markers) {
    var map = {};
    markers.forEach(function (x) {
      var a = parseISO(x.start), b = parseISO(x.end || x.start);
      if (!a || !b) return;
      for (var d = new Date(a.getTime()); d <= b; d.setDate(d.getDate() + 1)) {
        var k = toISO(new Date(d.getTime()));
        if (!map[k]) map[k] = [];
        map[k].push(x);
      }
    });
    return { get: function (iso) { return map[iso] || []; } };
  }

  function monthsBetween(start, end) {
    var a = parseISO(start), b = parseISO(end);
    if (!a || !b || a > b) return [];
    var out = [], c = new Date(a.getFullYear(), a.getMonth(), 1), endM = new Date(b.getFullYear(), b.getMonth(), 1);
    while (c <= endM) { out.push({ y: c.getFullYear(), m: c.getMonth() + 1 }); c.setMonth(c.getMonth() + 1); }
    return out.slice(0, 6);
  }

  function weekRows(months) {
    var mx = 0;
    months.forEach(function (item) {
      var first = new Date(item.y, item.m - 1, 1), dim = daysInMonth(item.y, item.m);
      var rows = Math.ceil((first.getDay() + dim) / 7);
      if (rows > mx) mx = rows;
    });
    return mx < 6 ? 6 : mx;
  }

  function effectiveDays(y, m, ss, se, mm, weekendLibur) {
    var c = 0, dim = daysInMonth(y, m), d;
    for (d = 1; d <= dim; d++) {
      var dt = new Date(y, m - 1, d);
      if (!inRange(dt, ss, se)) continue;
      var w = dt.getDay();
      if (weekendLibur && (w === 0 || w === 6)) continue;
      var hits = mm.get(toISO(dt)), libur = false, i;
      for (i = 0; i < hits.length; i++) { if (hits[i].libur) { libur = true; break; } }
      if (libur) continue;
      c++;
    }
    return c;
  }

  function monthTable(y, m, rw, mm, ss, se) {
    var first = new Date(y, m - 1, 1), dim = daysInMonth(y, m), startCol = first.getDay(), cells = [], i;
    for (i = 0; i < startCol; i++) cells.push(0);
    for (i = 1; i <= dim; i++) cells.push(i);
    while (cells.length < rw * 7) cells.push(0);
    var h = '<table class="cal-month"><thead><tr>';
    D.forEach(function (x) { h += "<th>" + x + "</th>"; });
    h += "</tr></thead><tbody>";
    var rr, cc;
    for (rr = 0; rr < rw; rr++) {
      h += "<tr>";
      for (cc = 0; cc < 7; cc++) {
        var v = cells[rr * 7 + cc];
        if (!v) { h += '<td class="empty"></td>'; continue; }
        var dt = new Date(y, m - 1, v), id = toISO(dt), ok = inRange(dt, ss, se), ms = ok ? mm.get(id) : [];
        var stl = "", ic = "", cl = ["day"];
        if (!ok) cl.push("out");
        if (ms.length) {
          cl.push("marked");
          if (ms[0].color) stl = "background:" + ms[0].color + "22;border-color:" + ms[0].color;
          if (ms[0].icon) ic = '<span class="ico">' + ms[0].icon + "</span>";
        }
        h += '<td class="' + cl.join(" ") + '" style="' + stl + '">' + ic + v + "</td>";
      }
      h += "</tr>";
    }
    return h + "</tbody></table>";
  }

  function formatID(isoStr) {
    var d = parseISO(isoStr);
    return d ? d.getDate() + " " + M[d.getMonth() + 1] + " " + d.getFullYear() : isoStr;
  }

  function legend(markers, ss, se, sn) {
    var seen = {}, o = [];
    markers.forEach(function (m) {
      if (m.semester !== "all" && String(m.semester) !== String(sn)) return;
      var key = m.label + m.color + (m.icon || "");
      if (seen[key]) return;
      var a = parseISO(m.start), b = parseISO(m.end || m.start);
      if (!a || !b || b < ss || a > se) return;
      seen[key] = true;
      o.push({
        label: m.label, color: m.color, icon: m.icon || "",
        range: m.start === m.end ? formatID(m.start) : formatID(m.start) + " – " + formatID(m.end)
      });
    });
    return o;
  }

  function renderSemester(cfg, sn) {
    var sem = cfg.semesters[sn];
    if (!sem || !sem.start || !sem.end) {
      return '<section class="print-page"><p class="error-hint">Semester ' + sn + ": isi tanggal mulai & selesai.</p></section>";
    }
    var ss = parseISO(sem.start), se = parseISO(sem.end), ms = monthsBetween(sem.start, sem.end);
    var rw = weekRows(ms), mm = markerMap(cfg.markers || []), ori = cfg.orientation || "portrait";
    var gc = ori === "landscape" ? "months landscape" : "months portrait";
    var mh = '<div class="' + gc + '">';
    ms.forEach(function (item) {
      mh += '<div class="month-card"><div class="month-head"><span class="name">' + M[item.m] + " " + item.y +
        '</span><span class="eff">Hari efektif: ' + effectiveDays(item.y, item.m, ss, se, mm, cfg.weekendLibur) +
        "</span></div>" + monthTable(item.y, item.m, rw, mm, ss, se) + "</div>";
    });
    mh += "</div>";
    var lg = legend(cfg.markers || [], ss, se, sn), lh = '<div class="legend"><h4>Keterangan</h4><ul>';
    lg.forEach(function (it) {
      lh += '<li><span class="sw" style="background:' + it.color + '"></span>' +
        (it.icon ? '<span class="lico">' + it.icon + "</span>" : "") +
        "<span>" + it.label + " (" + it.range + ")</span></li>";
    });
    lh += "</ul></div>";
    var sig = '<div class="signature"><p>' + (cfg.ttdTempat || "") + '</p><p class="role">Kepala Sekolah</p><p class="name">' +
      (cfg.kepalaSekolah || "") + '</p><p class="nip">NIP. ' + (cfg.nipKepala || "") + "</p></div>";
    var fc = ori === "landscape" ? "footer landscape" : "footer portrait";
    return '<section class="print-page" data-sem="' + sn + '"><header class="doc-head"><h2>KALENDER PENDIDIKAN</h2><h3>' +
      (cfg.schoolName || "") + '</h3><p class="ta">Tahun Ajaran ' + (cfg.tahunAjaran || "") + " — Semester " + sn +
      "</p></header>" + mh + '<div class="' + fc + '">' + lh + sig + "</div></section>";
  }

  window.CalendarEngine = {
    renderAll: function (cfg) { return renderSemester(cfg, 1) + renderSemester(cfg, 2); },
    parseISO: parseISO, toISO: toISO, monthsBetween: monthsBetween
  };
})();

/* ========== APP ========== */
var STORAGE_KEY = "kalender_pendidikan_v1";

function el(id) { return document.getElementById(id); }

function defaultState() {
  return {
    schoolName: "SMP NEGERI 1 CONTOH",
    tahunAjaran: "2025/2026",
    kepalaSekolah: "Nama Kepala Sekolah, S.Pd.",
    nipKepala: "-",
    ttdTempat: "Kota, 1 Juli 2025",
    semesters: { 1: { start: "2025-07-14", end: "2025-12-19" }, 2: { start: "2026-01-05", end: "2026-06-12" } },
    markers: [],
    paperSize: "f4",
    orientation: "portrait",
    margins: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
    weekendLibur: true
  };
}

var state = defaultState();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function load() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var p = JSON.parse(raw), d = defaultState();
    state = Object.assign({}, d, p);
    state.semesters = { 1: Object.assign({}, d.semesters[1], p.semesters && p.semesters[1]), 2: Object.assign({}, d.semesters[2], p.semesters && p.semesters[2]) };
    state.margins = Object.assign({}, d.margins, p.margins || {});
    state.markers = Array.isArray(p.markers) ? p.markers : [];
  } catch (e) { state = defaultState(); }
}

function readForm() {
  if (!el("schoolName")) return;
  state.schoolName = el("schoolName").value;
  state.tahunAjaran = el("tahunAjaran").value;
  state.kepalaSekolah = el("kepalaSekolah").value;
  state.nipKepala = el("nipKepala").value;
  state.ttdTempat = el("ttdTempat").value;
  state.semesters[1].start = el("s1Start").value;
  state.semesters[1].end = el("s1End").value;
  state.semesters[2].start = el("s2Start").value;
  state.semesters[2].end = el("s2End").value;
  state.paperSize = el("paperSize").value;
  state.orientation = el("printOrientation").value;
  state.margins = { top: +el("marginTop").value || 1.5, right: +el("marginRight").value || 1.5, bottom: +el("marginBottom").value || 1.5, left: +el("marginLeft").value || 1.5 };
  state.weekendLibur = el("weekendLibur").checked;
  save();
}

function fillForm() {
  if (!el("schoolName")) return;
  el("schoolName").value = state.schoolName;
  el("tahunAjaran").value = state.tahunAjaran;
  el("kepalaSekolah").value = state.kepalaSekolah;
  el("nipKepala").value = state.nipKepala;
  el("ttdTempat").value = state.ttdTempat;
  el("s1Start").value = state.semesters[1].start;
  el("s1End").value = state.semesters[1].end;
  el("s2Start").value = state.semesters[2].start;
  el("s2End").value = state.semesters[2].end;
  el("paperSize").value = state.paperSize;
  el("printOrientation").value = state.orientation;
  el("marginTop").value = state.margins.top;
  el("marginRight").value = state.margins.right;
  el("marginBottom").value = state.margins.bottom;
  el("marginLeft").value = state.margins.left;
  el("weekendLibur").checked = state.weekendLibur;
}

function applyPrintVars() {
  document.body.dataset.paper = state.paperSize;
  document.body.dataset.orient = state.orientation;
  document.body.style.setProperty("--m-top", state.margins.top + "cm");
  document.body.style.setProperty("--m-right", state.margins.right + "cm");
  document.body.style.setProperty("--m-bottom", state.margins.bottom + "cm");
  document.body.style.setProperty("--m-left", state.margins.left + "cm");
}

function renderMarkers() {
  var ul = el("markerList");
  if (!ul) return;
  ul.innerHTML = "";
  state.markers.forEach(function (m, i) {
    var li = document.createElement("li");
    var sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = m.color || "#ccc";
    li.appendChild(sw);
    li.appendChild(document.createTextNode(" " + (m.icon || "") + " " + m.label + " (" + m.start + (m.end && m.end !== m.start ? "–" + m.end : "") + ") "));
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Hapus";
    btn.onclick = function () { state.markers.splice(i, 1); save(); renderMarkers(); preview(); };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function preview() {
  var root = el("printRoot");
  if (!root) return;
  readForm();
  applyPrintVars();
  if (!window.CalendarEngine || typeof window.CalendarEngine.renderAll !== "function") {
    root.innerHTML = '<p class="error-hint">CalendarEngine masih undefined. Cek Console (F12).</p>';
    return;
  }
  try {
    root.innerHTML = window.CalendarEngine.renderAll(state);
  } catch (err) {
    root.innerHTML = '<p class="error-hint">Error: ' + (err.message || err) + "</p>";
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(function (t) {
    t.onclick = function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("active"); });
      document.querySelectorAll(".panel").forEach(function (x) { x.classList.remove("active"); });
      t.classList.add("active");
      var panel = document.querySelector('[data-panel="' + t.dataset.tab + '"]');
      if (panel) panel.classList.add("active");
    };
  });
}

function setupButtons() {
  if (el("btnAddMarker")) el("btnAddMarker").onclick = function () {
    var label = el("markerLabel").value.trim(), start = el("markerStart").value;
    if (!label || !start) return alert("Isi label dan tanggal");
    state.markers.push({ id: String(Date.now()), label: label, color: el("markerColor").value, icon: el("markerIcon").value.trim(), start: start, end: el("markerEnd").value || start, libur: el("markerLibur").checked, semester: el("markerSemester").value });
    save(); renderMarkers(); preview();
  };
  if (el("btnLoadLiburNasional")) el("btnLoadLiburNasional").onclick = function () {
    readForm();
    if (window.LiburNasionalID && LiburNasionalID.toMarkers) {
      state.markers = state.markers.concat(LiburNasionalID.toMarkers(state.tahunAjaran));
      save(); renderMarkers(); preview();
    }
  };
  if (el("btnPreview")) el("btnPreview").onclick = preview;
  if (el("btnPrint")) el("btnPrint").onclick = function () { preview(); window.print(); };
  if (el("btnExport")) el("btnExport").onclick = function () {
    readForm();
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
    a.download = "kalender-pendidikan.json";
    a.click();
  };
  if (el("importFile")) el("importFile").onchange = function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var p = JSON.parse(r.result), d = defaultState();
        state = Object.assign({}, d, p);
        state.semesters = { 1: Object.assign({}, d.semesters[1], p.semesters && p.semesters[1]), 2: Object.assign({}, d.semesters[2], p.semesters && p.semesters[2]) };
        state.markers = Array.isArray(p.markers) ? p.markers : [];
        save(); fillForm(); renderMarkers(); preview();
      } catch (err) { alert("JSON tidak valid"); }
    };
    r.readAsText(f);
  };
  if (el("toggleSidebar")) el("toggleSidebar").onclick = function () { el("sidebar").classList.toggle("collapsed"); };
}

function init() {
  load();
  fillForm();
  setupTabs();
  setupButtons();
  renderMarkers();
  preview();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();