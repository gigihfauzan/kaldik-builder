const STORAGE_KEY = "kalender_pendidikan_v1";

function el(id) {
  return document.getElementById(id);
}

let state = {
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
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (p) state = Object.assign(state, p);
  } catch (e) {}
}

function readForm() {
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
    top: +el("marginTop").value,
    right: +el("marginRight").value,
    bottom: +el("marginBottom").value,
    left: +el("marginLeft").value,
  };
  state.weekendLibur = el("weekendLibur").checked;
  save();
}

function fillForm() {
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
  ul.innerHTML = "";
  state.markers.forEach((m, i) => {
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = m.color;
    li.appendChild(sw);
    li.appendChild(
      document.createTextNode(
        ` ${m.icon || ""} \( {m.label} ( \){m.start}${
          m.end && m.end !== m.start ? "–" + m.end : ""
        }) `
      )
    );
    const btn = document.createElement("button");
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
  readForm();
  applyPrintVars();
  el("printRoot").innerHTML = window.CalendarEngine.renderAll(state);
}

document.querySelectorAll(".tab").forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    document.querySelector(`[data-panel="${t.dataset.tab}"]`).classList.add("active");
  };
});

el("btnAddMarker").onclick = () => {
  const label = el("markerLabel").value.trim();
  const start = el("markerStart").value;
  if (!label || !start) return alert("Isi label dan tanggal");
  state.markers.push({
    id: crypto.randomUUID(),
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

el("btnLoadLiburNasional").onclick = () => {
  readForm();
  if (window.LiburNasionalID && LiburNasionalID.toMarkers) {
    state.markers = state.markers.concat(LiburNasionalID.toMarkers(state.tahunAjaran));
    save();
    renderMarkers();
    preview();
  }
};

el("btnPreview").onclick = preview;
el("btnPrint").onclick = () => {
  preview();
  window.print();
};

el("btnExport").onclick = () => {
  readForm();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kalender-pendidikan.json";
  a.click();
};

el("importFile").onchange = (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    state = JSON.parse(r.result);
    save();
    fillForm();
    renderMarkers();
    preview();
  };
  r.readAsText(f);
};

el("toggleSidebar").onclick = () => el("sidebar").classList.toggle("collapsed");

load();
fillForm();
renderMarkers();
preview();
