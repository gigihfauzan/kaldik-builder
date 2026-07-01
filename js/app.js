const STORAGE_KEY = "kalender_pendidikan_v1";

function el(id) {
  return document.getElementById(id);
}

const defaultState = () => ({
  schoolName: "SMP NEGERI 1 CONTOH",
  tahunAjaran: "2025/2026",
  kepalaSekolah: "Nama Kepala Sekolah, S.Pd.",
  nipKepala: "-",
  ttdTempat: "Kota, 1 Juli 2025",
  semesters: {
    1: { start: "2025-07-14", end: "2025-12-19" },
    2: { start: "2026-01-05", end: "2026-06-12" },
  },
  markers: [],
  paperSize: "f4",
  orientation: "portrait",
  margins: { top: 1.5, right: 1.5, bottom: 1.5, left: 1.5 },
  weekendLibur: true,
});

let state = defaultState();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    const d = defaultState();
    state = {
      ...d,
      ...p,
      semesters: {
        1: { ...d.semesters[1], ...(p.semesters && p.semesters[1]) },
        2: { ...d.semesters[2], ...(p.semesters && p.semesters[2]) },
      },
      margins: { ...d.margins, ...(p.margins || {}) },
      markers: Array.isArray(p.markers) ? p.markers : [],
    };
  } catch (e) {
    state = defaultState();
  }
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
  state.margins = {
    top: +el("marginTop").value || 1.5,
    right: +el("marginRight").value || 1.5,
    bottom: +el("marginBottom").value || 1.5,
    left: +el("marginLeft").value || 1.5,
  };
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
  const b = document.body;
  b.dataset.paper = state.paperSize;
  b.dataset.orient = state.orientation;
  b.style.setProperty("--m-top", state.margins.top + "cm");
  b.style.setProperty("--m-right", state.margins.right + "cm");
  b.style.setProperty("--m-bottom", state.margins.bottom + "cm");
  b.style.setProperty("--m-left", state.margins.left + "cm");
}

function renderMarkers() {
  const ul = el("markerList");
  if (!ul) return;
  ul.innerHTML = "";
  state.markers.forEach((m, i) => {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = m.color || "#ccc";
    li.appendChild(sw);
    li.appendChild(
      document.createTextNode(
        ` ${m.icon || ""} \( {m.label} ( \){m.start}${m.end && m.end !== m.start ? "–" + m.end : ""}) `
      )
    );
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Hapus";
    btn.onclick = () => {
      state.markers.splice(i, 1);
      save();
      renderMarkers();
      preview();
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function preview() {
  const root = el("printRoot");
  if (!root) return;

  readForm();
  applyPrintVars();

  if (!window.CalendarEngine || typeof window.CalendarEngine.renderAll !== "function") {
    root.innerHTML =
      '<p class="error-hint"><strong>Pratinjau tidak bisa dirender.</strong><br>' +
      "File <code>js/calendar-engine.js</code> tidak termuat (404 atau error sintaks).<br>" +
      "Buka F12 → Console / Network, lalu pastikan semua file JS status 200.</p>";
    return;
  }

  try {
    const html = window.CalendarEngine.renderAll(state);
    root.innerHTML = html || '<p class="error-hint">Hasil render kosong. Isi tanggal Semester 1 & 2.</p>';
  } catch (err) {
    console.error(err);
    root.innerHTML =
      '<p class="error-hint"><strong>Error JavaScript:</strong> ' +
      (err.message || err) +
      "<br>Periksa tanggal semester dan data impor JSON.</p>";
  }
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((t) => {
    t.onclick = () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      const panel = document.querySelector('[data-panel="' + t.dataset.tab + '"]');
      if (panel) panel.classList.add("active");
    };
  });
}

function setupButtons() {
  if (el("btnAddMarker")) {
    el("btnAddMarker").onclick = () => {
      const label = el("markerLabel").value.trim();
      const start = el("markerStart").value;
      if (!label || !start) return alert("Isi label dan tanggal");
      const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      state.markers.push({
        id,
        label,
        color: el("markerColor").value,
        icon: el("markerIcon").value.trim(),
        start,
        end: el("markerEnd").value || start,
        libur: el("markerLibur").checked,
        semester: el("markerSemester").value,
      });
      save();
      renderMarkers();
      preview();
    };
  }

  if (el("btnLoadLiburNasional")) {
    el("btnLoadLiburNasional").onclick = () => {
      readForm();
      if (window.LiburNasionalID && LiburNasionalID.toMarkers) {
        state.markers = state.markers.concat(LiburNasionalID.toMarkers(state.tahunAjaran));
        save();
        renderMarkers();
        preview();
      } else {
        alert("File holidays-id.js belum termuat.");
      }
    };
  }

  if (el("btnPreview")) el("btnPreview").onclick = preview;
  if (el("btnPrint")) {
    el("btnPrint").onclick = () => {
      preview();
      window.print();
    };
  }
  if (el("btnExport")) {
    el("btnExport").onclick = () => {
      readForm();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "kalender-pendidikan.json";
      a.click();
    };
  }
  if (el("importFile")) {
    el("importFile").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const p = JSON.parse(r.result);
          const d = defaultState();
          state = {
            ...d,
            ...p,
            semesters: {
              1: { ...d.semesters[1], ...(p.semesters && p.semesters[1]) },
              2: { ...d.semesters[2], ...(p.semesters && p.semesters[2]) },
            },
            margins: { ...d.margins, ...(p.margins || {}) },
            markers: Array.isArray(p.markers) ? p.markers : [],
          };
          save();
          fillForm();
          renderMarkers();
          preview();
        } catch (err) {
          alert("JSON tidak valid");
        }
      };
      r.readAsText(f);
    };
  }
  if (el("toggleSidebar")) {
    el("toggleSidebar").onclick = () => el("sidebar").classList.toggle("collapsed");
  }
}

function init() {
  load();
  fillForm();
  setupTabs();
  setupButtons();
  renderMarkers();
  preview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}