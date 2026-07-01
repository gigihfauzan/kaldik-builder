import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Konfigurasi Firebase dari User
let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = JSON.parse(__firebase_config);
} else {
    firebaseConfig = {
        apiKey: "AIzaSyCAVt8FSDNN72OtVDjNcX060apWY7um4EI",
        authDomain: "kalender-pendidikan-ad13c.firebaseapp.com",
        projectId: "kalender-pendidikan-ad13c",
        storageBucket: "kalender-pendidikan-ad13c.firebasestorage.app",
        messagingSenderId: "396729831545",
        appId: "1:396729831545:web:6e4c220690f8b9fb0444a8"
    };
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kalender-default';

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let isDataLoaded = false;

// Variables Global Kalender
const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let events = [];

// Referensi UI Status Cloud
const cloudText = document.getElementById('cloud-text');
const cloudStatus = document.getElementById('cloud-status');

function setCloudStatus(status) {
    if (status === 'saving') {
        cloudText.innerText = "Menyimpan ke cloud...";
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

// --- Logika Firebase ---
async function initAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        setCloudStatus('error');
        document.getElementById('cloud-text').innerText = "Offline (Cek Auth Firebase)";
        
        // Fallback: Jika gagal auth, muat kalender default agar tidak blank
        if (!isDataLoaded) {
            loadDefaultEvents();
            isDataLoaded = true;
        }
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
    // Gunakan path spesifik pengguna 
    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data');
    
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && !isDataLoaded) {
            const data = docSnap.data();
            
            // Populate UI
            document.getElementById('input-school').value = data.school || "";
            document.getElementById('input-year').value = data.year || 2026;
            document.getElementById('input-kepsek').value = data.kepsek || "";
            document.getElementById('input-nip').value = data.nip || "";
            document.getElementById('input-ttd-date').value = data.ttdDate || "";
            document.getElementById('input-paper').value = data.paper || "F4";
            document.getElementById('input-orientation').value = data.orientation || "portrait";
            
            if(data.margins) {
                document.getElementById('margin-top').value = data.margins.t || 10;
                document.getElementById('margin-right').value = data.margins.r || 10;
                document.getElementById('margin-bottom').value = data.margins.b || 10;
                document.getElementById('margin-left').value = data.margins.l || 10;
            }
            
            events = data.events || [];
            
            // Render UI
            updateLayoutConfig();
            updateHeader();
            updateSignature();
            updateYearAndRender();
            
            isDataLoaded = true; // Jangan overwrite dari cloud saat kita sedang mengedit
            setCloudStatus('saved');
        } else if (!docSnap.exists() && !isDataLoaded) {
            // Jika data belum ada, muat event default
            loadDefaultEvents();
            isDataLoaded = true;
            saveToFirestore();
        }
    }, (error) => {
        console.error("Firestore Listen Error:", error);
    });
}

// Debounce untuk menyimpan otomatis
let saveTimeout = null;
function debounceSave() {
    if (!isDataLoaded) return;
    setCloudStatus('saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirestore, 1000);
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
        margins: {
            t: document.getElementById('margin-top').value,
            r: document.getElementById('margin-right').value,
            b: document.getElementById('margin-bottom').value,
            l: document.getElementById('margin-left').value,
        },
        events: events
    };
    
    const docRef = doc(db, 'artifacts', appId, 'users', currentUser.uid, 'settings', 'data');
    setDoc(docRef, data).then(() => {
        setCloudStatus('saved');
    }).catch(err => {
        console.error(err);
        setCloudStatus('error');
    });
}

// --- Logika UI Kalender ---

// Listener untuk text & margins (Memicu save)
const inputsToListen = [
    'input-school', 'input-year', 'input-kepsek', 'input-nip', 'input-ttd-date',
    'input-paper', 'input-orientation', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
];

inputsToListen.forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
        if (id.startsWith('margin') || id.startsWith('input-paper') || id.startsWith('input-orientation')) {
            updateLayoutConfig();
        } else if (id === 'input-school') {
            updateHeader();
        } else if (id.includes('kepsek') || id.includes('nip') || id.includes('ttd')) {
            updateSignature();
        } else if (id === 'input-year') {
            updateYearAndRender();
        }
        debounceSave();
    });
});

function updateLayoutConfig() {
    const paper = document.getElementById('input-paper').value;
    const orientation = document.getElementById('input-orientation').value;
    
    const mt = document.getElementById('margin-top').value || 10;
    const mr = document.getElementById('margin-right').value || 10;
    const mb = document.getElementById('margin-bottom').value || 10;
    const ml = document.getElementById('margin-left').value || 10;
    
    let width, height;
    if (paper === 'F4') {
        width = orientation === 'portrait' ? '215mm' : '330mm';
        height = orientation === 'portrait' ? '330mm' : '215mm';
    } else {
        width = orientation === 'portrait' ? '210mm' : '297mm';
        height = orientation === 'portrait' ? '297mm' : '210mm';
    }

    let printStyle = document.getElementById('dynamic-print-style');
    if (!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'dynamic-print-style';
        document.head.appendChild(printStyle);
    }
    
    printStyle.innerHTML = `@media print { @page { size: ${width} ${height}; margin: 0; } }`;

    document.querySelectorAll('.page').forEach(page => {
        page.style.width = width;
        page.style.height = height;
        page.style.padding = `${mt}mm ${mr}mm ${mb}mm ${ml}mm`;
        
        if (orientation === 'landscape') {
            page.classList.add('landscape');
            page.classList.remove('portrait');
        } else {
            page.classList.add('portrait');
            page.classList.remove('landscape');
        }
    });
}

function updateHeader() {
    const school = document.getElementById('input-school').value;
    document.getElementById('title-school-1').innerText = school;
    document.getElementById('title-school-2').innerText = school;
}

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
    const endYear = startYear + 1;
    const thnAjaran = `${startYear}/${endYear}`;
    
    document.getElementById('display-year').value = thnAjaran;
    document.getElementById('title-year-1').innerText = `TAHUN AJARAN ${thnAjaran}`;
    document.getElementById('title-year-2').innerText = `TAHUN AJARAN ${thnAjaran}`;

    renderCalendars(startYear, endYear);
}

function getEventForDate(dateStr) {
    let targetTime = new Date(dateStr).getTime();
    for(let evt of events) {
        let startTime = new Date(evt.start).getTime();
        let endTime = evt.end ? new Date(evt.end).getTime() : startTime;
        if(targetTime >= startTime && targetTime <= endTime) {
            return evt;
        }
    }
    return null;
}

// Fungsi dilekatkan ke window object agar bisa dipanggil dari HTML (onclick)
window.addEvent = function() {
    const startVal = document.getElementById('event-start-date').value;
    const endVal = document.getElementById('event-end-date').value;
    const descVal = document.getElementById('event-desc').value;
    const colorVal = document.getElementById('event-color').value;
    const isHoliday = document.getElementById('event-is-holiday').checked;

    if(!startVal || !descVal) {
        alert("Tanggal Mulai dan Keterangan harus diisi!");
        return;
    }

    events.push({
        id: Date.now().toString(),
        start: startVal,
        end: endVal || startVal,
        desc: descVal,
        color: colorVal,
        isHoliday: isHoliday
    });
    
    document.getElementById('event-start-date').value = '';
    document.getElementById('event-end-date').value = '';
    document.getElementById('event-desc').value = '';
    updateYearAndRender();
    debounceSave();
}

window.removeEvent = function(id) {
    events = events.filter(e => e.id !== id);
    updateYearAndRender();
    debounceSave();
}

// Export ke File Excel (.xlsx) menggunakan SheetJS
window.exportToExcel = function() {
    if(typeof XLSX === 'undefined') {
        alert("Library Excel belum termuat, mohon tunggu beberapa detik atau pastikan internet aktif.");
        return;
    }

    // Membangun array data dua dimensi
    let dataArr = [
        ["KALENDER PENDIDIKAN TAHUN AJARAN " + document.getElementById('display-year').value],
        [document.getElementById('input-school').value],
        [],
        ["Tanggal Mulai", "Tanggal Selesai", "Keterangan", "Sifat Libur/Kegiatan"]
    ];

    // Urutkan event sebelum diexport
    let sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));

    sortedEvents.forEach(evt => {
        dataArr.push([
            evt.start,
            evt.end,
            evt.desc,
            evt.isHoliday ? "Libur (Mengurangi HE)" : "Kegiatan Efektif"
        ]);
    });

    // Konversi ke worksheet Excel
    const ws = XLSX.utils.aoa_to_sheet(dataArr);
    
    // Atur lebar kolom agar rapi
    ws['!cols'] = [ {wch: 15}, {wch: 15}, {wch: 50}, {wch: 25} ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar_Kegiatan");
    
    // Unduh file
    XLSX.writeFile(wb, "Kalender_Pendidikan_Sekolah.xlsx");
}

function renderCalendars(startYear, endYear) {
    const sem1Container = document.getElementById('grid-sem1');
    const sem2Container = document.getElementById('grid-sem2');
    
    sem1Container.innerHTML = '';
    sem2Container.innerHTML = '';

    for (let i = 6; i <= 11; i++) {
        sem1Container.appendChild(generateMonthTable(i, startYear));
    }
    for (let i = 0; i <= 5; i++) {
        sem2Container.appendChild(generateMonthTable(i, endYear));
    }

    renderLegends();
    renderEventListSidebar();
}

function generateMonthTable(monthIndex, year) {
    const container = document.createElement('div');
    
    const headerDiv = document.createElement('div');
    headerDiv.className = "flex justify-between items-center bg-gray-100 py-1 px-1 border border-gray-300 border-b-0";
    headerDiv.innerHTML = `
        <span class="font-bold text-xs truncate">${monthNames[monthIndex]} ${year}</span>
        <span class="text-[10px] font-bold text-blue-700 bg-blue-100 px-1 rounded flex-shrink-0" id="he-${year}-${monthIndex}">HE: 0</span>
    `;
    container.appendChild(headerDiv);

    const table = document.createElement('table');
    table.className = "calendar-table";
    
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
        <th class="sunday">M</th> <th>S</th> <th>S</th> <th>R</th> <th>K</th> <th>J</th> <th>S</th>
    </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let date = 1;
    let effectiveDays = 0;

    for (let i = 0; i < 6; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 7; j++) {
            let cell = document.createElement('td');
            if (i === 0 && j < firstDay) {
                // Kosong
            } else if (date > daysInMonth) {
                // Kosong
            } else {
                const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                let matchedEvent = getEventForDate(dateString);
                
                let dateSpan = document.createElement('span');
                dateSpan.className = "date-number";
                dateSpan.innerText = date;

                let isSunday = (j === 0);
                if (isSunday) cell.classList.add('sunday');

                if (matchedEvent) {
                    dateSpan.style.backgroundColor = matchedEvent.color;
                    dateSpan.style.color = 'white';
                    dateSpan.style.fontWeight = 'bold';
                }

                let isHoliday = matchedEvent ? matchedEvent.isHoliday : false;
                if (!isSunday && !isHoliday) {
                    effectiveDays++;
                }

                cell.appendChild(dateSpan);
                date++;
            }
            row.appendChild(cell);
        }
        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);
    container.querySelector(`#he-${year}-${monthIndex}`).innerText = `HE:${effectiveDays}`;

    return container;
}

function renderLegends() {
    const startYear = parseInt(document.getElementById('input-year').value) || 2026;
    const endYear = startYear + 1;
    
    const legendSem1 = document.getElementById('legend-sem1');
    const legendSem2 = document.getElementById('legend-sem2');
    legendSem1.innerHTML = '';
    legendSem2.innerHTML = '';

    let hasEvent1 = false;
    let hasEvent2 = false;

    let sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));

    sortedEvents.forEach(evt => {
        const d1 = new Date(evt.start);
        const d2 = new Date(evt.end);
        
        let dateText = "";
        if (evt.start === evt.end) {
            dateText = `${d1.getDate()} ${monthNames[d1.getMonth()]}`;
        } else if (d1.getMonth() === d2.getMonth()) {
            dateText = `${d1.getDate()} - ${d2.getDate()} ${monthNames[d1.getMonth()]}`;
        } else {
            dateText = `${d1.getDate()} ${monthNames[d1.getMonth()]} - ${d2.getDate()} ${monthNames[d2.getMonth()]}`;
        }

        const itemHtml = `
            <div class="flex items-start gap-1.5 text-[9px] break-words mb-1">
                <div class="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-[2px]" style="background-color: ${evt.color}"></div>
                <span class="leading-tight text-gray-800"><strong>${dateText}</strong> : ${evt.desc}</span>
            </div>
        `;

        if (d1.getFullYear() === startYear && d1.getMonth() >= 6) {
            legendSem1.innerHTML += itemHtml;
            hasEvent1 = true;
        } else if (d1.getFullYear() === endYear && d1.getMonth() <= 5) {
            legendSem2.innerHTML += itemHtml;
            hasEvent2 = true;
        }
    });

    if(!hasEvent1) legendSem1.innerHTML = '<span class="text-gray-400 italic text-[10px]">Tidak ada kegiatan di semester ini.</span>';
    if(!hasEvent2) legendSem2.innerHTML = '<span class="text-gray-400 italic text-[10px]">Tidak ada kegiatan di semester ini.</span>';
}

function renderEventListSidebar() {
    const sidebarList = document.getElementById('event-list-sidebar');
    sidebarList.innerHTML = '';
    let sortedEvents = [...events].sort((a, b) => new Date(a.start) - new Date(b.start));
    
    sortedEvents.forEach(evt => {
        let dateDisplay = evt.start === evt.end ? evt.start : `${evt.start} s/d ${evt.end}`;
        const div = document.createElement('div');
        div.className = "flex justify-between items-start bg-white p-2 border rounded";
        div.innerHTML = `
            <div class="flex items-start gap-1 w-4/5 text-[10px]">
                <div class="w-2 h-2 rounded-full flex-shrink-0 mt-1" style="background-color: ${evt.color}"></div>
                <div class="flex flex-col">
                    <span class="font-bold text-gray-700">${dateDisplay}</span>
                    <span class="text-gray-500 leading-tight">${evt.desc}</span>
                </div>
            </div>
            <button onclick="window.removeEvent('${evt.id}')" class="text-red-500 hover:text-red-700 ml-1 mt-1 p-1"><i class="fas fa-trash-alt"></i></button>
        `;
        sidebarList.appendChild(div);
    });
}

function loadDefaultEvents() {
    events = [];
    events.push({ id: 'ex1', start: '2026-07-13', end: '2026-07-15', desc: 'Masa Pengenalan Lingkungan Sekolah (MPLS)', color: '#3b82f6', isHoliday: false });
    events.push({ id: 'ex2', start: '2026-08-17', end: '2026-08-17', desc: 'HUT Kemerdekaan RI (Upacara Bendera)', color: '#ef4444', isHoliday: true });
    events.push({ id: 'ex3', start: '2026-12-24', end: '2026-12-31', desc: 'Libur Semester Ganjil & Natal', color: '#ef4444', isHoliday: true });
    events.push({ id: 'ex4', start: '2027-01-01', end: '2027-01-03', desc: 'Libur Tahun Baru Masehi', color: '#ef4444', isHoliday: true });
    events.push({ id: 'ex5', start: '2027-05-02', end: '2027-05-02', desc: 'Hari Pendidikan Nasional', color: '#10b981', isHoliday: false });
    
    updateLayoutConfig();
    updateHeader();
    updateSignature();
    updateYearAndRender();
}

// Jalankan Autentikasi Firebase Pertama Kali
initAuth();
