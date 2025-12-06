// --- 1. DATA CONFIGURATION ---
const GROUPS = [
    { id: 'ta', name: 'فريق الطاء', color: '#198754' },
    { id: 'sad', name: 'فريق الصاد', color: '#d4ac0d' }
];

const STUDENTS = [
    // Group Ta
    { id: 101, name: 'شهباس', group: 'ta' },
    { id: 102, name: 'هاشم شريف', group: 'ta' },
    { id: 103, name: 'محمد عاصف', group: 'ta' },
    { id: 104, name: 'صفوان', group: 'ta' },
    { id: 105, name: 'محمد أنشد', group: 'ta' },
    { id: 106, name: 'محمد شهل. تي.وي', group: 'ta' },
    { id: 107, name: 'محمد نسيب', group: 'ta' },

    // Group Sad
    { id: 201, name: 'محمد سهل. ان', group: 'sad' },
    { id: 202, name: 'محمد أنسل', group: 'sad' },
    { id: 203, name: 'محمد إصلاح', group: 'sad' },
    { id: 204, name: 'الحافظ عبد الله', group: 'sad' },
    { id: 205, name: 'محمد مشال', group: 'sad' },
    { id: 206, name: 'محمد جلشاد', group: 'sad' },
    { id: 207, name: 'محمد نهال', group: 'sad' },
    { id: 208, name: 'سيّد محمد عادل', group: 'sad' }
];

const PROGRAMS = [
    "مباراة الكلمات", "خلاصة", "المقالة", "القصة القصيرة", "الخط",
    "الخطابة", "الترجمة", "المناظرة", "صناعة المعجم", "لعبة المعاني"
];

// --- 2. STATE MANAGEMENT (LOCALSTORAGE) ---
let results = JSON.parse(localStorage.getItem('festResults')) || [];
let eventStatus = JSON.parse(localStorage.getItem('festStatus')) || {}; // { "Event Name": true/false }

// Initialize Event Status if empty
if (Object.keys(eventStatus).length === 0) {
    PROGRAMS.forEach(p => eventStatus[p] = false);
}

let currentStudentModalId = null;
let chartInstance = null;

function saveData() {
    localStorage.setItem('festResults', JSON.stringify(results));
    localStorage.setItem('festStatus', JSON.stringify(eventStatus));
    renderDashboard();
}

// --- 3. VIEW LOGIC ---
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('d-none'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('d-none');

    if (sectionId === 'student-results') renderStudentList();
    if (sectionId === 'program-results') renderProgramList();
    if (sectionId === 'home') renderDashboard();
}

// Scroll to poster section from menu
function scrollToPoster() {
    showSection('home');
    setTimeout(() => {
        const el = document.getElementById('poster-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

// Close offcanvas menu
function closeOffcanvas() {
    const offcanvasEl = document.getElementById('sideMenu');
    if (!offcanvasEl) return;
    const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
    offcanvas.hide();
}

// --- 4. DASHBOARD & CHARTS ---
function renderDashboard() {
    // Group totals
    let groupScores = { 'ta': 0, 'sad': 0 };
    results.forEach(r => {
        const s = STUDENTS.find(st => st.id == r.studentId);
        if (s) groupScores[s.group] += parseFloat(r.mark);
    });

    // Chart
    const canvas = document.getElementById('groupChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [GROUPS[0].name, GROUPS[1].name],
            datasets: [{
                data: [groupScores.ta, groupScores.sad],
                backgroundColor: [GROUPS[0].color, GROUPS[1].color]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Group ranking
    const rankingArray = [
        { code: 'ta', name: GROUPS[0].name, total: groupScores.ta },
        { code: 'sad', name: GROUPS[1].name, total: groupScores.sad }
    ].sort((a, b) => b.total - a.total);

    const leader = rankingArray[0];
    const leaderEl = document.getElementById('leading-group-name');
    if (leaderEl) leaderEl.innerText = leader.name;

    const rankingDiv = document.getElementById('group-ranking');
    if (rankingDiv) {
        rankingDiv.innerHTML = '';
        rankingArray.forEach((g, i) => {
            rankingDiv.innerHTML += `
                <div class="group-ranking-item">
                    <span>${i + 1}. ${g.name}</span>
                    <span>${g.total}</span>
                </div>`;
        });
    }

    // Progress bar
    const totalEvents = PROGRAMS.length;
    const completedEvents = Object.values(eventStatus).filter(v => v).length;
    const percent = Math.round((completedEvents / totalEvents) * 100);
    const pBar = document.getElementById('event-progress-bar');
    if (pBar) {
        pBar.style.width = percent + '%';
        pBar.innerText = percent + '%';
    }

    // Top 4 students
    const studentTotals = STUDENTS.map(s => {
        const total = results
            .filter(r => r.studentId == s.id)
            .reduce((sum, r) => sum + parseFloat(r.mark), 0);
        return { ...s, total };
    }).sort((a, b) => b.total - a.total).slice(0, 4);

    const topList = document.getElementById('top-students-list');
    if (topList) {
        topList.innerHTML = '';
        studentTotals.forEach((s, index) => {
            topList.innerHTML += `
                <div class="d-flex justify-content-between border-bottom py-2">
                    <span>${index + 1}. ${s.name} <small class="text-muted">(${getGroupName(s.group)})</small></span>
                    <span class="badge bg-success rounded-pill">${s.total}</span>
                </div>`;
        });
    }

    // Home card – all students grouped
    renderAllStudentsGrouped();
}

// Full group-wise list on HOME
function renderAllStudentsGrouped() {
    const container = document.getElementById('all-students-grouped-body');
    if (!container) return;

    let out = '';
    GROUPS.forEach(group => {
        const members = STUDENTS.filter(s => s.group === group.id);
        out += `<div class="mb-3">
                    <h6 class="mb-2" style="color:${group.color}; font-weight:700;">${group.name}</h6>
                    <div class="row">`;
        members.forEach(m => {
            out += `
                <div class="col-12 col-sm-6 col-md-4 mb-2">
                    <div class="p-2 border rounded d-flex justify-content-between align-items-center bg-white">
                        <span class="fw-semibold">${m.name}</span>
                        <small class="text-muted">${m.id}</small>
                    </div>
                </div>`;
        });
        out += `   </div>
                </div>`;
    });

    container.innerHTML = out;
}

function getGroupName(code) {
    const g = GROUPS.find(g => g.id === code);
    return g ? g.name : '';
}

// --- 5. STUDENT RESULTS ---
function renderStudentList() {
    const container = document.getElementById('student-list-container');
    if (!container) return;

    container.innerHTML = '';
    const search = (document.getElementById('search-student').value || '').toLowerCase();

    const studentData = STUDENTS.map(s => {
        const total = results
            .filter(r => r.studentId == s.id)
            .reduce((sum, r) => sum + parseFloat(r.mark), 0);
        return { ...s, total };
    });

    studentData.forEach(s => {
        if (s.name.toLowerCase().includes(search)) {
            container.innerHTML += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card student-card" onclick="openStudentModal(${s.id})">
                        <div class="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h6 class="mb-0 fw-bold">${s.name}</h6>
                                <small class="text-muted">ID: ${s.id} | ${getGroupName(s.group)}</small>
                            </div>
                            <h4 class="text-success mb-0">${s.total}</h4>
                        </div>
                    </div>
                </div>`;
        }
    });
}

function filterStudents() {
    renderStudentList();
}

function openStudentModal(id) {
    currentStudentModalId = id;
    const student = STUDENTS.find(s => s.id == id);
    if (!student) return;

    const sResults = results.filter(r => r.studentId == id);
    const total = sResults.reduce((sum, r) => sum + parseFloat(r.mark), 0);

    document.getElementById('modal-student-name').innerText = student.name;
    document.getElementById('modal-total-mark').innerText = total;
    document.getElementById('modal-group-name').innerText = getGroupName(student.group);

    const tbody = document.getElementById('modal-results-body');
    tbody.innerHTML = '';
    sResults.forEach(r => {
        tbody.innerHTML += `
            <tr>
                <td>${r.program}</td>
                <td>${r.place}</td>
                <td>${r.grade}</td>
                <td>${r.mark}</td>
            </tr>`;
    });

    new bootstrap.Modal(document.getElementById('studentModal')).show();
}

// --- 6. PROGRAM RESULTS (Item wise) ---
function renderProgramList() {
    const container = document.getElementById('program-list-container');
    if (!container) return;

    container.innerHTML = '';

    PROGRAMS.forEach(prog => {
        const progResults = results
            .filter(r => r.program === prog)
            .sort((a, b) => b.mark - a.mark);
        const isPublished = eventStatus[prog];

        let html = `
        <div class="col-md-6 mb-4">
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between ${isPublished ? 'bg-success text-white' : 'bg-secondary text-white'}">
                    <span>${prog}</span>
                    <small>${isPublished ? 'تم النشر' : 'جاري العمل'}</small>
                </div>
                <ul class="list-group list-group-flush">`;

        if (progResults.length > 0) {
            progResults.forEach(r => {
                const sName = STUDENTS.find(s => s.id == r.studentId)?.name || 'Unknown';
                html += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span>${sName}</span>
                            <small class="text-muted"> (${r.place} - ${r.grade})</small>
                        </div>
                            <span class="fw-bold">${r.mark}</span>
                    </li>`;
            });
        } else {
            html += `<li class="list-group-item text-center text-muted">لا توجد نتائج بعد</li>`;
        }

        html += `</ul></div></div>`;
        container.innerHTML += html;
    });
}

// --- 7. ADMIN FUNCTIONS ---
function adminLogin() {
    const u = document.getElementById('admin-user').value;
    const p = document.getElementById('admin-pass').value;

    if (u === "Uvis Af" && p === "0.0.0") {
        document.getElementById('admin-login').classList.add('d-none');
        document.getElementById('admin-dashboard').classList.remove('d-none');
        document.getElementById('login-error').classList.add('d-none');
        renderAdminResultsTable();
    } else {
        document.getElementById('login-error').classList.remove('d-none');
    }
}

function adminLogout() {
    document.getElementById('admin-dashboard').classList.add('d-none');
    document.getElementById('admin-login').classList.remove('d-none');
    document.getElementById('admin-pass').value = '';
}

function setupAdminDropdowns() {
    const pSelect = document.getElementById('res-program');
    const sSelect = document.getElementById('res-student');

    if (pSelect) PROGRAMS.forEach(p => pSelect.innerHTML += `<option value="${p}">${p}</option>`);
    if (sSelect) STUDENTS.forEach(s => sSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.id})</option>`);
}

function addResult() {
    const newData = {
        id: Date.now(),
        program: document.getElementById('res-program').value,
        studentId: document.getElementById('res-student').value,
        place: document.getElementById('res-place').value,
        grade: document.getElementById('res-grade').value,
        mark: document.getElementById('res-mark').value
    };

    results.push(newData);
    saveData();
    renderAdminResultsTable();
    alert('تمت إضافة النتيجة');
}

function deleteResult(id) {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    results = results.filter(r => r.id !== id);
    saveData();
    renderAdminResultsTable();
}

function renderAdminResultsTable() {
    const tbody = document.getElementById('admin-results-table');
    if (!tbody) return;

    tbody.innerHTML = '';
    results.slice().reverse().forEach(r => {
        const sName = STUDENTS.find(s => s.id == r.studentId)?.name || 'Unknown';
        tbody.innerHTML += `
            <tr>
                <td>${r.program}</td>
                <td>${sName}</td>
                <td>${r.mark}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteResult(${r.id})">X</button></td>
            </tr>`;
    });
}

function renderEventStatusAdmin() {
    const list = document.getElementById('event-status-list');
    if (!list) return;

    list.innerHTML = '';
    PROGRAMS.forEach(p => {
        const safeId = 'status-' + p.replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
        const checked = eventStatus[p] ? 'checked' : '';
        list.innerHTML += `
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="${safeId}" ${checked} onchange="toggleEventStatus('${p}')">
                <label class="form-check-label" for="${safeId}">${p}</label>
            </div>`;
    });
}

function toggleEventStatus(progName) {
    eventStatus[progName] = !eventStatus[progName];
    saveData();
}

// --- 8. PRINT FUNCTION ---
function printStudentResult() {
    const s = STUDENTS.find(st => st.id == currentStudentModalId);
    if (!s) return;

    const sResults = results.filter(r => r.studentId == s.id);
    const total = sResults.reduce((sum, r) => sum + parseFloat(r.mark), 0);

    document.getElementById('print-name').innerText = s.name;
    document.getElementById('print-group').innerText = getGroupName(s.group);
    document.getElementById('print-id').innerText = s.id;
    document.getElementById('print-total').innerText = total;
    document.getElementById('print-date').innerText = new Date().toLocaleString();

    const tbody = document.getElementById('print-tbody');
    tbody.innerHTML = '';
    sResults.forEach((r, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${r.program}</td>
                <td>${r.place}</td>
                <td>${r.grade}</td>
                <td>${r.mark}</td>
            </tr>`;
    });

    window.print();
}

// --- 9. INIT ---
function init() {
    setupAdminDropdowns();
    renderEventStatusAdmin();
    renderDashboard();
    showSection('home');
}

init();

// Disable right click
document.addEventListener('contextmenu', e => e.preventDefault());
