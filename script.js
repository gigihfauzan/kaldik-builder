// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==================== FIREBASE CONFIG ====================
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

// ==================== UI ELEMENTS ====================
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    renderControlPanel();
    initAuth();
});

// Render Control Panel
function renderControlPanel() {
    const panel = document.getElementById('control-panel');
    panel.innerHTML = `
        <div class="p-5 bg-blue-600 text-white">
            <h1 class="text-xl font-bold"><i class="fas fa-cog mr-2"></i> Pengaturan</h1>
            <p class="text-sm opacity-80">Kalender Pendidikan Dinamis</p>
        </div>
        
        <div class="p-5 flex-grow space-y-4">
            <!-- Layout -->
            <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                <h3 class="font-semibold text-sm mb-2 text-yellow-700"><i class="fas fa-print mr-1"></i> Layout & Kertas</h3>
                <div class="flex gap-2">
                    <div class="w-1/2">
                        <label class="block text-xs font-semibold mb-1">Ukuran Kertas</label>
                        <select id="input-paper" class="w-full border p-2 rounded text-sm">
                            <option value="F4">F4 (Folio)</option>
                            <option value="A4">A4</option>
                        </select>
                    </div>
                    <div class="w-1/2">
                        <label class="block text-xs font-semibold mb-1">Orientasi</label>
                        <select id="input-orientation" class="w-full border p-2 rounded text-sm">
                            <option value="portrait">Portrait</option>
                            <option value="landscape">Landscape</option>
                        </select>
                    </div>
                </div>
                <!-- Margin -->
                <div class="mt-3 grid grid-cols-4 gap-1">
                    <div><input type="number" id="margin-top" value="10" class="w-full border p-1 rounded text-xs text-center"><p class="text-[9px] text-center text-gray-500">Atas</p></div>
                    <div><input type="number" id="margin-right" value="10" class="w-full border p-1 rounded text-xs text-center"><p class="text-[9px] text-center text-gray-500">Kanan</p></div>
                    <div><input type="number" id="margin-bottom" value="10" class="w-full border p-1 rounded text-xs text-center"><p class="text-[9px] text-center text-gray-500">Bawah</p></div>
                    <div><input type="number" id="margin-left" value="10" class="w-full border p-1 rounded text-xs text-center"><p class="text-[9px] text-center text-gray-500">Kiri</p></div>
                </div>
            </div>

            <!-- Data Utama -->
            <div>
                <label class="block text-sm font-semibold mb-1">Nama Sekolah</label>
                <input type="text" id="input-school" value="SMP NEGERI 2 KEDUNGBANTENG" class="w-full border p-2 rounded uppercase text-sm">
            </div>
            <div class="flex gap-2">
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">Tahun Mulai</label>
                    <input type="number" id="input-year" value="2026" class="w-full border p-2 rounded text-sm">
                </div>
                <div class="w-1/2">
                    <label class="block text-sm font-semibold mb-1">Thn. Ajaran</label>
                    <input type="text" id="display-year" value="2026/2027" readonly class="w-full border p-2 rounded bg-gray-100 text-sm">
                </div>
            </div>

            <!-- TTD -->
            <div>
                <label class="block text-sm font-semibold mb-1">Nama Kepala Sekolah</label>
                <input type="text" id="input-kepsek" value="Nama Kepsek, S.Pd., M.Pd." class="w-full border p-2 rounded text-sm">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">NIP Kepala Sekolah</label>
                <input type="text" id="input-nip" value="19800101 200501 1 001" class="w-full border p-2 rounded text-sm">
            </div>
            <div>
                <label class="block text-sm font-semibold mb-1">Tempat, Tanggal TTD</label>
                <input type="text" id="input-ttd-date" value="Kedungbanteng, 12 Juli 2026" class="w-full border p-2 rounded text-sm">
            </div>

            <!-- Tambah Event -->
            <div class="bg-blue-50 p-3 rounded border border-blue-200">
                <h3 class="font-semibold text-sm mb-2"><i class="fas fa-calendar-plus text-blue-500"></i> Tambah Kegiatan/Libur</h3>
                <div class="space-y-2">
                    <div class="flex gap-2">
                        <div class="w-1/2"><input type="date" id="event-start-date" class="w-full border p-2 rounded text-sm"></div>
                        <div class="w-1/2"><input type="date" id="event-end-date" class="w-full border p-2 rounded text-sm"></div>
                    </div>
                    <input type="text" id="event-desc" placeholder="Keterangan Kegiatan..." class="w-full border p-2 rounded text-sm">
                    <label class="flex items-center gap-2 text-xs">
                        <input type="checkbox" id="event-is-holiday" checked> Hitung sebagai Libur
                    </label>
                    <div class="flex gap-2">
                        <input type="color" id="event-color" value="#10b981" class="w-10 h-10 border p-1 rounded">
                        <button onclick="addEvent()" class="bg-blue-600 text-white flex-grow rounded text-sm font-semibold">Tambahkan</button>
                    </div>
                </div>
            </div>

            <div id="event-list-sidebar" class="text-xs space-y-1 max-h-40 overflow-y-auto"></div>
        </div>

        <div class="p-4 border-t bg-gray-50 space-y-2">
            <button onclick="exportToExcel()" class="w-full bg-emerald-700 text-white p-2 rounded font-bold hover:bg-emerald-800">
                <i class="fas fa-file-excel mr-2"></i> Export Excel
            </button>
            <button onclick="window.print()" class="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700">
                <i class="fas fa-print mr-2"></i> Cetak Kalender
            </button>
        </div>
    `;

    // Attach listeners
    attachInputListeners();
}

// ==================== AUTH & FIREBASE ====================
async function initAuth() {
    try {
        await signInAnonymously(auth);
    } catch (e) { console.error(e); }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadFromFirestore();
    }
});

// (Lanjutkan dengan fungsi loadFromFirestore, saveToFirestore, debounceSave, dll seperti kode asli yang sudah di-refactor)

// ==================== KALENDER RENDERING ====================
function updateLayoutConfig() { /* ... sama seperti sebelumnya ... */ }
function updateHeader() { /* ... */ }
function updateSignature() { /* ... */ }
function updateYearAndRender() { /* ... */ }

// ==================== EXPORT EXCEL YANG DIPERBAIKI ====================
window.exportToExcel = function() {
    const year = parseInt(document.getElementById('input-year').value) || 2026;
    const school = document.getElementById('input-school').value;

    let wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Semester
    let summaryData = [
        ["KALENDER PENDIDIKAN", school],
        [`TAHUN AJARAN ${year}/${year+1}`],
        [],
        ["Semester", "Bulan", "Hari Efektif"]
    ];

    // Generate summary per bulan (dari fungsi generateMonthTable logic)
    // ... (Anda bisa extend ini)

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

    // Sheet 2: Daftar Kegiatan Lengkap
    let eventData = [
        ["No", "Tanggal Mulai", "Tanggal Selesai", "Keterangan", "Jenis"]
    ];

    events.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach((evt, i) => {
        eventData.push([
            i+1,
            evt.start,
            evt.end,
            evt.desc,
            evt.isHoliday ? "LIBUR" : "KEGIATAN"
        ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(eventData);
    XLSX.utils.book_append_sheet(wb, ws2, "Daftar_Kegiatan");

    XLSX.writeFile(wb, `Kalender_Pendidikan_${school.replace(/ /g, '_')}_${year}.xlsx`);
};

window.addEvent = function() {
    // ... logic add event
    updateYearAndRender();
};

// Inisialisasi awal
function attachInputListeners() {
    // Attach semua input listener disini
}
