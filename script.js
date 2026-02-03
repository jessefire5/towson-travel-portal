let currentStep = 1;
let submissions = [];
let logs = [];
let editID = null;

/** AUTHENTICATION **/
function login() {
    const user = document.getElementById('username').value.toLowerCase();
    const pass = document.getElementById('password').value;
    if (user === 'student' && pass === 'password') {
        showView('studentDashboard');
        showStudentHome();
    } else if (user === 'admin' && pass === 'password') {
        renderAdminTable();
        showView('adminPortal');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function showView(viewId) {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('studentDashboard').classList.add('hidden');
    document.getElementById('adminPortal').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('logoutBtn').classList.toggle('hidden', viewId === 'loginSection');
}

function logout() { location.reload(); }

/** STUDENT VIEW LOGIC **/
function showStudentHome() {
    document.getElementById('studentHome').classList.remove('hidden');
    document.getElementById('requestForm').classList.add('hidden');
    renderStudentStatus();
    renderLogs();
}

function startNewRequest() {
    editID = null;
    document.getElementById('requestForm').reset();
    document.getElementById('currentFileName').innerText = "";
    document.getElementById('studentHome').classList.add('hidden');
    document.getElementById('requestForm').classList.remove('hidden');
    currentStep = 1;
    updateStepUI();
}

function renderStudentStatus() {
    const tbody = document.getElementById('studentStatusTable');
    const alerts = document.getElementById('statusAlerts');
    tbody.innerHTML = ''; alerts.innerHTML = '';

    submissions.forEach(req => {
        if (req.status === "Revision Needed") {
            alerts.innerHTML += `<div class="alert-badge bg-red-50 text-red-800 border-red-200">⚠️ Revision needed for "${req.trip}". Note: ${req.comment}</div>`;
        }
        if (req.status === "Approved") {
            alerts.innerHTML += `<div class="alert-badge bg-green-50 text-green-800 border-green-200">✅ Your trip "${req.trip}" is Approved! Download the PDF below.</div>`;
        }

        const row = document.createElement('tr');
        row.className = "border-b text-sm";
        let sClass = (req.status === "Approved") ? "status-approved" : (req.status === "Revision Needed") ? "status-revision" : "status-review";
        
        row.innerHTML = `
            <td class="p-3"><strong>${req.trip}</strong><br><span class="text-xs text-gray-500">${req.dest}</span></td>
            <td class="p-3"><span class="${sClass}">${req.status}</span></td>
            <td class="p-3 space-x-2">
                ${req.status === "Revision Needed" ? `<button onclick="editRequest(${req.id})" class="text-blue-600 font-bold hover:underline">Revise</button>` : ''}
                ${req.status === "Approved" ? `<button onclick="exportPDF(${req.id})" class="text-green-600 font-bold underline">Export PDF</button>` : '—'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderLogs() {
    const logContainer = document.getElementById('notificationLog');
    logContainer.innerHTML = logs.length ? "" : "<p class='text-gray-400 italic'>No activity log.</p>";
    logs.slice().reverse().forEach(log => {
        logContainer.innerHTML += `<div class="p-1 border-b"><strong>[${log.time}]</strong> ${log.msg}</div>`;
    });
}

/** EDIT & SUBMIT **/
function editRequest(id) {
    const req = submissions.find(r => r.id === id);
    if (!req) return;
    editID = id;
    document.getElementById('studentName').value = req.name;
    document.getElementById('studentEmail').value = req.email;
    document.getElementById('tripName').value = req.trip;
    document.getElementById('destination').value = req.dest;
    document.getElementById('cost').value = req.cost;
    document.getElementById('currentFileName').innerText = "Attached: " + req.doc;
    document.getElementById('studentHome').classList.add('hidden');
    document.getElementById('requestForm').classList.remove('hidden');
    currentStep = 1;
    updateStepUI();
}

function submitRequest() {
    if (!validateCurrentStep()) return;
    const data = {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        trip: document.getElementById('tripName').value,
        dest: document.getElementById('destination').value,
        cost: document.getElementById('cost').value,
        doc: document.getElementById('docUpload').files[0]?.name || (editID ? submissions.find(r=>r.id===editID).doc : "itinerary.pdf"),
        status: "Under Review",
        comment: ""
    };
    if (editID) {
        const idx = submissions.findIndex(r => r.id === editID);
        submissions[idx] = { ...submissions[idx], ...data };
        addLog(`Re-submitted: ${data.trip}`);
    } else {
        data.id = Date.now();
        submissions.push(data);
        addLog(`Created: ${data.trip}`);
    }
    showStudentHome();
}

function addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logs.push({ time, msg });
}

function exportPDF(id) {
    const req = submissions.find(r => r.id === id);
    const content = `TOWSON UNIVERSITY TRAVEL AUTHORIZATION\n--------------------------------------\nSTUDENT: ${req.name}\nEMAIL: ${req.email}\nTRIP: ${req.trip}\nDESTINATION: ${req.dest}\nCOST: $${req.cost}\nSTATUS: APPROVED\n\nThis document serves as authorized proof of student travel.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TU_Travel_${req.trip}.pdf`; // Browser will save as text file masquerading as PDF for simulation
    link.click();
}

/** ADMIN ACTIONS **/
function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const term = document.getElementById('adminSearch').value.toLowerCase();
    tbody.innerHTML = '';
    
    submissions.filter(r => r.name.toLowerCase().includes(term) || r.trip.toLowerCase().includes(term)).forEach(req => {
        const row = document.createElement('tr');
        row.className = "border-b text-sm";
        row.innerHTML = `
            <td class="p-3"><strong>${req.name}</strong></td>
            <td class="p-3">${req.trip} ($${req.cost})</td>
            <td class="p-3"><span class="status-review">${req.status}</span></td>
            <td class="p-3 text-right">
                <button onclick="updateStatus(${req.id}, 'Approved')" class="text-green-600 font-bold mr-2 hover:underline">Approve</button>
                <button onclick="updateStatus(${req.id}, 'Revision Needed')" class="text-red-500 font-bold hover:underline">Revise</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateStatus(id, status) {
    const item = submissions.find(s => s.id === id);
    if (item) {
        item.status = status;
        item.comment = (status === 'Revision Needed') ? prompt("Enter revision instructions:") : "";
        addLog(`Admin set "${item.trip}" to ${status}`);
        renderAdminTable();
    }
}

/** FORM ENGINE **/
function changeStep(delta) {
    if (delta === 1 && !validateCurrentStep()) return;
    currentStep += delta;
    updateStepUI();
}

function validateCurrentStep() {
    const step = document.getElementById(`step${currentStep}`);
    const inputs = step.querySelectorAll('input[required]');
    let valid = true;
    inputs.forEach(i => {
        if (!i.value || (i.type==='checkbox' && !i.checked)) { i.classList.add('error'); valid = false; }
        else { i.classList.remove('error'); }
    });
    return valid;
}

function updateStepUI() {
    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('[id^="stepTab"]').forEach(el => el.classList.remove('step-active'));
    document.getElementById(`step${currentStep}`).classList.remove('hidden');
    document.getElementById(`stepTab${currentStep}`).classList.add('step-active');
    document.getElementById('backBtn').classList.toggle('hidden', currentStep === 1);
    document.getElementById('nextBtn').classList.toggle('hidden', currentStep === 4);
    document.getElementById('submitBtn').classList.toggle('hidden', currentStep !== 4);
}