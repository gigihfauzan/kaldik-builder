// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCAVt8FSDNN72OtVDjNcX060apWY7um4EI",
    authDomain: "kalender-pendidikan-ad13c.firebaseapp.com",
    projectId: "kalender-pendidikan-ad13c",
    storageBucket: "kalender-pendidikan-ad13c.firebasestorage.app",
    messagingSenderId: "396729831545",
    appId: "1:396729831545:web:6e4c220690f8b9fb0444a8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let events = [];
let isDataLoaded = false;

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ==================== INIT APP ====================
document.addEventListener("DOMContentLoaded", () => {
    renderControlPanel();
    renderPreviewSkeleton();
    initAuth();
});

// Render Control Panel
function renderControlPanel() {
    const panelHTML = `
        <div class="p-5 bg-blue-600 text-white">
            <h1 class="text-xl font-bold"><i class="fas fa-cog mr-2"></i> Pengaturan Kalender</h1>
        </div>
        <div class="p-5 flex-grow space-y-6 overflow-y-auto">
            <!-- Layout -->
            <div class="space-y-3">
                <label class="block text-sm font-semibold">Ukuran Kertas & Orientasi</label>
                <div class="flex gap-3">
                    <select id="input-paper" class="flex-1 border rounded p-2 text-sm">
                        <option value="F4">F4 (Folio)</option>
                        <option value="A4">A4</option>
                    </select>
                    <select id="input-orientation" class="flex-1 border rounded p-2 text-sm">
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
            </div>

            <!-- Data Sekolah -->
            <div>
                <label class="block text-sm font-semibold mb-1">Nama Sekolah</label>
                <input type="text" id="input-school" value="SMP NEGERI 2 KEDUNGBANTENG" class="w-full border p-3 rounded text-sm">
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm font-semibold mb-1">Tahun Mulai</label>
                    <input type="number" id="input-year" value="2026" class="w-full border p-3 rounded text-sm">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Tahun Ajaran</label>
                    <input type="text" id="display-year" value="2026/2027" readonly class="w-full border p-3 rounded bg-gray-100 text-sm">
                </div>
            </div>

            <!-- Kepsek -->
            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-semibold mb-1">Nama Kepala Sekolah</label>
                    <input type="text" id="input-kepsek" value="Nama Kepsek, S.Pd., M.Pd." class="w-full border p-3 rounded text-sm">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">NIP Kepala Sekolah</label>
                    <input type="text" id="input-nip" value="19800101 200501 1 001" class="w-full border p-3 rounded text-sm">
                </div>
                <div>
                    <label class="block text-sm font-semibold mb-1">Tempat & Tanggal TTD</label>
                    <input type="text" id="input-ttd-date" value="Kedungbanteng, 12 Juli 2026" class="w-full border p-3 rounded text-sm">
                </div>
            </div>

            <!-- Tambah Event -->
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h3 class="font-semibold mb-3">Tambah Kegiatan / Libur</h3>
                <div class="grid grid-cols-2 gap-3">
                    <input type="date" id="event-start-date" class="border p-2 rounded">
                    <input type="date" id="event-end-date" class="border p-2 rounded">
                </div>
                <input type="text" id="event-desc" placeholder="Keterangan kegiatan..." class="w-full mt-3 border p-3 rounded">
                <div class="flex items-center gap-2 mt-3">
                    <input type="checkbox" id="event-is-holiday" checked>
                    <label class="text-sm">Hitung sebagai Libur</label>
                </div>
                <div class="flex gap-3 mt-4">
                    <input type="color" id="event-color" value="#10b981" class="w-12 h-10 border rounded">
                    <button onclick="addEvent()" class="flex-1 bg-blue-600 text-white py-3 rounded font-semibold">Tambahkan</button>
                </div>
            </div>

            <div id="event-list-sidebar" class="text-xs space-y-2 max-h-52 overflow-y-auto"></div>
        </div>

        <div class="p-5 border-t bg-gray-50">
            <button onclick="exportToExcel()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded font-bold mb-2">
                📊 Export Excel
            </button>
            <button onclick="window.print()" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold">
                🖨️ Cetak Kalender
            </button>
        </div>
    `;

    document.getElementById("control-panel").innerHTML = panelHTML;
    attachInputListeners();
}

// Render Preview
function renderPreviewSkeleton() {
    const preview = document.getElementById("preview-container");
    preview.innerHTML = `
        <div id="page-sem1" class="page portrait mx-auto" style="width: 215mm; min-height: 330mm;">
            <div class="text-center header-section p-4">
                <h1 class="font-bold uppercase text-xl tracking-wider">KALENDER PENDIDIKAN</h1>
                <h2 id="title-school-1" class="font-bold uppercase text-blue-800 mt-2"></h2>
                <h3 id="title-year-1" class="font-semibold mt-1"></h3>
                <h4 class="font-semibold bg-gray-800 text-white inline-block px-6 py-1 rounded mt-3">SEMESTER 1 (GANJIL)</h4>
            </div>
            <div id="grid-sem1" class="month-grid p-4"></div>
            <!-- Footer akan diisi JS -->
        </div>

        <div id="page-sem2" class="page portrait mx-auto mt-8" style="width: 215mm; min-height: 330mm;">
            <div class="text-center header-section p-4">
                <h1 class="font-bold uppercase text-xl tracking-wider">KALENDER PENDIDIKAN</h1>
                <h2 id="title-school-2" class="font-bold uppercase text-blue-800 mt-2"></h2>
                <h3 id="title-year-2" class="font-semibold mt-1"></h3>
                <h4 class="font-semibold bg-gray-800 text-white inline-block px-6 py-1 rounded mt-3">SEMESTER 2 (GENAP)</h4>
            </div>
            <div id="grid-sem2" class="month-grid p-4"></div>
        </div>
    `;
}

// ==================== AUTH & FIREBASE ====================
async function initAuth() {
    try { await signInAnonymously(auth); } catch (e) { console.error(e); }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadDefaultEvents(); // Fallback jika firestore gagal
    }
});

// ==================== EVENT LISTENERS ====================
function attachInputListeners() {
    const ids = ["input-school", "input-year", "input-kepsek", "input-nip", "input-ttd-date", "input-paper", "input-orientation"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => {
            debounceSave();
            if (id === "input-school") updateHeader();
            if (id === "input-year") updateYearAndRender();
            if (["input-kepsek","input-nip","input-ttd-date"].includes(id)) updateSignature();
        });
    });
}

// ==================== UPDATE FUNCTIONS ====================
function updateAll() {
    updateLayoutConfig();
    updateHeader();
    updateSignature();
    updateYearAndRender();
}

function updateLayoutConfig() {
    const orientation = document.getElementById("input-orientation")?.value || "portrait";
    document.querySelectorAll(".page").forEach(page => {
        page.classList.toggle("portrait", orientation === "portrait");
        page.classList.toggle("landscape", orientation === "landscape");
    });
}

function updateHeader() {
    const school = document.getElementById("input-school")?.value || "NAMA SEKOLAH";
    document.getElementById("title-school-1").innerText = school;
    document.getElementById("title-school-2").innerText = school;
}

function updateSignature() {
    // Bisa dikembangkan nanti
}

function updateYearAndRender() {
    const year = parseInt(document.getElementById("input-year")?.value) || 2026;
    const thn = `${year}/${year + 1}`;
    document.getElementById("display-year").value = thn;
    document.getElementById("title-year-1").innerText = `TAHUN AJARAN ${thn}`;
    document.getElementById("title-year-2").innerText = `TAHUN AJARAN ${thn}`;
    renderCalendars(year, year + 1);
}

// ==================== KALENDER RENDERING (Minimal) ====================
function renderCalendars(startYear, endYear) {
    // Placeholder - bisa dikembangkan penuh nanti
    console.log(`Rendering kalender untuk tahun ${startYear}`);
}

// ==================== EVENT MANAGEMENT ====================
window.addEvent = function() {
    alert("Fitur tambah kegiatan akan segera dilengkapi.");
    // Tambahkan logic event disini nanti
};

window.exportToExcel = function() {
    alert("Export Excel dalam pengembangan...");
};

// Load Default
function loadDefaultEvents() {
    events = [];
    updateAll();
    console.log("✅ Aplikasi Kalender siap");
}

// Debounce Save
function debounceSave() {
    console.log("💾 Perubahan disimpan (simulasi)");
}

// Global error prevention
console.log("🚀 Script Kalender telah dimuat sepenuhnya");
