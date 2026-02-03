let currentStep = 1;
let submissions = [];
let logs = [];
let editID = null;

/** LOGIN LOGIC **/
function login() {
    const user = document.getElementById('username').value.toLowerCase();
    const pass = document.getElementById('password').value;
    if (user === 'student' && pass === 'password') {
        showView('studentDashboard');
        showStudentHome();
    } else if (user === 'admin' && pass === 'password') {
        showView('adminPortal');
        renderAdminTable();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
}

function showView(viewId) {
    document.querySelectorAll('main > div').forEach(div => div.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('logoutBtn').classList.toggle('hidden', viewId === 'loginSection');
}

function logout() {
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showView('loginSection');
}

/** STUDENT ACTIONS **/
function showStudentHome() {
    document.getElementById('studentHome').classList.remove('hidden');
    document.getElementById('requestFormSection').classList.add('hidden');
    renderStudentStatus();
    renderLogs();
}

function startNewRequest() {
    editID = null;
    document.getElementById('requestForm').reset();
    document.getElementById('currentFileName').innerText = "";
    document.getElementById('studentHome').classList.add('hidden');
    document.getElementById('requestFormSection').classList.remove('hidden');
    currentStep = 1;
    updateStepUI();
}

function saveDraft() {
    const data = captureFormData();
    data.status = "Draft";
    if (editID) {
        const idx = submissions.findIndex(r => r.id === editID);
        submissions[idx] = { ...submissions[idx], ...data };
    } else {
        data.id = Date.now();
        submissions.push(data);
    }
    addLog(`Draft saved for "${data.trip || 'Unnamed'}"`);
    showStudentHome();
}

function submitRequest() {
    if (!validateCurrentStep()) return;
    const data = captureFormData();
    data.status = "Under Review";
    if (editID) {
        const idx = submissions.findIndex(r => r.id === editID);
        submissions[idx] = { ...submissions[idx], ...data, status: "Under Review" };
        addLog(`Re-submitted: ${data.trip}`);
    } else {
        data.id = Date.now();
        submissions.push(data);
        addLog(`Submitted: ${data.trip}`);
    }
    showStudentHome();
}

function captureFormData() {
    return {
        name: document.getElementById('studentName').value,
        email: document.getElementById('studentEmail').value,
        trip: document.getElementById('tripName').value,
        dest: document.getElementById('destination').value,
        cost: document.getElementById('cost').value,
        doc: document.getElementById('docUpload').files[0]?.name || (editID ? (submissions.find(r=>r.id===editID)?.doc || "itinerary.pdf") : "itinerary.pdf")
    };
}

/** ADMIN ACTIONS **/
function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const toReview = submissions.filter(r => r.status !== "Draft");
    tbody.innerHTML = toReview.length ? '' : '<tr><td colspan="5" class="p-10 text-center text-gray-400">No pending submissions.</td></tr>';
    
    toReview.forEach(req => {
        const row = document.createElement('tr');
        row.className = "border-b text-sm hover:bg-gray-50";
        row.innerHTML = `
            <td class="p-3">
                <div class="font-bold">${req.name}</div>
                <div class="text-xs text-blue-600 hover:underline cursor-pointer font-medium">
                    <a href="mailto:${req.email}">${req.email}</a>
                </div>
            </td>
            <td class="p-3">
                <div class="font-semibold">${req.trip}</div>
                <div class="text-xs text-gray-500">${req.dest} — $${req.cost}</div>
            </td>
            <td class="p-3">
                <button onclick="alert('Viewing Document: ${req.doc}')" class="text-xs bg-gray-100 border px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1">
                    📄 ${req.doc}
                </button>
            </td>
            <td class="p-3"><span class="status-review">${req.status}</span></td>
            <td class="p-3 text-right space-x-1">
                <button onclick="updateStatus(${req.id}, 'Approved')" class="text-green-600 font-bold text-xs hover:underline">Approve</button>
                <button onclick="updateStatus(${req.id}, 'Revision Needed')" class="text-red-500 font-bold text-xs hover:underline">Revise</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateStatus(id, status) {
    const item = submissions.find(s => s.id === id);
    if (item) {
        item.status = status;
        item.comment = (status === 'Revision Needed') ? prompt("Note for student:") : "";
        addLog(`Admin: ${status} for ${item.trip}`);
        renderAdminTable();
    }
}

/** SYSTEM LOGS & NAV (Unchanged) **/
function addLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logs.push({ time, msg });
}

function renderLogs() {
    const container = document.getElementById('notificationLog');
    container.innerHTML = logs.length ? "" : "No history.";
    logs.slice().reverse().forEach(l => container.innerHTML += `<div class='border-b py-1'><strong>[${l.time}]</strong> ${l.msg}</div>`);
}

function renderStudentStatus() {
    const tbody = document.getElementById('studentStatusTable');
    tbody.innerHTML = submissions.length ? '' : '<tr><td colspan="3" class="p-6 text-center text-gray-400">No requests found.</td></tr>';
    submissions.forEach(req => {
        const row = document.createElement('tr');
        row.className = "border-b text-sm";
        row.innerHTML = `<td class="p-3"><strong>${req.trip || 'Untitled'}</strong></td><td class="p-3"><span class="status-review">${req.status}</span></td><td class="p-3"><button onclick="editRequest(${req.id})" class="text-blue-600 font-bold">Edit</button></td>`;
        tbody.appendChild(row);
    });
}

function editRequest(id) {
    const req = submissions.find(r => r.id === id);
    editID = id;
    document.getElementById('studentName').value = req.name;
    document.getElementById('studentEmail').value = req.email;
    document.getElementById('tripName').value = req.trip;
    document.getElementById('destination').value = req.dest;
    document.getElementById('cost').value = req.cost;
    document.getElementById('currentFileName').innerText = "Current File: " + req.doc;
    document.getElementById('studentHome').classList.add('hidden');
    document.getElementById('requestFormSection').classList.remove('hidden');
    currentStep = 1;
    updateStepUI();
}

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
        if (!i.value) { i.classList.add('error'); valid = false; }
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
