/********************************
 * 1. FIREBASE CONFIG & INIT
 ********************************/
const firebaseConfig = {
  apiKey: "AIzaSyAQPciF9UUP6Z-spWtlApSrxZygQ7r2xRE",
  authDomain: "mahragan-al-dhad.firebaseapp.com",
  databaseURL: "https://mahragan-al-dhad-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mahragan-al-dhad",
  storageBucket: "mahragan-al-dhad.firebasestorage.app",
  messagingSenderId: "229568970630",
  appId: "1:229568970630:web:4ee28644d86cebbb293607",
  measurementId: "G-8D1PMK3879"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

/********************************
 * 2. STATIC DATA
 ********************************/
const GROUPS = [
  { id: 'ta',  name: 'فريق الطاء', color: '#198754' },
  { id: 'sad', name: 'فريق الصاد', color: '#d4ac0d' }
];

const STUDENTS = [
  { id: 101, name: 'شهباس',             group: 'ta' },
  { id: 102, name: 'هاشم شريف',         group: 'ta' },
  { id: 103, name: 'محمد عاصف',         group: 'ta' },
  { id: 104, name: 'صفوان',             group: 'ta' },
  { id: 105, name: 'محمد أنشد',         group: 'ta' },
  { id: 106, name: 'محمد شهل. تي.وي',   group: 'ta' },
  { id: 107, name: 'محمد نسيب',         group: 'ta' },

  { id: 201, name: 'محمد سهل. ان',       group: 'sad' },
  { id: 202, name: 'محمد أنسل',         group: 'sad' },
  { id: 203, name: 'محمد إصلاح',        group: 'sad' },
  { id: 204, name: 'الحافظ عبد الله',   group: 'sad' },
  { id: 205, name: 'محمد مشال',         group: 'sad' },
  { id: 206, name: 'محمد جلشاد',        group: 'sad' },
  { id: 207, name: 'محمد نهال',         group: 'sad' },
  { id: 208, name: 'سيّد محمد عادل',    group: 'sad' }
];

const PROGRAMS = [
  "مباراة الكلمات", "خلاصة", "المقالة", "القصة القصيرة", "الخط",
  "الخطابة", "الترجمة", "المناظرة", "صناعة المعجم", "لعبة المعاني"
];

/********************************
 * 3. GLOBAL STATE
 ********************************/
let results = [];
let eventStatus = {};
let currentStudentModalId = null;
let groupChartInstance = null;

/********************************
 * 4. INITIALIZATION
 ********************************/
window.addEventListener('load', () => {
  setupThemeToggle();
  setupAdminDropdowns();
  setupAuthListener();
  setupRealtimeListeners();
  showSection('home');
  document.addEventListener('contextmenu', e => e.preventDefault());
});

/********************************
 * 5. THEME MANAGEMENT
 ********************************/
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

/********************************
 * 6. NAVIGATION & SECTIONS
 ********************************/
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(el => el.classList.add('d-none'));
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('d-none');
    target.classList.add('fade-in');
    setTimeout(() => target.classList.remove('fade-in'), 500);
  }

  if (sectionId === 'student-results') renderStudentList();
  if (sectionId === 'program-results') renderProgramList();
  if (sectionId === 'home') renderDashboard();
}

function scrollToPoster() {
  showSection('home');
  setTimeout(() => {
    const el = document.getElementById('poster-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

function closeOffcanvas() {
  const offcanvasEl = document.getElementById('sideMenu');
  if (!offcanvasEl) return;
  const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl) || new bootstrap.Offcanvas(offcanvasEl);
  offcanvas.hide();
}

/********************************
 * 7. ADMIN AUTHENTICATION
 ********************************/
function setupAuthListener() {
  const loginCard = document.getElementById('admin-login');
  const dash = document.getElementById('admin-dashboard');

  auth.onAuthStateChanged(user => {
    if (user) {
      if (loginCard) loginCard.classList.add('d-none');
      if (dash) dash.classList.remove('d-none');
      renderAdminResultsTable();
      renderEventStatusAdmin();
    } else {
      if (dash) dash.classList.add('d-none');
      if (loginCard) loginCard.classList.remove('d-none');
    }
  });
}

function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const pass = document.getElementById('admin-pass').value.trim();
  const errorEl = document.getElementById('login-error');

  auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
      if (errorEl) errorEl.classList.add('d-none');
    })
    .catch(() => {
      if (errorEl) errorEl.classList.remove('d-none');
    });
}

function adminLogout() {
  auth.signOut();
}

/********************************
 * 8. FIREBASE REALTIME LISTENERS
 ********************************/
function setupRealtimeListeners() {
  db.ref('results').on('value', snapshot => {
    const data = snapshot.val() || {};
    results = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    refreshViews();
  });

  db.ref('events').on('value', snapshot => {
    const data = snapshot.val() || {};
    eventStatus = {};
    PROGRAMS.forEach(p => {
      const row = data[p] || {};
      eventStatus[p] = {
        conducted: !!row.conducted,
        published: !!row.published
      };
    });
    refreshViews();
    renderEventStatusAdmin();
  });
}

function refreshViews() {
  renderDashboard();
  if (!document.getElementById('student-results').classList.contains('d-none')) {
    renderStudentList();
  }
  if (!document.getElementById('program-results').classList.contains('d-none')) {
    renderProgramList();
  }
  renderAdminResultsTable();
}

/********************************
 * 9. UTILITY HELPERS
 ********************************/
function getGroupName(code) {
  const g = GROUPS.find(g => g.id === code);
  return g ? g.name : '';
}

function getPublishedResults() {
  return results.filter(r => {
    const st = eventStatus[r.program];
    return st && st.published;
  });
}

function getMedalIcon(position) {
  if (position === 0) return '<i class="fas fa-medal medal-gold"></i>';
  if (position === 1) return '<i class="fas fa-medal medal-silver"></i>';
  if (position === 2) return '<i class="fas fa-medal medal-bronze"></i>';
  return (position + 1) + '.';
}

function getStudentById(id) {
  return STUDENTS.find(s => s.id == id);
}

function getProgramStatus(program) {
  return eventStatus[program] || { conducted: false, published: false };
}

/********************************
 * 10. DASHBOARD & CHARTS
 ********************************/
function renderDashboard() {
  renderGroupChart();
  renderProgressBars();
  renderGroupRanking();
  renderTopStudents();
  renderAllStudentsGrouped();
}

function renderGroupChart() {
  const publishedResults = getPublishedResults();
  let groupScores = { ta: 0, sad: 0 };
  
  publishedResults.forEach(r => {
    const s = getStudentById(r.studentId);
    if (s) groupScores[s.group] += parseFloat(r.mark);
  });

  const chartCanvas = document.getElementById('groupChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (groupChartInstance) groupChartInstance.destroy();

  groupChartInstance = new Chart(ctx, {
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
}

function renderProgressBars() {
  const totalEvents = PROGRAMS.length;
  const conductedCount = PROGRAMS.filter(p => getProgramStatus(p).conducted).length;
  const publishedCount = PROGRAMS.filter(p => getProgramStatus(p).published).length;
  const conductedPercent = totalEvents ? Math.round((conductedCount / totalEvents) * 100) : 0;
  const publishedPercent = totalEvents ? Math.round((publishedCount / totalEvents) * 100) : 0;

  const pBar = document.getElementById('event-progress-bar');
  if (pBar) {
    pBar.style.width = conductedPercent + '%';
    pBar.textContent = conductedPercent + '%';
  }

  const pubBar = document.getElementById('publish-progress-bar');
  if (pubBar) {
    pubBar.style.width = publishedPercent + '%';
    pubBar.textContent = publishedPercent + '%';
  }
}

function renderGroupRanking() {
  const publishedResults = getPublishedResults();
  let groupScores = { ta: 0, sad: 0 };
  
  publishedResults.forEach(r => {
    const s = getStudentById(r.studentId);
    if (s) groupScores[s.group] += parseFloat(r.mark);
  });

  const rankingArray = [
    { code: 'ta', name: GROUPS[0].name, total: groupScores.ta },
    { code: 'sad', name: GROUPS[1].name, total: groupScores.sad }
  ].sort((a, b) => b.total - a.total);

  const leaderEl = document.getElementById('leading-group-name');
  if (leaderEl && rankingArray.length > 0) {
    leaderEl.innerText = rankingArray[0].name;
  }

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
}

function renderTopStudents() {
  const publishedResults = getPublishedResults();
  const studentTotals = STUDENTS.map(s => {
    const total = publishedResults
      .filter(r => r.studentId == s.id)
      .reduce((sum, r) => sum + parseFloat(r.mark), 0);
    return { ...s, total };
  }).sort((a, b) => b.total - a.total).slice(0, 4);

  const topList = document.getElementById('top-students-list');
  if (!topList) return;

  topList.innerHTML = '';
  studentTotals.forEach((s, index) => {
    topList.innerHTML += `
      <div class="d-flex justify-content-between border-bottom py-2">
        <span>${getMedalIcon(index)} ${s.name}
          <small class="text-muted"> (${getGroupName(s.group)})</small>
        </span>
        <span class="badge bg-success rounded-pill">${s.total}</span>
      </div>`;
  });
}

function renderAllStudentsGrouped() {
  const container = document.getElementById('all-students-grouped-body');
  if (!container) return;

  let out = '';
  GROUPS.forEach(group => {
    const members = STUDENTS.filter(s => s.group === group.id);
    out += `
      <div class="mb-3">
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
    out += `</div></div>`;
  });

  container.innerHTML = out;
}

/********************************
 * 11. STUDENT RESULTS PAGE
 ********************************/
function renderStudentList() {
  const container = document.getElementById('student-list-container');
  if (!container) return;

  container.innerHTML = '';
  const search = (document.getElementById('search-student')?.value || '').toLowerCase();
  const publishedResults = getPublishedResults();

  const studentData = STUDENTS.map(s => {
    const total = publishedResults
      .filter(r => r.studentId == s.id)
      .reduce((sum, r) => sum + parseFloat(r.mark), 0);
    return { ...s, total };
  });

  studentData.forEach(s => {
    if (s.name.toLowerCase().includes(search)) {
      container.innerHTML += `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card student-card">
            <div class="card-body d-flex justify-content-between align-items-center" onclick="openStudentModal(${s.id})">
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
  const student = getStudentById(id);
  if (!student) return;

  const publishedResults = getPublishedResults();
  const sResults = publishedResults.filter(r => r.studentId == id);
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

/********************************
 * 12. PROGRAM RESULTS PAGE
 ********************************/
function renderProgramList() {
  const container = document.getElementById('program-list-container');
  if (!container) return;

  container.innerHTML = '';

  PROGRAMS.forEach(prog => {
    const st = getProgramStatus(prog);
    const isPublished = st.published;
    const progPublished = results.filter(r => r.program === prog && isPublished);

    let html = `
      <div class="col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between ${isPublished ? 'bg-success text-white' : 'bg-secondary text-white'}">
            <span>${prog}</span>
            <small>${isPublished ? 'تم النشر' : 'غير منشور (للمشرف فقط)'}</small>
          </div>
          <ul class="list-group list-group-flush">
    `;

    if (isPublished && progPublished.length > 0) {
      const sorted = progPublished.slice().sort((a, b) => b.mark - a.mark);
      sorted.forEach(r => {
        const sName = getStudentById(r.studentId)?.name || 'Unknown';
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
      html += `<li class="list-group-item text-center text-muted">لا توجد نتائج منشورة بعد</li>`;
    }

    html += `</ul></div></div>`;
    container.innerHTML += html;
  });
}

/********************************
 * 13. ADMIN PANEL FUNCTIONS
 ********************************/
function setupAdminDropdowns() {
  const pSelect = document.getElementById('res-program');
  const sSelect = document.getElementById('res-student');

  if (pSelect) {
    pSelect.innerHTML = '';
    PROGRAMS.forEach(p => pSelect.innerHTML += `<option value="${p}">${p}</option>`);
  }

  if (sSelect) {
    sSelect.innerHTML = '';
    STUDENTS.forEach(s => sSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.id})</option>`);
  }
}

function addResult() {
  const program = document.getElementById('res-program').value;
  const studentId = document.getElementById('res-student').value;
  const place = document.getElementById('res-place').value;
  const grade = document.getElementById('res-grade').value;
  const mark = document.getElementById('res-mark').value;

  const ref = db.ref('results').push();
  ref.set({ program, studentId, place, grade, mark })
    .then(() => {
      alert('تمت إضافة النتيجة');
      document.getElementById('result-form').reset();
      document.getElementById('res-mark').value = 0;
    })
    .catch(err => {
      console.error(err);
      alert('خطأ في حفظ النتيجة (Firebase)');
    });
}

function deleteResult(id) {
  if (!confirm('هل أنت متأكد من الحذف؟')) return;
  db.ref('results/' + id).remove()
    .catch(err => {
      console.error(err);
      alert('خطأ في حذف النتيجة (Firebase)');
    });
}

function renderAdminResultsTable() {
  const tbody = document.getElementById('admin-results-table');
  if (!tbody) return;

  tbody.innerHTML = '';
  const sorted = results.slice().reverse();
  sorted.forEach(r => {
    const sName = getStudentById(r.studentId)?.name || 'Unknown';
    tbody.innerHTML += `
      <tr>
        <td>${r.program}</td>
        <td>${sName}</td>
        <td>${r.grade}</td>
        <td>${r.mark}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteResult('${r.id}')">X</button></td>
      </tr>`;
  });
}

function renderEventStatusAdmin() {
  const list = document.getElementById('event-status-list');
  if (!list) return;

  list.innerHTML = '';
  PROGRAMS.forEach(p => {
    const st = getProgramStatus(p);
    const conductedChecked = st.conducted ? 'checked' : '';
    const publishedChecked = st.published ? 'checked' : '';
    const baseId = p.replace(/\s+/g, '-').replace(/[^\w\-]/g, '');

    list.innerHTML += `
      <div class="border rounded p-2 mb-2">
        <strong class="d-block mb-1">${p}</strong>
        <div class="d-flex flex-wrap gap-3 small">
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="conducted-${baseId}" ${conductedChecked}
                   onchange="toggleEventFlag('${p}','conducted')">
            <label class="form-check-label" for="conducted-${baseId}">إتمام البرنامج</label>
          </div>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="published-${baseId}" ${publishedChecked}
                   onchange="toggleEventFlag('${p}','published')">
            <label class="form-check-label" for="published-${baseId}">نشر النتيجة</label>
          </div>
        </div>
      </div>`;
  });
}

function toggleEventFlag(programName, flag) {
  const st = getProgramStatus(programName);
  const current = !!st[flag];
  db.ref('events/' + programName + '/' + flag).set(!current)
    .catch(err => {
      console.error(err);
      alert('خطأ في تحديث حالة البرنامج (Firebase)');
    });
}

/********************************
 * 14. PRINT FUNCTION
 ********************************/
function printStudentResult() {
  const s = getStudentById(currentStudentModalId);
  if (!s) return;

  const publishedResults = getPublishedResults();
  const sResults = publishedResults.filter(r => r.studentId == s.id);
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
