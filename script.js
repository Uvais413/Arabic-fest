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
let results = [];          // all results from Firebase
let eventStatus = {};      // { programName: {conducted:bool, published:bool} }
let currentStudentModalId = null;
let groupChartInstance = null;
let eventBarChartInstance = null;

/********************************
 * 4. INIT ON LOAD
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
 * 5. THEME TOGGLE
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
    themeToggle.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

/********************************
 * 6. AUTH LISTENER (ADMIN DASHBOARD)
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
  const pass  = document.getElementById('admin-pass').value.trim();
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
 * 7. REALTIME DATABASE LISTENERS
 ********************************/
function setupRealtimeListeners() {
  // Results
  db.ref('results').on('value', snapshot => {
    const data = snapshot.val() || {};
    results = Object.entries(data).map(([id, val]) => ({ id, ...val }));
    refreshViews();
  });

  // Events (conducted + published)
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
 * 8. HELPERS
 ********************************/
function getGroupName(code) {
  const g = GROUPS.find(g => g.id === code);
  return g ? g.name : '';
}

// Only published results are visible to students / dashboard
function getPublishedResults() {
  return results.filter(r => {
    const st = eventStatus[r.program];
    return st && st.published;
  });
}

// Medal icons
function getMedalIcon(position) {
  if (position === 0) return '<i class="fas fa-medal medal-gold"></i>';
  if (position === 1) return '<i class="fas fa-medal medal-silver"></i>';
  if (position === 2) return '<i class="fas fa-medal medal-bronze"></i>';
  return (position + 1) + '.';
}

/********************************
 * 9. VIEW LOGIC / NAVIGATION
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
 * 10. DASHBOARD & CHARTS
 ********************************/
function renderDashboard() {
  const publishedResults = getPublishedResults();

  // Group totals
  let groupScores = { ta: 0, sad: 0 };
  publishedResults.forEach(r => {
    const s = STUDENTS.find(st => st.id == r.studentId);
    if (s) groupScores[s.group] += parseFloat(r.mark);
  });

  // Doughnut chart
  const chartCanvas = document.getElementById('groupChart');
  if (chartCanvas) {
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

  // Group ranking & leader
  const rankingArray = [
    { code: 'ta',  name: GROUPS[0].name, total: groupScores.ta },
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

  // Progress bar & bar chart based on conducted
  const totalEvents = PROGRAMS.length;
  const conductedCount = PROGRAMS.filter(p => eventStatus[p] && eventStatus[p].conducted).length;
  const percent = totalEvents ? Math.round((conductedCount / totalEvents) * 100) : 0;

  const pBar = document.getElementById('event-progress-bar');
  if (pBar) {
    pBar.style.width = percent + '%';
    pBar.textContent = percent + '%';
  }

  const barCanvas = document.getElementById('eventBarChart');
  if (barCanvas) {
    const ctx2 = barCanvas.getContext('2d');
    if (eventBarChartInstance) eventBarChartInstance.destroy();

    const values = PROGRAMS.map(p => (eventStatus[p] && eventStatus[p].conducted) ? 100 : 0);

    eventBarChartInstance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: PROGRAMS.map(p => p.split(' ')[0]),
        datasets: [{
          data: values,
          backgroundColor: values.map(v => v === 100 ? '#198754' : '#d4ac0d')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 25 }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  // Top 4 students
  const studentTotals = STUDENTS.map(s => {
    const total = publishedResults
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
          <span>${getMedalIcon(index)} ${s.name}
            <small class="text-muted"> (${getGroupName(s.group)})</small>
          </span>
          <span class="badge bg-success rounded-pill">${s.total}</span>
        </div>`;
    });
  }

  renderAllStudentsGrouped();
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
 * 11. STUDENT RESULTS
 ********************************/
function renderStudentList() {
  const container = document.getElementById('student-list-container');
  if (!container) return;

  container.innerHTML = '';
  const search = (document.getElementById('search-student').value || '').toLowerCase();
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
  const student = STUDENTS.find(s => s.id == id);
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
 * 12. PROGRAM RESULTS (ITEM-WISE)
 ********************************/
function renderProgramList() {
  const container = document.getElementById('program-list-container');
  if (!container) return;

  container.innerHTML = '';

  PROGRAMS.forEach(prog => {
    const st = eventStatus[prog] || { conducted: false, published: false };
    const isPublished = st.published;

    const progAll = results.filter(r => r.program === prog);
    const progPublished = progAll.filter(r => isPublished);

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
      html += `<li class="list-group-item text-center text-muted">لا توجد نتائج منشورة بعد</li>`;
    }

    html += `</ul></div></div>`;
    container.innerHTML += html;
  });
}

/********************************
 * 13. ADMIN FUNCTIONS
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
  const program   = document.getElementById('res-program').value;
  const studentId = document.getElementById('res-student').value;
  const place     = document.getElementById('res-place').value;
  const grade     = document.getElementById('res-grade').value;
  const mark      = document.getElementById('res-mark').value;

  const ref = db.ref('results').push();
  ref.set({ program, studentId, place, grade, mark })
    .then(() => {
      alert('تمت إضافة النتيجة');
      const form = document.getElementById('result-form');
      if (form) form.reset();
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
    const sName = STUDENTS.find(s => s.id == r.studentId)?.name || 'Unknown';
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
    const st = eventStatus[p] || { conducted: false, published: false };
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
  const st = eventStatus[programName] || { conducted: false, published: false };
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
  const s = STUDENTS.find(st => st.id == currentStudentModalId);
  if (!s) return;

  const publishedResults = getPublishedResults();
  const sResults = publishedResults.filter(r => r.studentId == s.id);
  const total = sResults.reduce((sum, r) => sum + parseFloat(r.mark), 0);

  document.getElementById('print-name').innerText  = s.name;
  document.getElementById('print-group').innerText = getGroupName(s.group);
  document.getElementById('print-id').innerText    = s.id;
  document.getElementById('print-total').innerText = total;
  document.getElementById('print-date').innerText  = new Date().toLocaleString();

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
