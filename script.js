import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let firebaseConfig = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : {
    apiKey: "AIzaSyCAVt8FSDNN72OtVDjNcX060apWY7um4EI",
    authDomain: "kalender-pendidikan-ad13c.firebaseapp.com",
    projectId: "kalender-pendidikan-ad13c",
    storageBucket: "kalender-pendidikan-ad13c.firebasestorage.app",
    messagingSenderId: "396729831545",
    appId: "1:396729831545:web:6e4c220690f8b9fb0444a8"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'kalender-default';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let isDataLoaded = false;
let events = [];
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// Cloud Status
const cloudText = document.getElementById('cloud-text');
const cloudStatus = document.getElementById('cloud-status');

function setCloudStatus(status) {
    if (status === 'saving') {
        cloudText.innerText = "Menyimpan...";
        cloudStatus.classList.replace('text-gray-500', 'text-blue-500');
    } else if (status === 'saved') {
        cloudText.innerText = "Tersimpan otomatis";
        cloudStatus.classList.replace('text-blue-500', 'text-green-500');
        setTimeout(() => cloudStatus.classList.replace('text-green-500', 'text-gray-500'), 2000);
    } else if (status === 'error') {
        cloudText.innerText = "Gagal menyimpan!";
        cloudStatus.classList.replace('text-gray-500', 'text-red-500');
    }
}

// Auth & Firebase Logic
async function initAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        setCloudStatus('error');
        if (!isDataLoaded) loadDefaultEvents();
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadFromFirestore();
    }
});

function loadFromFirestore() {
    if (!currentUser) return;
    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data');
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && !isDataLoaded) {
            const data = docSnap.data();
            document.getElementById('input-school').value = data.school || "";
            document.getElementById('input-year').value = data.year || 2026;
            document.getElementById('input-kepsek').value = data.kepsek || "";
            document.getElementById('input-nip').value = data.nip || "";
            document.getElementById('input-ttd-date').value = data.ttdDate || "";
            document.getElementById('input-paper').value = data.paper || "F4";
            document.getElementById('input-orientation').value = data.orientation || "portrait";
            events = data.events || [];
            updateLayoutConfig();
            updateHeader();
            updateSignature();
            updateYearAndRender();
            isDataLoaded = true;
            setCloudStatus('saved');
        } else if (!docSnap.exists() && !isDataLoaded) {
            loadDefaultEvents();
            isDataLoaded = true;
            saveToFirestore();
        }
    });
}

function saveToFirestore() {
    if (!currentUser) return;
    const data = {
        school: document.getElementById('input-school').value,
        year: document.getElementById('input-year').value,
        kepsek: document.getElementById('input-kepsek').value,
        nip: document.getElementById('input-nip').value,
        ttdDate: document.getElementById('input-ttd-date').value,
        paper: document.getElementById('input-paper').value,
        orientation: document.getElementById('input-orientation').value,
        events: events
    };
    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data');
    setDoc(docRef, data).then(() => setCloudStatus('saved')).catch(() => setCloudStatus('error'));
}

// UI Controllers
let saveTimeout = null;
function debounceSave() { if (!isDataLoaded) return; setCloudStatus('saving'); clearTimeout(saveTimeout); saveTimeout = setTimeout(saveToFirestore, 1000); }

window.addEvent = function() {
    const start = document.getElementById('event-start-date').value;
    const desc = document.getElementById('event-desc').value;
    if(!start || !desc) return alert("Isi tanggal dan keterangan!");
    events.push({ id: Date.now().toString(), start: start, end: document.getElementById('event-end-date').value || start, desc: desc, color: document.getElementById('event-color').value, isHoliday: document.getElementById('event-is-holiday').checked });
    updateYearAndRender();
    debounceSave();
}

window.removeEvent = function(id) {
    events = events.filter(e => e.id !== id);
    updateYearAndRender();
    debounceSave();
}

window.exportToExcel = function() {
    let dataArr = [["KALENDER PENDIDIKAN " + document.getElementById('display-year').value], [document.getElementById('input-school').value], [], ["Tanggal Mulai", "Tanggal Selesai", "Keterangan", "Sifat"]];
    [...events].sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(e => dataArr.push([e.start, e.end, e.desc, e.isHoliday ? "Libur" : "Efektif"]));
    const ws = XLSX.utils.aoa_to_sheet(dataArr);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kalender");
    XLSX.writeFile(wb, "Kalender_Pendidikan.xlsx");
}

function updateLayoutConfig() {
    const paper = document.getElementById('input-paper').value;
    const orient = document.getElementById('input-orientation').value;
    let width = (paper === 'F4' ? (orient === 'portrait' ? '215mm' : '330mm') : (orient === 'portrait' ? '210mm' : '297mm'));
    let height = (paper === 'F4' ? (orient === 'portrait' ? '330mm' : '215mm') : (orient === 'portrait' ? '297mm' : '210mm'));
    
    let styleEl = document.getElementById('dynamic-print-style') || document.createElement('style');
    styleEl.id = 'dynamic-print-style';
    styleEl.innerHTML = `@media print { @page { size: ${width} ${height}; margin: 0; } }`;
    document.head.appendChild(styleEl);

    document.querySelectorAll('.page').forEach(p => {
        p.style.width = width; p.style.height = height;
        p.classList.toggle('landscape', orient === 'landscape');
        p.classList.toggle('portrait', orient === 'portrait');
    });
}

// Call init functions
['input-school', 'input-year', 'input-kepsek', 'input-nip', 'input-ttd-date', 'input-paper', 'input-orientation'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => { updateLayoutConfig(); updateHeader(); updateSignature(); updateYearAndRender(); debounceSave(); });
});

function updateHeader() { const school = document.getElementById('input-school').value; document.getElementById('title-school-1').innerText = document.getElementById('title-school-2').innerText = school; }
function updateSignature() {
    const name = document.getElementById('input-kepsek').value;
    const nip = document.getElementById('input-nip').value;
    const date = document.getElementById('input-ttd-date').value;
    document.querySelectorAll('.kepsek-name-display').forEach(el => el.innerText = name);
    document.querySelectorAll('.kepsek-nip-display').forEach(el => el.innerText = "NIP. " + nip);
    document.querySelectorAll('.ttd-date-display').forEach(el => el.innerText = date);
}

function updateYearAndRender() {
    const startYear = parseInt(document.getElementById('input-year').value) || 2026;
    const thnAjaran = `${startYear}/${startYear + 1}`;
    document.getElementById('display-year').value = thnAjaran;
    document.getElementById('title-year-1').innerText = document.getElementById('title-year-2').innerText = `TAHUN AJARAN ${thnAjaran}`;
    renderCalendars(startYear, startYear + 1);
}

function getEventForDate(dStr) {
    let t = new Date(dStr).getTime();
    return events.find(e => t >= new Date(e.start).getTime() && t <= new Date(e.end).getTime());
}

function renderCalendars(sYear, eYear) {
    const sem1 = document.getElementById('grid-sem1'); sem1.innerHTML = '';
    const sem2 = document.getElementById('grid-sem2'); sem2.innerHTML = '';
    for (let i = 6; i <= 11; i++) sem1.appendChild(generateMonthTable(i, sYear));
    for (let i = 0; i <= 5; i++) sem2.appendChild(generateMonthTable(i, eYear));
    renderLegends();
    renderEventListSidebar();
}

function generateMonthTable(mIdx, year) {
    const div = document.createElement('div');
    div.innerHTML = `<div class="flex justify-between items-center bg-gray-100 py-1 px-1 border border-gray-300 border-b-0"><span class="font-bold text-xs truncate">${monthNames[mIdx]} ${year}</span></div>`;
    const table = document.createElement('table');
    table.className = "calendar-table";
    table.innerHTML = `<thead><tr><th class="sunday">M</th><th>S</th><th>S</th><th>R</th><th>K</th><th>J</th><th>S</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    const firstDay = new Date(year, mIdx, 1).getDay();
    const daysIn = new Date(year, mIdx + 1, 0).getDate();
    let d = 1;
    for (let i = 0; i < 6; i++) {
        let tr = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let td = document.createElement('td');
            if ((i === 0 && j < firstDay) || d > daysIn) { } 
            else {
                const dateString = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                let evt = getEventForDate(dateString);
                td.innerHTML = `<span class="date-number ${evt ? 'bg-opacity-50' : ''}" style="${evt ? `background-color:${evt.color}; color:white; font-weight:bold;` : ''}">${d}</span>`;
                d++;
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    div.appendChild(table);
    return div;
}

function renderLegends() {
    document.getElementById('legend-sem1').innerHTML = document.getElementById('legend-sem2').innerHTML = '';
    events.sort((a, b) => new Date(a.start) - new Date(b.start)).forEach(evt => {
        const d = new Date(evt.start);
        const html = `<div class="flex items-start gap-1.5 text-[9px] mb-1"><div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${evt.color}"></div><span>${evt.start} : ${evt.desc}</span></div>`;
        if (d.getMonth() >= 6) document.getElementById('legend-sem1').innerHTML += html;
        else document.getElementById('legend-sem2').innerHTML += html;
    });
}

function renderEventListSidebar() {
    const list = document.getElementById('event-list-sidebar'); list.innerHTML = '';
    events.forEach(e => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-start bg-white p-2 border rounded";
        div.innerHTML = `<div class="flex items-start gap-1 text-[10px]"><div class="w-2 h-2 rounded-full mt-1" style="background-color:${e.color}"></div><div><span class="font-bold">${e.start}</span><br>${e.desc}</div></div><button onclick="window.removeEvent('${e.id}')" class="text-red-500"><i class="fas fa-trash-alt"></i></button>`;
        list.appendChild(div);
    });
}

function loadDefaultEvents() {
    events = [{ id: '1', start: '2026-07-13', end: '2026-07-15', desc: 'MPLS', color: '#3b82f6', isHoliday: false }];
    updateYearAndRender();
}

initAuth();
