/* One-Day Islamic Workshop Registration — Frontend */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyHKDxjtBL8wim1n3sVuHv6oDQkj7rweMwEcGf_HWHNl3RCgYfhB8AH4v9ojSooEg/exec';

async function callApi(action, payload) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf('PASTE_YOUR') === 0) {
    throw new Error('The Apps Script Web App URL has not been set yet.');
  }

  const body = Object.assign({ action: action }, payload || {});
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error('Network error (HTTP ' + response.status + ')');
  }

  return response.json();
}

const views = {
  register: document.getElementById('viewRegister'),
  check: document.getElementById('viewCheck'),
  success: document.getElementById('viewSuccess'),
  adminLogin: document.getElementById('viewAdminLogin'),
  adminDashboard: document.getElementById('viewAdminDashboard')
};

function showView(name) {
  Object.keys(views).forEach(function (key) {
    views[key].classList.toggle('hidden', key !== name);
  });

  document.getElementById('navHome').classList.toggle('active', name === 'register' || name === 'success');
  document.getElementById('navCheck').classList.toggle('active', name === 'check');
  document.getElementById('navAdmin').classList.toggle('active', name === 'adminLogin' || name === 'adminDashboard');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('navHome').addEventListener('click', function () {
  showView('register');
});

document.getElementById('navCheck').addEventListener('click', function () {
  showView('check');
});

document.getElementById('navAdmin').addEventListener('click', function () {
  if (sessionStorage.getItem('sanaAdminToken')) {
    showView('adminDashboard');
    loadStudents();
  } else {
    showView('adminLogin');
  }
});

const registrationForm = document.getElementById('registrationForm');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');
const mobileCheckStatus = document.getElementById('mobileCheckStatus');


const validators = {
  studentName: function (v) {
    return v.trim().length >= 3 ? '' : 'Enter the student name.';
  },

  studentMobile: function (v) {
    return /^[0-9]{10}$/.test(v.trim()) ? '' : 'Enter a valid 10-digit student mobile number.';
  },

  qualification: function (v) {
    return v ? '' : 'Select School or College.';
  },

  collegeLevel: function (v) {
    const qualification = registrationForm.elements.qualification.value;
    return qualification === 'College' && !v ? 'Select the college qualification.' : '';
  },

  motherName: function (v) {
    return v.trim().length >= 3 ? '' : 'Enter the mother name.';
  },

  fatherName: function (v) {
    return v.trim().length >= 3 ? '' : 'Enter the father name.';
  },

  parentMobile: function (v) {
    return /^[0-9]{10}$/.test(v.trim()) ? '' : 'Enter a valid 10-digit parent mobile number.';
  },

  village: function (v) {
    return v.trim().length >= 2 ? '' : 'Enter the village.';
  },

  constituency: function (v) {
    return v ? '' : 'Select a constituency.';
  },

  nearbyMosque: function (v) {
    return v.trim().length >= 2 ? '' : 'Enter the nearby mosque name.';
  },

  quranArabic: function (v) {
    return v ? '' : "Select an option for Qur'an reading.";
  }
};

function showFieldError(fieldName, message) {
  const input = registrationForm.elements[fieldName];
  const errorEl = registrationForm.querySelector('.error-msg[data-for="' + fieldName + '"]');

  if (input && input.classList) {
    input.classList.toggle('invalid', !!message);
  }

  if (input && input.length) {
    Array.from(input).forEach(function (radio) {
      radio.classList.toggle('invalid', !!message);
    });
  }

  if (errorEl) {
    errorEl.textContent = message;
  }
}

function validateField(fieldName) {
  const input = registrationForm.elements[fieldName];

  if (!input || !validators[fieldName]) {
    return true;
  }

  let value = input.value;

  if (fieldName === 'quranArabic') {
    const selected = registrationForm.querySelector('input[name="quranArabic"]:checked');
    value = selected ? selected.value : '';
  }

  const message = validators[fieldName](value);
  showFieldError(fieldName, message);
  return message === '';
}

Object.keys(validators).forEach(function (fieldName) {
  const input = registrationForm.elements[fieldName];

  if (!input) return;

  if (fieldName === 'quranArabic') {
    Array.from(input).forEach(function (radio) {
      radio.addEventListener('change', function () {
        validateField(fieldName);
      });
    });
  } else {
    input.addEventListener('change', function () {
      validateField(fieldName);
    });

    input.addEventListener('blur', function () {
      validateField(fieldName);
    });
  }
});

['studentMobile', 'parentMobile'].forEach(function (fieldName) {
  registrationForm.elements[fieldName].addEventListener('input', function (e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');

    if (fieldName === 'studentMobile') {
      // Do not check the Google Sheet while typing.
      // Duplicate checking happens only after Register is clicked.
      mobileCheckStatus.textContent = '';
      mobileCheckStatus.className = 'field-hint';
      showFieldError('studentMobile', '');
    }
  });
});

const qualificationSelect = document.getElementById('qualification');
const collegeLevelField = document.getElementById('collegeLevelField');
const collegeLevelSelect = document.getElementById('collegeLevel');

qualificationSelect.addEventListener('change', function () {
  const isCollege = qualificationSelect.value === 'College';

  collegeLevelField.classList.toggle('hidden', !isCollege);
  collegeLevelSelect.required = isCollege;

  if (!isCollege) {
    collegeLevelSelect.value = '';
    showFieldError('collegeLevel', '');
  }

  collegeLevelSelect.disabled = !isCollege;
  validateField('qualification');
});

registrationForm.addEventListener('submit', async function (e) {
  e.preventDefault();


  let isValid = true;

  Object.keys(validators).forEach(function (fieldName) {
    if (!validateField(fieldName)) {
      isValid = false;
    }
  });

  if (!isValid) {
    formStatus.textContent = 'Please fix the highlighted fields before submitting.';
    formStatus.classList.remove('ok');
    return;
  }

  const quranArabicInput = registrationForm.querySelector('input[name="quranArabic"]:checked');

  const data = {
    studentName: registrationForm.elements.studentName.value.trim(),
    studentMobile: registrationForm.elements.studentMobile.value.trim(),
    qualification: registrationForm.elements.qualification.value,
    collegeLevel: registrationForm.elements.collegeLevel.value,
    motherName: registrationForm.elements.motherName.value.trim(),
    fatherName: registrationForm.elements.fatherName.value.trim(),
    parentMobile: registrationForm.elements.parentMobile.value.trim(),
    address: registrationForm.elements.village.value.trim() + ', ' + registrationForm.elements.constituency.value,
    village: registrationForm.elements.village.value.trim(),
    constituency: registrationForm.elements.constituency.value,
    nearbyMosque: registrationForm.elements.nearbyMosque.value.trim(),
    quranArabic: quranArabicInput ? quranArabicInput.value : ''
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';
  formStatus.textContent = '';

  try {
    const result = await callApi('register', { data: data });

    if (result.success) {
      document.getElementById('sName').textContent = data.studentName;
      document.getElementById('sRegId').textContent = result.registrationId;

      registrationForm.reset();
      collegeLevelField.classList.add('hidden');
      collegeLevelSelect.required = false;

      mobileCheckStatus.textContent = '';
      mobileCheckStatus.className = 'field-hint';

      Object.keys(validators).forEach(function (fieldName) {
        showFieldError(fieldName, '');
      });

      showView('success');
    } else {
      formStatus.textContent = result.message || 'Registration failed. Please try again.';
      formStatus.classList.remove('ok');

      if (result.alreadyRegistered) {
        mobileCheckStatus.textContent = '';
        mobileCheckStatus.className = 'field-hint';
        showFieldError(
          'studentMobile',
          'This mobile number is already registered.'
        );
        formStatus.textContent = '';
        formStatus.classList.remove('ok');
        registrationForm.elements.studentMobile.focus();
      }
    }
  } catch (err) {
    formStatus.textContent = err.message || 'Could not reach the server. Please try again.';
    formStatus.classList.remove('ok');
  } finally {
    submitBtn.textContent = 'Register for workshop';
    submitBtn.disabled = false;
  }
});

/* =========================
   CHECK REGISTRATION
========================= */

const checkRegistrationForm = document.getElementById('checkRegistrationForm');
const checkMobileInput = document.getElementById('checkMobile');
const checkRegistrationBtn = document.getElementById('checkRegistrationBtn');
const checkStatus = document.getElementById('checkStatus');
const checkMobileError = document.getElementById('checkMobileError');
const checkResult = document.getElementById('checkResult');

checkMobileInput.addEventListener('input', function (e) {
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
  checkMobileError.textContent = '';
  checkStatus.textContent = '';
  checkResult.classList.add('hidden');
});

checkRegistrationForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const mobile = checkMobileInput.value.trim();

  if (!/^[0-9]{10}$/.test(mobile)) {
    checkMobileError.textContent = 'Enter a valid 10-digit mobile number.';
    return;
  }

  checkRegistrationBtn.disabled = true;
  checkRegistrationBtn.textContent = 'Checking…';
  checkStatus.textContent = '';
  checkResult.classList.add('hidden');

  try {
    const result = await callApi('checkRegistration', { studentMobile: mobile });

    if (result.success && result.registered && result.student) {
      const s = result.student;

      // Only the requested confirmation details are shown.
      document.getElementById('checkName').textContent = s.studentName || '—';
      document.getElementById('checkRegId').textContent = s.registrationId || '—';

      checkStatus.textContent = '';
      checkResult.classList.remove('hidden');
    } else {
      checkStatus.textContent = result.message || 'No registration found for this mobile number.';
      checkStatus.classList.remove('ok');
    }
  } catch (err) {
    checkStatus.textContent = err.message || 'Could not reach the server. Please try again.';
    checkStatus.classList.remove('ok');
  } finally {
    checkRegistrationBtn.disabled = false;
    checkRegistrationBtn.textContent = 'Check Registration';
  }
});

document.getElementById('downloadRegistrationBtn').addEventListener('click', function () {
  downloadRegistrationPdf();
});

document.getElementById('printCheckBtn').addEventListener('click', function () {
  printConfirmation({
    name: document.getElementById('checkName').textContent,
    regId: document.getElementById('checkRegId').textContent
  });
});

document.getElementById('printBtn').addEventListener('click', function () {
  printConfirmation({
    name: document.getElementById('sName').textContent,
    regId: document.getElementById('sRegId').textContent
  });
});

function getConfirmationData(nameId, regIdId) {
  return {
    name: document.getElementById(nameId).textContent || '—',
    regId: document.getElementById(regIdId).textContent || '—',
    date: '11 October 2026',
    venue: 'AR AR Function Hall, Kodad',
    reportingTime: '8:30 AM'
  };
}

function downloadRegistrationPdf() {
  const data = getConfirmationData('checkName', 'checkRegId');
  const pdfBytes = buildConfirmationPdf(data);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Registration-' + (data.regId || 'confirmation') + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// Creates a small, self-contained one-page PDF so Download Registration
// downloads a real .pdf file without needing an external PDF library.
function buildConfirmationPdf(data) {
  const safe = function (value) {
    return String(value || '—').replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  };

  const lines = [
    'One-Day Islamic Training Workshop',
    'Registration Successful',
    '',
    'Participant: ' + safe(data.name),
    'Registration ID: ' + safe(data.regId),
    'Date: ' + safe(data.date),
    'Venue: ' + safe(data.venue),
    'Reporting Time: ' + safe(data.reportingTime)
  ];

  const commands = [];
  let y = 760;
  lines.forEach(function (line, index) {
    if (line === '') { y -= 18; return; }
    const fontSize = index === 0 ? 16 : (index === 1 ? 18 : 12);
    const font = index === 1 ? '/F2' : '/F1';
    commands.push('BT');
    commands.push(font + ' ' + fontSize + ' Tf');
    commands.push('72 ' + y + ' Td');
    commands.push('(' + line + ') Tj');
    commands.push('ET');
    y -= index < 2 ? 28 : 30;
  });

  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
  ];

  let pdf = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [0];
  objects.forEach(function (obj, i) {
    offsets[i + 1] = pdf.length;
    pdf += (i + 1) + ' 0 obj\n' + obj + '\nendobj\n';
  });
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n';
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\n';
  pdf += 'startxref\n' + xref + '\n%%EOF';
  return new TextEncoder().encode(pdf);
}

function printConfirmation(data) {
  const popup = window.open('', '_blank', 'width=800,height=900');
  if (!popup) {
    window.print();
    return;
  }

  popup.document.write('<!doctype html><html><head><meta charset="UTF-8"><title>Registration - ' +
    escapeHtml(data.regId) +
    '</title><style>' +
    'body{font-family:Arial,sans-serif;padding:50px;color:#1B1F24;max-width:760px;margin:auto}' +
    'h2{margin:0 0 8px;color:#10233F;font-size:20px}' +
    'h1{margin:0 0 28px;color:#2F7D5C;font-size:26px}' +
    '.row{display:flex;justify-content:space-between;gap:24px;padding:12px 0;border-bottom:1px solid #ddd}' +
    '.label{color:#666}.value{font-weight:700;text-align:right}' +
    '@media print{body{padding:25px}}' +
    '</style></head><body>' +
    '<h2>One-Day Islamic Training Workshop</h2>' +
    '<h1>Registration Successful</h1>' +
    rowHtml('Participant', data.name) +
    rowHtml('Registration ID', data.regId) +
    rowHtml('Date', data.date || '11 October 2026') +
    rowHtml('Venue', data.venue || 'AR AR Function Hall, Kodad') +
    rowHtml('Reporting Time', data.reportingTime || '8:30 AM') +
    '</body></html>');
  popup.document.close();
  popup.focus();
  setTimeout(function () { popup.print(); }, 300);
}

function rowHtml(label, value) {
  return '<div class="row"><span class="label">' +
    escapeHtml(label) + '</span><span class="value">' +
    escapeHtml(value) + '</span></div>';
}

function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;
  printConfirmation(getConfirmationData(
    elementId === 'checkPrintArea' ? 'checkName' : 'sName',
    elementId === 'checkPrintArea' ? 'checkRegId' : 'sRegId'
  ));
}

/* =========================
   ADMIN
========================= */

const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminLoginStatus = document.getElementById('adminLoginStatus');

adminLoginForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;

  if (!username || !password) {
    adminLoginStatus.textContent = 'Enter both username and password.';
    return;
  }

  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'Logging in…';
  adminLoginStatus.textContent = '';

  try {
    const result = await callApi('adminLogin', {
      username: username,
      password: password
    });

    if (result.success) {
      sessionStorage.setItem('sanaAdminToken', result.token);
      adminLoginForm.reset();
      showView('adminDashboard');
      loadStudents();
    } else {
      adminLoginStatus.textContent = result.message || 'Login failed.';
    }
  } catch (err) {
    adminLoginStatus.textContent = err.message || 'Could not reach the server.';
  } finally {
    adminLoginBtn.disabled = false;
    adminLoginBtn.textContent = 'Log in';
  }
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  sessionStorage.removeItem('sanaAdminToken');
  showView('register');
});

let allStudents = [];

async function loadStudents() {
  const tbody = document.getElementById('studentsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Loading registrations…</td></tr>';

  const token = sessionStorage.getItem('sanaAdminToken');

  if (!token) {
    showView('adminLogin');
    return;
  }

  try {
    const result = await callApi('getStudents', { token: token });

    if (!result.success) {
      if (result.message && result.message.toLowerCase().indexOf('session') !== -1) {
        sessionStorage.removeItem('sanaAdminToken');
        showView('adminLogin');
        adminLoginStatus.textContent = result.message;
        return;
      }

      tbody.innerHTML =
        '<tr><td colspan="8" class="table-empty">' +
        escapeHtml(result.message || 'Could not load data.') +
        '</td></tr>';
      return;
    }

    allStudents = result.students || [];
    populateFilterOptions(allStudents);
    updateStats(allStudents);
    renderStudentsTable();
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="table-empty">' +
      escapeHtml(err.message || 'Network error.') +
      '</td></tr>';
  }
}

function populateFilterOptions(students) {
  const select = document.getElementById('filterQualification');
  const current = select.value;

  const options = Array.from(
    new Set(
      students
        .map(function (s) { return s.qualification; })
        .filter(Boolean)
    )
  ).sort();

  select.innerHTML =
    '<option value="">All</option>' +
    options.map(function (x) {
      return '<option value="' + escapeAttr(x) + '">' +
        escapeHtml(x) +
        '</option>';
    }).join('');

  select.value = current;
}

function updateStats(students) {
  document.getElementById('statTotal').textContent = students.length;

  const todayStr = formatDateOnly(new Date());

  document.getElementById('statToday').textContent =
    students.filter(function (s) {
      return String(s.registrationDate || '').indexOf(todayStr) === 0;
    }).length;

  let latest = '—';

  if (students.length) {
    const sorted = students.slice().sort(function (a, b) {
      return parseRegDate(b.registrationDate) - parseRegDate(a.registrationDate);
    });

    latest = sorted[0].registrationId;
  }

  document.getElementById('statLatest').textContent = latest;
}

function formatDateOnly(d) {
  return String(d.getDate()).padStart(2, '0') +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    d.getFullYear();
}

function parseRegDate(str) {
  if (!str) return 0;

  const parts = String(str).split(/[\s:-]/);

  if (parts.length < 3) return 0;

  const dd = parts[0];
  const mm = parts[1];
  const yyyy = parts[2];
  const HH = parts[3] || 0;
  const mi = parts[4] || 0;
  const ss = parts[5] || 0;

  return new Date(
    yyyy,
    mm - 1,
    dd,
    HH,
    mi,
    ss
  ).getTime();
}

function renderStudentsTable() {
  const tbody = document.getElementById('studentsTableBody');
  const regId = document.getElementById('searchRegId').value.trim().toLowerCase();
  const name = document.getElementById('searchName').value.trim().toLowerCase();
  const mobile = document.getElementById('searchMobile').value.trim();
  const qualification = document.getElementById('filterQualification').value;
  const sortOrder = document.getElementById('sortOrder').value;

  let filtered = allStudents.filter(function (s) {
    if (regId && String(s.registrationId).toLowerCase().indexOf(regId) === -1) return false;
    if (name && String(s.studentName).toLowerCase().indexOf(name) === -1) return false;
    if (mobile && String(s.studentMobile).indexOf(mobile) === -1) return false;
    if (qualification && s.qualification !== qualification) return false;
    return true;
  });

  filtered.sort(function (a, b) {
    const diff =
      parseRegDate(a.registrationDate) -
      parseRegDate(b.registrationDate);

    return sortOrder === 'asc' ? diff : -diff;
  });

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="table-empty">' +
      'No registrations match these filters.' +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (s) {
    return '<tr>' +
      '<td>' + escapeHtml(s.registrationId) + '</td>' +
      '<td>' + escapeHtml(s.studentName) + '</td>' +
      '<td>' + escapeHtml(s.studentMobile) + '</td>' +
      '<td>' + escapeHtml(
        s.qualification +
        (s.collegeLevel ? ' - ' + s.collegeLevel : '')
      ) + '</td>' +
      '<td>' + escapeHtml(s.village) + '</td>' +
      '<td>' + escapeHtml(s.constituency) + '</td>' +
      '<td>' + escapeHtml(s.registrationDate) + '</td>' +
      '<td><span class="status-pill">' +
      escapeHtml(s.status || 'Confirmed') +
      '</span></td>' +
      '</tr>';
  }).join('');
}

['searchRegId', 'searchName', 'searchMobile'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', renderStudentsTable);
});

['filterQualification', 'sortOrder'].forEach(function (id) {
  document.getElementById(id).addEventListener('change', renderStudentsTable);
});

document.getElementById('refreshBtn').addEventListener('click', loadStudents);

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(
    /[&<>"']/g,
    function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c];
    }
  );
}

function escapeAttr(str) {
  return escapeHtml(str);
}

document.getElementById('year').textContent = new Date().getFullYear();
showView('register');
