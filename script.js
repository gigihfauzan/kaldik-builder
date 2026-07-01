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

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => {
    renderControlPanel();
    renderPreviewSkeleton();
    initAuth();
});

// Render Control Panel
function renderControlPanel() {
    // ... (kode panel sama seperti sebelumnya, saya ringkas untuk hemat tempat)
    document.getElementById("control-panel").innerHTML = `...`; // Gunakan kode panel dari respons sebelumnya
    attachInputListeners();
}

// Render Preview Halaman (PENTING!)
function renderPreviewSkeleton() {
    const preview = document.getElementById("preview-container");
    preview.innerHTML = `
        <div id="page-sem1" class="page portrait">
            <div class="text-center header-section">
                <h1 class="font-bold uppercase tracking-wider">KALENDER PENDIDIKAN</h1>
                <h2 class="font-bold uppercase text-blue-800" id="title-school-1">SMP NEGERI 2 KEDUNGBANTENG</h2>
                <h3 class="font-semibold" id="title-year-1">TAHUN AJARAN 2026/2027</h3>
                <h4 class="font-semibold bg-gray-800 text-white rounded">SEMESTER 1 (GANJIL)</h4>
            </div>
            <div id="grid-sem1" class="month-grid"></div>
            <div class="footer-container mt-6">
                <div class="legend-container border border-gray-400 p-3 text-xs rounded">
                    <h5 class="font-bold mb-2">Keterangan Kegiatan / Libur:</h5>
                    <div id="legend-sem1" class="legend-grid grid gap-2"></div>
                </div>
                <div class="ttd-section text-center text-sm">
                    <div class="mt-8">
                        <p class="ttd-date-display">Kedungbanteng, 12 Juli 2026</p>
                        <p>Kepala Sekolah,</p>
                        <div class="signature-space mt-12">
                            <p class="font-bold underline kepsek-name-display">Nama Kepsek, S.Pd., M.Pd.</p>
                            <p class="kepsek-nip-display">NIP. 19800101 200501 1 001</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="page-sem2" class="page portrait">
            <div class="text-center header-section">
                <h1 class="font-bold uppercase tracking-wider">KALENDER PENDIDIKAN</h1>
                <h2 class="font-bold uppercase text-blue-800" id="title-school-2">SMP NEGERI 2 KEDUNGBANTENG</h2>
                <h3 class="font-semibold" id="title-year-2">TAHUN AJARAN 2026/2027</h3>
                <h4 class="font-semibold bg-gray-800 text-white rounded">SEMESTER 2 (GENAP)</h4>
            </div>
            <div id="grid-sem2" class="month-grid"></div>
            <div class="footer-container mt-6">
                <div class="legend-container border border-gray-400 p-3 text-xs rounded">
                    <h5 class="font-bold mb-2">Keterangan Kegiatan / Libur:</h5>
                    <div id="legend-sem2" class="legend-grid grid gap-2"></div>
                </div>
                <div class="ttd-section text-center text-sm">
                    <div class="mt-8">
                        <p class="ttd-date-display">Kedungbanteng, 12 Juli 2026</p>
                        <p>Kepala Sekolah,</p>
                        <div class="signature-space mt-12">
                            <p class="font-bold underline kepsek-name-display">Nama Kepsek, S.Pd., M.Pd.</p>
                            <p class="kepsek-nip-display">NIP. 19800101 200501 1 001</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== AUTH ====================
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

// Load data & render
function loadFromFirestore() {
    if (!currentUser) return;
    // ... (logika firestore sama)
    loadDefaultEvents(); // Sekarang aman karena preview sudah dirender
}

// ==================== UPDATE FUNCTIONS ====================
function updateAll() {
    updateLayoutConfig();
    updateHeader();
    updateSignature();
    updateYearAndRender();
}

function updateHeader() {
    const school = document.getElementById("input-school").value || "NAMA SEKOLAH";
    document.getElementById("title-school-1").innerText = school;
    document.getElementById("title-school-2").innerText = school;
}

function updateSignature() {
    const name = document.getElementById("input-kepsek").value || "";
    const nip = document.getElementById("input-nip").value || "";
    const date = document.getElementById("input-ttd-date").value || "";

    document.querySelectorAll(".kepsek-name-display").forEach(el => el.innerText = name);
    document.querySelectorAll(".kepsek-nip-display").forEach(el => el.innerText = nip ? "NIP. " + nip : "");
    document.querySelectorAll(".ttd-date-display").forEach(el => el.innerText = date);
}

// Lanjutkan dengan fungsi-fungsi lain (updateLayoutConfig, renderCalendars, addEvent, exportToExcel, dll)

function loadDefaultEvents() {
    events = [
        { id: "ex1", start: "2026-07-13", end: "2026-07-15", desc: "MPLS", color: "#3b82f6", isHoliday: false },
        { id: "ex2", start: "2026-08-17", end: "2026-08-17", desc: "HUT RI", color: "#ef4444", isHoliday: true }
    ];
    updateAll();
}

window.addEvent = function() { /* ... */ };
window.removeEvent = function() { /* ... */ };
window.exportToExcel = function() { /* ... gunakan versi yang sudah diperbaiki */ };

// Attach listeners, renderCalendars, dll (bisa dilengkapi dari kode sebelumnya)

console.log("✅ Kalender Generator siap");
