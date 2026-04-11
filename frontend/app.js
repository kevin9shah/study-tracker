const API_BASE = "https://study-tracker-o508.onrender.com";

let state = {
    currentUser: null,
    partnerId: null,
    partnerName: null, // New field for personalization
    tasks: [],
    punishments: []
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    loadLocalState();

    if (state.currentUser && state.partnerId) {
        enterDashboard();
    } else if (state.currentUser) {
        document.getElementById('lbl-my-id').innerText = state.currentUser.id;
        switchPage('page-setup');
        document.getElementById('step-auth').classList.remove('active');
        document.getElementById('step-couple').classList.add('active');
    } else {
        switchPage('page-setup');
    }
});

const loadLocalState = () => {
    const u = localStorage.getItem('studyLinkUser');
    if (u) {
        let parsed = JSON.parse(u);
        // Clean up from the older cache bug where the wrapped structure was saved
        if (parsed && parsed.user) {
            parsed = parsed.user;
            localStorage.setItem('studyLinkUser', JSON.stringify(parsed));
        }
        state.currentUser = parsed;
    }

    const p = localStorage.getItem('studyLinkPartnerId');
    if (p) state.partnerId = parseInt(p);

    const t = localStorage.getItem('studyLinkTasks');
    if (t) state.tasks = JSON.parse(t);

    const pun = localStorage.getItem('studyLinkPunishments');
    if (pun) state.punishments = JSON.parse(pun);

    const pName = localStorage.getItem('studyLinkPartnerName');
    if (pName) state.partnerName = pName;

    if (document.getElementById('page-dashboard').classList.contains('active')) {
        renderDashboard();
    } else if (state.currentUser && state.partnerId) {
        enterDashboard();
    }

    if (state.currentUser) {
        fetchTasks();
        fetchPunishments();
    }

    // Auto-poll if we are stuck on the setup/couple page without a partner
    if (state.currentUser && !state.partnerId) {
        startCoupleStatusPolling();
    }
};

const fetchTasks = async () => {
    if (!state.currentUser || !state.partnerId) return;
    try {
        const res1 = await fetch(`${API_BASE}/deadline/${state.currentUser.id}`);
        const myTasks = await res1.json();
        console.log("My Tasks from DB:", myTasks);

        const res2 = await fetch(`${API_BASE}/deadline/${state.partnerId}`);
        const partnerTasks = await res2.json();
        console.log("Partner ID:", state.partnerId, "Partner Tasks from DB:", partnerTasks);

        // Map backend tasks to frontend state format
        const mapTask = (t) => ({
            id: t.id,
            userId: t.user_id,
            chapId: t.chapter_id,
            subject: t.subject,
            chapNum: t.chapter_number,
            chapName: t.chapter_name || `Chapter ${t.chapter_number}`,
            deadline: t.deadline_time,
            status: t.status
        });

        const allTasks = [...myTasks.map(mapTask), ...partnerTasks.map(mapTask)];
        console.log("Total mapped tasks:", allTasks);
        state.tasks = allTasks;
        saveTasks();
        renderDashboard();
    } catch (err) {
        console.error("Error fetching tasks:", err);
    }
};

const startCoupleStatusPolling = () => {
    if (window.coupleStatusInterval) return;

    window.coupleStatusInterval = setInterval(async () => {
        if (!state.currentUser || state.partnerId) {
            clearInterval(window.coupleStatusInterval);
            delete window.coupleStatusInterval;
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/couple/status/${state.currentUser.id}`);
            const data = await res.json();

            if (data.linked) {
                state.partnerId = data.partner_id;
                state.partnerName = data.partner_name;
                localStorage.setItem('studyLinkPartnerId', state.partnerId);
                localStorage.setItem('studyLinkPartnerName', state.partnerName || "Partner");
                clearInterval(window.coupleStatusInterval);
                delete window.coupleStatusInterval;
                enterDashboard();
            }
        } catch (err) {
            console.error("Polling error:", err);
        }
    }, 3000);
};

const fetchPunishments = async () => {
    if (!state.currentUser || !state.partnerId) return;
    try {
        const [res1, res2] = await Promise.all([
            fetch(`${API_BASE}/punishment/${state.currentUser.id}`),
            fetch(`${API_BASE}/punishment/${state.partnerId}`)
        ]);
        
        const myPuns = await res1.json();
        const partnerPuns = await res2.json();

        const allPuns = [
            ...myPuns.map(p => ({
                id: p.id,
                assigneeId: state.currentUser.id,
                assignerId: state.partnerId,
                title: p.title,
                taskId: p.task_id, 
                status: p.status
            })),
            ...partnerPuns.map(p => ({
                id: p.id,
                assigneeId: state.partnerId,
                assignerId: state.currentUser.id,
                title: p.title,
                taskId: p.task_id,
                status: p.status
            }))
        ];

        state.punishments = allPuns;
        savePunishments();
        renderDashboard();
    } catch (err) {
        console.error("Error fetching punishments:", err);
    }
};

const saveTasks = () => localStorage.setItem('studyLinkTasks', JSON.stringify(state.tasks));
const savePunishments = () => localStorage.setItem('studyLinkPunishments', JSON.stringify(state.punishments));

const showMsg = (elId, msg, isError = false) => {
    const el = document.getElementById(elId);
    if (el) {
        el.innerText = msg;
        el.className = `status-msg ${isError ? 'error' : 'success'}`;
        setTimeout(() => { el.innerText = ""; el.className = "status-msg" }, 3000);
    }
};

const switchPage = (pageId) => {
    document.getElementById('page-setup').classList.remove('active');
    document.getElementById('page-dashboard').classList.remove('active');
    document.getElementById(pageId).classList.add('active');
};

const enterDashboard = () => {
    document.getElementById('nav-info').innerText = `Me (ID: ${state.currentUser.id}) | Partner (ID: ${state.partnerId})`;
    switchPage('page-dashboard');
    startDeadlineChecker();
    fetchTasks();
    fetchPunishments();
    renderDashboard();
};

// --- AUTH & LINKING ---

// UI Tabs
document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').style.borderBottom = "2px solid var(--primary)";
    document.getElementById('tab-login').style.color = "var(--text-main)";
    document.getElementById('tab-register').style.borderBottom = "none";
    document.getElementById('tab-register').style.color = "var(--text-muted)";
    document.getElementById('form-login').classList.remove('display-none');
    document.getElementById('form-register').classList.add('display-none');
});
document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').style.borderBottom = "2px solid var(--primary)";
    document.getElementById('tab-register').style.color = "var(--text-main)";
    document.getElementById('tab-login').style.borderBottom = "none";
    document.getElementById('tab-login').style.color = "var(--text-muted)";
    document.getElementById('form-register').classList.remove('display-none');
    document.getElementById('form-login').classList.add('display-none');
});

// Register
document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-pass').value,
    };
    try {
        const res = await fetch(`${API_BASE}/users/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error registering");

        state.currentUser = data;

        // Save to local mapping so they can "log in" later
        let DB = JSON.parse(localStorage.getItem('studyLinkUserDB') || '[]');
        DB.push(state.currentUser);
        localStorage.setItem('studyLinkUserDB', JSON.stringify(DB));

        localStorage.setItem('studyLinkUser', JSON.stringify(state.currentUser));
        document.getElementById('lbl-my-id').innerText = state.currentUser.id;
        document.getElementById('step-auth').classList.remove('active');
        document.getElementById('step-couple').classList.add('active');
    } catch (err) {
        showMsg('auth-status', err.message, true);
    }
});

// Login
document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        email: document.getElementById('login-email').value,
        password: document.getElementById('login-pass').value
    };

    try {
        const res = await fetch(`${API_BASE}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Invalid credentials");

        state.currentUser = data.user;
        localStorage.setItem('studyLinkUser', JSON.stringify(state.currentUser));
        document.getElementById('lbl-my-id').innerText = state.currentUser.id;

        if (data.partner_id) {
            state.partnerId = data.partner_id;
            state.partnerName = data.partner_name || "Partner";
            localStorage.setItem('studyLinkPartnerId', state.partnerId);
            localStorage.setItem('studyLinkPartnerName', state.partnerName);
            enterDashboard();
        } else {
            document.getElementById('step-auth').classList.remove('active');
            document.getElementById('step-couple').classList.add('active');
        }
    } catch (err) {
        showMsg('auth-status', err.message, true);
    }
});

const togglePunishment = async (id) => {
    const p = state.punishments.find(x => x.id == id);
    if (!p) return;

    const newStatus = p.status === "completed" ? "assigned" : "completed";

    try {
        const res = await fetch(`${API_BASE}/punishment/complete`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: p.id,
                status: newStatus
            })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.detail || "Update failed");

        p.status = newStatus;
        savePunishments();
        renderDashboard();

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

document.getElementById('btn-create-couple').addEventListener('click', async () => {
    try {
        const res = await fetch(`${API_BASE}/couple/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid1: parseInt(state.currentUser.id) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error creating couple");

        const display = document.getElementById('couple-code-display');
        display.innerText = data.unique_code;
        display.classList.remove('display-none');

        document.getElementById('btn-enter-dashboard').classList.remove('display-none');
        document.getElementById('btn-enter-dashboard').innerText = "Waiting for partner to join...";
        document.getElementById('btn-enter-dashboard').onclick = () => {
            alert("Still waiting for your partner to join using your code on their device! Once they join, this screen will automatically refresh into the dashboard.");
        };

        startCoupleStatusPolling();

    } catch (err) {
        alert(err.message);
    }
});

document.getElementById('form-join-couple').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('join-code').value;
    try {
        const res = await fetch(`${API_BASE}/couple/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid2: parseInt(state.currentUser.id), unique_code: code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error joining couple");

        showMsg('join-status', "Successfully Linked!");

        // We know couple info from response
        if (data.couple) {
            state.partnerId = data.couple.uid1 == state.currentUser.id ? data.couple.uid2 : data.couple.uid1;
            state.partnerName = data.partner_name || "Partner";
            localStorage.setItem('studyLinkPartnerId', state.partnerId);
            localStorage.setItem('studyLinkPartnerName', state.partnerName);
        }

        setTimeout(() => enterDashboard(), 1000);
    } catch (err) {
        showMsg('join-status', err.message, true);
    }
});

const logoutFunction = () => {
    localStorage.removeItem('studyLinkUser');
    localStorage.removeItem('studyLinkPartnerId');
    localStorage.removeItem('studyLinkPartnerName');
    localStorage.removeItem('studyLinkTasks');
    localStorage.removeItem('studyLinkPunishments');
    location.reload();
};

document.getElementById('btn-logout').addEventListener('click', logoutFunction);
document.getElementById('btn-logout-setup').addEventListener('click', logoutFunction);

document.getElementById('btn-delete-couple').addEventListener('click', async () => {
    if (confirm("Are you sure you want to unpair from this partner? This will reset your dashboard.")) {
        try {
            const res = await fetch(`${API_BASE}/couple/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: parseInt(state.currentUser.id) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error unpairing");

            // Wipe partner link
            localStorage.removeItem('studyLinkPartnerId');
            localStorage.removeItem('studyLinkPartnerName');
            localStorage.removeItem('studyLinkTasks');
            localStorage.removeItem('studyLinkPunishments');
            state.partnerId = null;
            state.partnerName = null;
            location.reload();
        } catch (err) {
            alert(err.message);
        }
    }
});


// --- DASHBOARD LOGIC ---

document.getElementById('btn-add-task').addEventListener('click', () => {
    document.getElementById('modal-task').style.display = 'flex';
});

document.getElementById('form-task').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tSub = document.getElementById('t-subject').value;
    const tChapNum = parseInt(document.getElementById('t-chap-num').value);
    const tChapName = document.getElementById('t-chap-name').value;
    const tDeadline = new Date(document.getElementById('t-deadline').value);

    // Call Backend (we fire and forget to satisfy backend tracking)
    try {
        // 1. Subject
        let resSub = await fetch(`${API_BASE}/subject/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tSub, user_id: state.currentUser.id })
        });
        let subData = await resSub.json();
        const subId = subData.id || Math.floor(Math.random() * 1000); // fallback

        // 2. Chapter
        let resChap = await fetch(`${API_BASE}/chapter/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subId, chapter_number: tChapNum, subject: tChapName })
        });
        let chapData = await resChap.json();
        const chapId = chapData.id || Math.floor(Math.random() * 1000);

        // 3. Deadline
        let resDeadline = await fetch(`${API_BASE}/deadline/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: state.currentUser.id, chapter_id: chapId, deadline_time: tDeadline.toISOString(), status: 'pending' })
        });
        let deadlineData = await resDeadline.json();
        const realTaskId = deadlineData.id;

        // Save local
        const task = {
            id: realTaskId || ('t_' + Date.now()),
            userId: state.currentUser.id,
            chapId: chapId, // for progress update
            subject: tSub,
            chapNum: tChapNum,
            chapName: tChapName,
            deadline: tDeadline.toISOString(),
            status: 'pending' // pending | completed | missed
        };
        state.tasks.push(task);
        saveTasks();

        document.getElementById('modal-task').style.display = 'none';
        e.target.reset();
        renderDashboard();

    } catch (err) {
        alert("Error saving: " + err.message);
    }
});

const toggleTaskStatus = async (taskId, checked) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    // Ignore if not my task
    if (task.userId !== state.currentUser.id) return;

    task.status = checked ? 'completed' : 'pending';
    saveTasks();
    renderDashboard();

    // Call API
    try {
        if (checked) {
            await fetch(`${API_BASE}/progress/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: state.currentUser.id, chapter_id: task.chapId, status: 'completed' })
            });
        }
    } catch (e) { console.error("API error", e); }
};

const deleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        const res = await fetch(`${API_BASE}/deadline/${taskId}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error("Failed to delete task");

        // Remove from local state
        state.tasks = state.tasks.filter(t => t.id !== taskId);
        saveTasks();
        renderDashboard();
    } catch (err) {
        alert(err.message);
    }
};

const deletePunishment = async (punId) => {
    if (!confirm("Are you sure you want to delete this punishment?")) return;

    try {
        const res = await fetch(`${API_BASE}/punishment/${punId}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error("Failed to delete punishment");

        state.punishments = state.punishments.filter(p => p.id !== punId);
        savePunishments();
        renderDashboard();
    } catch (err) {
        alert(err.message);
    }
};

const assignPunishment = (taskId, taskName) => {
    document.getElementById('p-task-id').value = taskId;
    document.getElementById('p-deadline-name').innerText = taskName;
    document.getElementById('modal-punishment').style.display = 'flex';
};

document.getElementById('form-assign-punish').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('p-title').value;
    const taskId = document.getElementById('p-task-id').value;

    try {
        const res = await fetch(`${API_BASE}/punishment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.partnerId,
                task_id: (taskId && !isNaN(taskId)) ? parseInt(taskId) : null, // Send real DB ID if available
                title: title,
                status: 'assigned'
            })
        });

        const data = await res.json(); // ✅ correct placement

        if (!res.ok) throw new Error(data.detail || "Error assigning punishment");

        state.punishments.push({
            id: data.id,   // ✅ real DB id
            assigneeId: state.partnerId,
            assignerId: state.currentUser.id,
            title: title,
            taskId: taskId,
            status: 'assigned'
        });

        savePunishments();

        document.getElementById('modal-punishment').style.display = 'none';
        e.target.reset();
        renderDashboard();

    } catch (err) {
        alert("Error: " + err.message);
    }
});

// --- RENDER ENGINE ---

const renderDashboard = () => {
    if (!state.currentUser) return;

    // Sync missed statuses before rendering to avoid UI flicker on refresh
    const now = new Date();
    let statusChanged = false;
    state.tasks.forEach(t => {
        if (t.status === 'pending' || t.status === 'active') {
             if (new Date(t.deadline) < now) {
                t.status = 'missed';
                statusChanged = true;
             }
        }
    });
    if (statusChanged) saveTasks();

    // Safety check: ensure dashboard elements exist
    const myBoardTitle = document.getElementById('my-board-title');
    if (!myBoardTitle) return;

    // Personalized Headings
    const myName = state.currentUser.name || "Me";
    const partnerName = state.partnerName || "Partner";

    myBoardTitle.innerText = `${myName}'s Tracker`;
    document.getElementById('partner-board-title').innerText = `${partnerName}'s Tracker`;

    document.getElementById('my-missed-title').innerText = `${myName}'s Missed Deadlines`;
    document.getElementById('partner-missed-title').innerText = `${partnerName}'s Missed Deadlines`;

    document.getElementById('my-punishment-title').innerText = `Punishments for ${myName}`;
    document.getElementById('partner-punishment-title').innerText = `Punishments for ${partnerName}`;

    const myTBody = document.getElementById('my-tasks-body');
    const myCompBody = document.getElementById('my-completed-body');
    const partnerTBody = document.getElementById('partner-tasks-body');
    const partnerCompBody = document.getElementById('partner-completed-body');

    const myMissedBody = document.getElementById('my-missed-list');
    const partnerMissedBody = document.getElementById('partner-missed-list');

    const myPunishmentsBody = document.getElementById('my-punishment-list');
    const partnerPunishsmentBody = document.getElementById('partner-punishment-list');

    myTBody.innerHTML = ''; myCompBody.innerHTML = '';
    partnerTBody.innerHTML = ''; partnerCompBody.innerHTML = '';
    myMissedBody.innerHTML = ''; partnerMissedBody.innerHTML = '';
    myPunishmentsBody.innerHTML = ''; partnerPunishsmentBody.innerHTML = '';

    let myAnyCompleted = false;
    let partnerAnyCompleted = false;

    // Calculate Progress
    const myTasks = state.tasks.filter(t => t.userId === state.currentUser.id);
    const partnerTasks = state.tasks.filter(t => t.userId === state.partnerId);

    const calcProgress = (tasks) => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.status === 'completed').length;
        return Math.round((completed / tasks.length) * 100);
    };

    const myPercent = calcProgress(myTasks);
    const partnerPercent = calcProgress(partnerTasks);

    document.getElementById('my-progress-bar').style.width = `${myPercent}%`;
    document.getElementById('my-progress-text').innerText = `${myPercent}%`;
    document.getElementById('partner-progress-bar').style.width = `${partnerPercent}%`;
    document.getElementById('partner-progress-text').innerText = `${partnerPercent}%`;

    // Sort tasks
    state.tasks.forEach(t => {
        const dStr = new Date(t.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        if (t.status === 'pending' || t.status === 'completed' || t.status === 'active') {
            const tr = document.createElement('tr');
            const isMe = t.userId === state.currentUser.id;
            
            if (t.status === 'completed') {
                tr.className = 'completed-row';
                if (isMe) myAnyCompleted = true;
                else partnerAnyCompleted = true;
            }

            const ck = isMe ? `<input type="checkbox" class="task-checkbox" ${t.status === 'completed' ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)">` : (t.status === 'completed' ? '✅' : '◻️');
            
            const deleteBtn = isMe ? `<button class="danger-btn" style="padding:0.4rem 0.6rem; font-size:0.8rem;" onclick="deleteTask(${t.id})">🗑️</button>` : '';

            tr.innerHTML = `
                <td>${ck}</td>
                <td>${t.subject}</td>
                <td>Ch.${t.chapNum}: ${t.chapName}</td>
                <td>${dStr}</td>
                <td>${deleteBtn}</td>
            `;

            if (isMe) {
                if (t.status === 'completed') myCompBody.appendChild(tr);
                else myTBody.appendChild(tr);
            } else {
                if (t.status === 'completed') partnerCompBody.appendChild(tr);
                else partnerTBody.appendChild(tr);
            }
        } else if (t.status === 'missed') {
            const div = document.createElement('div');
            div.className = 'list-item';

            const isMe = t.userId === state.currentUser.id;

            if (isMe) {
                div.innerHTML = `<span><strong style="color:var(--danger)">Missed:</strong> ${t.subject} (Ch.${t.chapNum})</span> <span>Due: ${dStr}</span>`;
                myMissedBody.appendChild(div);
            } else {
                // Check if punishment already assigned
                const pAssigned = state.punishments.some(p => String(p.taskId) === String(t.id));
                const btnHtml = pAssigned
                    ? `<span style="color:var(--success)">Punished</span>`
                    : `<button class="danger-btn" style="padding:0.4em 0.8em;" onclick="assignPunishment('${t.id}', '${t.subject} - Ch.${t.chapNum}')">Assign Punishment</button>`;

                div.innerHTML = `<span><strong>Missed:</strong> ${t.subject} (Ch.${t.chapNum})</span> ${btnHtml}`;
                partnerMissedBody.appendChild(div);
            }
        }
    });

    // Toggle Completed Headers
    document.getElementById('my-completed-header-row').className = myAnyCompleted ? '' : 'display-none';
    document.getElementById('partner-completed-header-row').className = partnerAnyCompleted ? '' : 'display-none';

    state.punishments.forEach(p => {
        const div = document.createElement('div');
        div.className = 'list-item';

        const isMine = p.assignerId === state.currentUser.id;

        let deletePBtn = "";
        if (isMine) {
            deletePBtn = `<button class="danger-btn" style="padding:0.4rem 0.6rem; font-size:0.8rem; margin-left:8px;" onclick="deletePunishment(${p.id})">🗑️</button>`;
            if (p.status === 'completed') {
                actionBtn = `<button class="danger-btn" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="togglePunishment(${p.id})">Undo</button>`;
            } else {
                actionBtn = `<button class="success-btn" style="padding:0.4rem 0.8rem;" onclick="togglePunishment(${p.id})">Mark Done</button>`;
            }
        }

        const statusLabel = p.status === 'completed'
            ? `<span style="color:var(--success)">Completed ✅</span>`
            : `<span style="color:var(--text-muted)">Assigned</span>`;

        div.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <span style="color:var(--danger); font-weight:600;">🔥 ${p.title}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${statusLabel}
                    ${actionBtn}
                </div>
            </div>
            ${deletePBtn}
        `;

        if (p.assigneeId === state.currentUser.id) myPunishmentsBody.appendChild(div);
        else partnerPunishsmentBody.appendChild(div);
    });

    if (myMissedBody.innerHTML === '') myMissedBody.innerHTML = `<p class="small-text">No missed deadlines! Keep it up. ✨</p>`;
    if (partnerMissedBody.innerHTML === '')
        partnerMissedBody.innerHTML = `<p class="small-text">No missed deadlines.</p>`;
};

// Check for misses every minute
const startDeadlineChecker = () => {
    setInterval(() => {
        let changed = false;
        const now = new Date();
        state.tasks.forEach(t => {
            if (t.status === 'pending') {
                const due = new Date(t.deadline);
                if (due < now) {
                    t.status = 'missed';
                    changed = true;
                    // Send to backend potentially? No endpoint for generic edit, so just locally
                }
            }
        });
        if (changed) {
            saveTasks();
            renderDashboard();
        }
    }, 10000); // checking every 10s for demo purposes
};
