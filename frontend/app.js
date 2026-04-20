const API_BASE = "https://study-tracker-o508.onrender.com";
// const API_BASE = "http://127.0.0.1:8000";
let state = {
    currentUser: null,
    partnerId: null,
    partnerName: null, // New field for personalization
    myActivity: null,
    partnerActivity: null,
    tasks: [],
    punishments: [],
    rewards: [],
    sounds: {
        reward: new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3'),
        message: new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_2ea93d6c1f.mp3'),
        photo: new Audio('https://cdn.pixabay.com/audio/2022/03/10/audio_c8de304250.mp3'),
        punishment: new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_12b7950bed.mp3'),
        fanfare: new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3') // Placeholder, using reward sound for now
    }
};

const playSound = (type) => {
    if (state.sounds[type]) {
        state.sounds[type].currentTime = 0;
        state.sounds[type].play().catch(e => console.log("Sound play blocked:", e));
    }
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    loadLocalState();
    setupCelebrationHooks();

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

    const rew = localStorage.getItem('studyLinkRewards');
    if (rew) state.rewards = JSON.parse(rew);

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
        fetchRewards();
    }

    // Auto-poll if we are stuck on the setup/couple page without a partner
    if (state.currentUser && !state.partnerId) {
        startCoupleStatusPolling();
    }
};

const fetchTasks = async () => {
    if (!state.currentUser || !state.partnerId) return;
    try {
        const [res1, res2, resProg1, resProg2] = await Promise.all([
            fetch(`${API_BASE}/deadline/${state.currentUser.id}`),
            fetch(`${API_BASE}/deadline/${state.partnerId}`),
            fetch(`${API_BASE}/progress/${state.currentUser.id}`),
            fetch(`${API_BASE}/progress/${state.partnerId}`)
        ]);

        const myTasks = await res1.json();
        const partnerTasks = await res2.json();
        const myProg = await resProg1.json();
        const partnerProg = await resProg2.json();

        // Map chapter ID to completion status for persistence
        const completedChapters = new Set([
            ...myProg.filter(p => p.status === 'completed').map(p => p.chapter_id),
            ...partnerProg.filter(p => p.status === 'completed').map(p => p.chapter_id)
        ]);

        // Map backend tasks to frontend state format
        const mapTask = (t) => {
            let status = t.status;
            if (completedChapters.has(t.chapter_id)) {
                if (status === 'missed') status = 'missed-done';
                else if (status === 'pending' || status === 'active') status = 'completed';
            }

            return {
                id: t.id,
                userId: t.user_id,
                chapId: t.chapter_id,
                subject: t.subject,
                chapNum: t.chapter_number,
                chapName: t.chapter_name || `Chapter ${t.chapter_number}`,
                deadline: t.deadline_time,
                status: status,
                secretMessage: t.secret_message
            };
        };

        const allTasks = [...myTasks.map(mapTask), ...partnerTasks.map(mapTask)];
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
                status: p.status,
                category: p.category
            })),
            ...partnerPuns.map(p => ({
                id: p.id,
                assigneeId: state.partnerId,
                assignerId: state.currentUser.id,
                title: p.title,
                taskId: p.task_id,
                status: p.status,
                category: p.category
            }))
        ];

        state.punishments = allPuns;
        savePunishments();
        renderDashboard();
    } catch (err) {
        console.error("Error fetching punishments:", err);
    }
};

const fetchRewards = async () => {
    if (!state.currentUser || !state.partnerId) return;
    try {
        const [res1, res2] = await Promise.all([
            fetch(`${API_BASE}/reward/${state.currentUser.id}`),
            fetch(`${API_BASE}/reward/${state.partnerId}`)
        ]);
        
        const myRews = await res1.json();
        const partnerRews = await res2.json();

        state.rewards = [
            ...myRews.map(r => ({ ...r, receiverId: state.currentUser.id })),
            ...partnerRews.map(r => ({ ...r, receiverId: state.partnerId }))
        ];
        saveRewards();
        renderDashboard();
    } catch (err) {
        console.error("Error fetching rewards:", err);
    }
};

const saveTasks = () => localStorage.setItem('studyLinkTasks', JSON.stringify(state.tasks));
const savePunishments = () => localStorage.setItem('studyLinkPunishments', JSON.stringify(state.punishments));
const saveRewards = () => localStorage.setItem('studyLinkRewards', JSON.stringify(state.rewards));

const showMsg = (elId, msg, isError = false) => {
    const el = document.getElementById(elId);
    if (el) {
        el.innerText = msg;
        el.className = `status-msg ${isError ? 'error' : 'success'}`;
        setTimeout(() => { el.innerText = ""; el.className = "status-msg" }, 3000);
    }
};

const switchPage = (pageId) => {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
};

const enterDashboard = async () => {
    // Refresh partner info to get current name
    if (state.currentUser && state.partnerId) {
        try {
            const res = await fetch(`${API_BASE}/couple/status/${state.currentUser.id}`);
            const data = await res.json();
            if (data.linked && data.partner_name) {
                state.partnerName = data.partner_name;
                localStorage.setItem('studyLinkPartnerName', state.partnerName);
            }
        } catch (e) { console.error("Could not refresh partner name", e); }
    }

    document.getElementById('nav-info').innerText = `Me (ID: ${state.currentUser.id}) | Partner (ID: ${state.partnerId})`;
    switchPage('page-dashboard');
    startDeadlineChecker();
    fetchTasks();
    fetchPunishments();
    fetchRewards();
    fetchActivity();
    renderDashboard();
    fetchDailyImage();
    
    // Start activity polling
    startActivityPolling();
};

const fetchActivity = async () => {
    if (!state.currentUser) return;
    try {
        const fetchMe = fetch(`${API_BASE}/users/${state.currentUser.id}/activity`).then(r => r.json());
        let fetches = [fetchMe];
        if (state.partnerId) {
            fetches.push(fetch(`${API_BASE}/users/${state.partnerId}/activity`).then(r => r.json()));
        }
        
        const results = await Promise.all(fetches);
        state.myActivity = results[0];
        if (results.length > 1) state.partnerActivity = results[1];
        
        const myActivity = state.myActivity;
        
        // Update my UI
        document.getElementById('my-streak-count').innerText = `${myActivity.streak} Day Streak`;
        document.getElementById('my-points-count').innerText = `${myActivity.reward_points || 0} Points`;
        
        if (myActivity.is_active) {
            document.getElementById('my-status-text').innerText = "Currently Studying";
            document.getElementById('my-status-indicator').className = "status-dot active";
        } else {
            document.getElementById('my-status-text').innerText = "Offline";
            document.getElementById('my-status-indicator').className = "status-dot offline";
        }
        
        let syncLevel = 0;
        if (myActivity.is_active) syncLevel += 50;

        // Update partner UI
        if (state.partnerId && results[1]) {
            const partnerActivity = results[1];
            document.getElementById('partner-streak-count').innerText = `${partnerActivity.streak} Day Streak`;
            document.getElementById('partner-points-count').innerText = `🪙 ${partnerActivity.reward_points || 0} Points`;
            
            if (partnerActivity.is_active) {
                document.getElementById('partner-status-text').innerText = "Currently Studying";
                document.getElementById('partner-status-indicator').className = "status-dot active";
                document.getElementById('partner-status-dot').classList.remove('display-none');
                syncLevel += 50;
            } else {
                document.getElementById('partner-status-text').innerText = "Offline";
                document.getElementById('partner-status-indicator').className = "status-dot offline";
                document.getElementById('partner-status-dot').classList.add('display-none');
            }
        }

        let syncText = "Desynchronized";
        if (syncLevel === 100) syncText = "Synchronized";
        else if (syncLevel === 50) syncText = "Partial Sync";

        const syncLabel = document.getElementById('sync-status-label');
        const syncFill = document.getElementById('sync-progress-fill');
        const syncPill = document.querySelector('.couple-stat-pill');
        if (syncLabel && syncFill && syncPill) {
            syncLabel.innerText = syncText;
            syncFill.style.width = `${syncLevel}%`;
            if (syncLevel === 100) {
                syncPill.classList.add('sync-glow');
                window.isFullySynchronized = true;
            } else {
                syncPill.classList.remove('sync-glow');
                window.isFullySynchronized = false;
            }
        }
    } catch (err) {
        console.error("Error fetching activity:", err);
    }
};

const startActivityPolling = () => {
    if (window.activityInterval) clearInterval(window.activityInterval);
    
    // Ping my activity immediately
    fetch(`${API_BASE}/users/${state.currentUser.id}/ping`, { method: 'POST' }).catch(e => console.error(e));
    
    window.activityInterval = setInterval(() => {
        if (!state.currentUser) {
            clearInterval(window.activityInterval);
            return;
        }
        
        // Ping to mark as active
        fetch(`${API_BASE}/users/${state.currentUser.id}/ping`, { method: 'POST' }).catch(e => console.error(e));
        
        // Fetch statuses
        fetchActivity();
    }, 60000); // every 1 min
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
    const p = state.punishments.find(x => String(x.id) === String(id));
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
    localStorage.removeItem('studyLinkRewards');
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
            localStorage.removeItem('studyLinkRewards');
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
        if (!resSub.ok) {
            const err = await resSub.json();
            throw new Error(err.detail ? JSON.stringify(err.detail) : "Failed to create subject");
        }
        let subData = await resSub.json();
        const subId = subData.id;

        // 2. Chapter
        let resChap = await fetch(`${API_BASE}/chapter/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: subId, chapter_number: tChapNum, subject: tChapName })
        });
        if (!resChap.ok) {
            const err = await resChap.json();
            throw new Error(err.detail ? JSON.stringify(err.detail) : "Failed to create chapter");
        }
        let chapData = await resChap.json();
        const chapId = chapData.id;

        // 3. Deadline
        const localDeadline = document.getElementById('t-deadline').value; // Keep local string to avoid UTC shifts
        let deadlinePayload = { user_id: state.currentUser.id, chapter_id: chapId, deadline_time: localDeadline, status: 'pending' };

        let resDeadline = await fetch(`${API_BASE}/deadline/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deadlinePayload)
        });
        if (!resDeadline.ok) {
            const err = await resDeadline.json();
            throw new Error(err.detail ? JSON.stringify(err.detail) : "Failed to create deadline");
        }
        let deadlineData = await resDeadline.json();
        const realTaskId = deadlineData.id;

        // Save local
        const task = {
            id: realTaskId,
            userId: state.currentUser.id,
            chapId: chapId,
            subject: tSub,
            chapNum: tChapNum,
            chapName: tChapName,
            deadline: localDeadline,
            status: 'pending'
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
    const task = state.tasks.find(t => String(t.id) === String(taskId));
    if (!task) return;

    // Ignore if not my task
    if (String(task.userId) !== String(state.currentUser.id)) return;

    if (task.status === 'missed' || task.status === 'missed-done') {
        task.status = checked ? 'missed-done' : 'missed';
    } else {
        task.status = checked ? 'completed' : 'pending';
    }
    
    saveTasks();
    renderDashboard();

    // Call API
    try {
        if (checked) {
            console.log("Adding progress record...");
            const res = await fetch(`${API_BASE}/progress/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: state.currentUser.id, chapter_id: task.chapId, status: 'completed' })
            });
            if (!res.ok) console.error("Failed to add progress", await res.text());
        } else {
            console.log("Removing progress record...");
            const res = await fetch(`${API_BASE}/progress/${state.currentUser.id}/${task.chapId}`, {
                method: 'DELETE'
            });
            if (!res.ok) console.error("Failed to delete progress", await res.text());
        }
        // Force a re-fetch of everything to be sure UI is in sync with DB truth
        await fetchTasks();
    } catch (e) { 
        console.error("API error during status toggle:", e); 
        // Revert local UI if API failed
        task.status = checked ? (task.status === 'completed' ? 'pending' : 'missed') : (task.status === 'missed' ? 'missed-done' : 'completed');
        renderDashboard();
    }
};

const deleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        const res = await fetch(`${API_BASE}/deadline/${taskId}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error("Failed to delete task");

        // Remove from local state
        state.tasks = state.tasks.filter(t => String(t.id) !== String(taskId));
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

        state.punishments = state.punishments.filter(p => String(p.id) !== String(punId));
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
    const category = document.getElementById('p-category').value;

    try {
        const res = await fetch(`${API_BASE}/punishment/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.partnerId,
                task_id: (taskId && !isNaN(taskId)) ? parseInt(taskId) : null, // Send real DB ID if available
                title: title,
                status: 'assigned',
                category: category
            })
        });

        const data = await res.json(); // correct placement

        if (!res.ok) throw new Error(data.detail || "Error assigning punishment");

        state.punishments.push({
            id: data.id,   // real DB id
            assigneeId: state.partnerId,
            assignerId: state.currentUser.id,
            title: title,
            taskId: taskId,
            status: 'assigned',
            category: category
        });

        savePunishments();

        document.getElementById('modal-punishment').style.display = 'none';
        e.target.reset();
        renderDashboard();
        playSound('punishment');

    } catch (err) {
        alert("Error: " + err.message);
    }
});

// --- REWARD LOGIC ---
const assignReward = async (title) => {
    try {
        const res = await fetch(`${API_BASE}/reward/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: state.partnerId,
                assigner_id: state.currentUser.id,
                title: title,
                status: 'assigned'
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error assigning reward");

        state.rewards.push({
            id: data.id,
            receiverId: state.partnerId,
            assigner_id: state.currentUser.id,
            title: title,
            status: 'assigned'
        });

        saveRewards();
        renderDashboard();
        fetchActivity(); // Refresh points after spending
        playSound('reward');
    } catch (err) {
        alert("Error: " + err.message);
    }
};

const claimDailyPoint = async () => {
    if (!state.currentUser || state.dailyPointClaimedToday) return;
    try {
        const res = await fetch(`${API_BASE}/users/${state.currentUser.id}/claim_daily`, {
            method: 'POST'
        });
        const data = await res.json();
        if (res.ok) {
            state.dailyPointClaimedToday = true;
            fetchActivity(); // Refresh points display
            alert("✨ Achievement Unlocked: 100% Completion! You earned 1 Reward Point!");
        }
    } catch (e) {
        console.error("Daily point already claimed or error:", e);
    }
};

const toggleReward = async (id, newStatus) => {
    const r = state.rewards.find(x => String(x.id) === String(id));
    if (!r) return;

    try {
        const res = await fetch(`${API_BASE}/reward/redeem`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: r.id, status: newStatus })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Update failed");

        r.status = newStatus;
        saveRewards();
        renderDashboard();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
};

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

    // Personalized Headings & Icons
    const myName = state.currentUser.name || "Me";
    const partnerName = state.partnerName || "Partner";
    
    const myInitial = myName.charAt(0).toUpperCase();
    const partnerInitial = partnerName.charAt(0).toUpperCase();
    
    const myIcon = document.getElementById('my-player-icon');
    const partnerIcon = document.getElementById('partner-player-icon');
    
    const myDotClass = (state.myActivity && state.myActivity.is_active) ? 'pulsing-dot' : 'pulsing-dot display-none';
    const partnerDotClass = (state.partnerActivity && state.partnerActivity.is_active) ? 'pulsing-dot' : 'pulsing-dot display-none';

    if (myIcon) myIcon.innerHTML = `${myInitial}<div class="${myDotClass}" id="my-status-dot"></div>`;
    if (partnerIcon) partnerIcon.innerHTML = `${partnerInitial}<div class="${partnerDotClass}" id="partner-status-dot"></div>`;

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

    const myRewardBody = document.getElementById('my-reward-list');
    const partnerRewardBody = document.getElementById('partner-reward-list');
    if (myRewardBody) myRewardBody.innerHTML = '';
    if (partnerRewardBody) partnerRewardBody.innerHTML = '';

    let myAnyCompleted = false;
    let partnerAnyCompleted = false;

    // Calculate Progress
    const myTasks = state.tasks.filter(t => String(t.userId) === String(state.currentUser.id));
    const partnerTasks = state.tasks.filter(t => String(t.userId) === String(state.partnerId));

    const calcProgress = (tasks) => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.status === 'completed' || t.status === 'missed-done').length;
        return Math.round((completed / tasks.length) * 100);
    };

    const myPercent = calcProgress(myTasks);
    const partnerPercent = calcProgress(partnerTasks);
    
    console.log(`Progress Update - Me: ${myPercent}% (${myTasks.length} tasks), Partner: ${partnerPercent}% (${partnerTasks.length} tasks)`);

    document.getElementById('my-progress-bar').style.width = `${myPercent}%`;
    document.getElementById('my-progress-text').innerText = `${myPercent}%`;
    document.getElementById('partner-progress-bar').style.width = `${partnerPercent}%`;
    document.getElementById('partner-progress-text').innerText = `${partnerPercent}%`;

    // Handle Daily Mystery Unlock (if partner uploaded)
    if (myPercent === 100 && state.partnerId) {
        const pImg = document.getElementById('partner-mystery-img');
        if (pImg && pImg.dataset.id && pImg.style.filter !== 'none') {
            fetch(`${API_BASE}/daily_image/unlock`, {
                method: "PATCH",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: pImg.dataset.id, is_unlocked: true})
            }).then(() => {
                pImg.style.filter = 'none';
                document.getElementById('partner-mystery-lock').style.display = 'none';
            }).catch(e => console.error(e));
        }
    }

    // Handle Earning Reward Point at 100%
    if (myPercent === 100) {
        claimDailyPoint();
    }

    // Sort tasks
    state.tasks.forEach(t => {
        const dStr = new Date(t.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const isMe = String(t.userId) === String(state.currentUser.id);

        if (t.status === 'pending' || t.status === 'completed' || t.status === 'active') {
            const tr = document.createElement('tr');
            
            if (t.status === 'completed') {
                tr.className = 'completed-row';
                if (isMe) myAnyCompleted = true;
                else partnerAnyCompleted = true;
            }

            const ck = isMe ? `<input type="checkbox" class="task-checkbox" ${t.status === 'completed' ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)">` : (t.status === 'completed' ? 'Done' : 'Pending');
            const deleteBtn = isMe ? `<button class="danger-btn" style="padding:0.4rem 0.6rem; font-size:0.8rem;" onclick="deleteTask(${t.id})">Delete</button>` : '';
            
            // Note logic
            let noteBtn = "";
            let secretHtml = "";
            
            if (isMe) {
                // For me, hide secret message until completion
                if (t.status === 'completed' && t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#ec4899; margin-top:4px;">💌 Partner says: ${t.secretMessage}</div>`;
                } else if (t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#888; margin-top:4px;">🔒 Secret message hidden</div>`;
                }
            } else {
                // For partner tasks, show "Give Note" button and show them the note they wrote
                noteBtn = `<button class="hud-success-btn" style="padding:0.4rem 0.6rem; font-size:0.8rem; background: #10b981; margin-left: 5px;" onclick="openNoteModal('${t.id}', '${t.subject} Ch.${t.chapNum}')">${t.secretMessage ? 'Edit Note' : 'Give Note'}</button>`;
                if (t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#10b981; margin-top:4px;">📝 Your note: ${t.secretMessage}</div>`;
                }
            }

            tr.innerHTML = `
                <td>${ck}</td>
                <td>${t.subject}</td>
                <td>Ch.${t.chapNum}: ${t.chapName} ${secretHtml}</td>
                <td>${dStr}</td>
                <td><div style="display:flex; gap:5px;">${deleteBtn} ${noteBtn}</div></td>
            `;

            if (isMe) {
                if (t.status === 'completed') myCompBody.appendChild(tr);
                else myTBody.appendChild(tr);
            } else {
                if (t.status === 'completed') partnerCompBody.appendChild(tr);
                else partnerTBody.appendChild(tr);
            }
        } else if (t.status === 'missed' || t.status === 'missed-done') {
            const div = document.createElement('div');
            div.className = 'list-item';
            if (t.status === 'missed-done') div.style.opacity = '0.7';

            if (isMe) {
                const isDone = t.status === 'missed-done';
                let secretHtml = "";
                if (isDone && t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#ec4899; margin-top:4px;">💌 Partner says: ${t.secretMessage}</div>`;
                } else if (t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#888; margin-top:4px;">🔒 Secret message hidden</div>`;
                }

                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <input type="checkbox" class="task-checkbox" ${isDone ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)">
                            <span style="${isDone ? 'text-decoration:line-through;' : ''}"><strong class="hud-alert-text">Missed:</strong> ${t.subject} (Ch.${t.chapNum})</span>
                        </div>
                        <span style="font-size:0.8rem; color:#555">Due: ${dStr}</span>
                        ${secretHtml}
                    </div>
                `;
                myMissedBody.appendChild(div);
            } else {
                const isPartnerDone = t.status === 'missed-done';
                const pAssigned = state.punishments.some(p => String(p.taskId) === String(t.id));
                const punishBtnHtml = pAssigned
                    ? `<span style="color:var(--success)">Punished</span>`
                    : `<button class="danger-btn" style="padding:0.4em 0.8em;" onclick="assignPunishment('${t.id}', '${t.subject} - Ch.${t.chapNum}')">Assign Punishment</button>`;

                const noteBtnHtml = `<button class="hud-success-btn" style="padding:0.4rem 0.6rem; font-size:0.7rem; background: #10b981; width:auto;" onclick="openNoteModal('${t.id}', '${t.subject} Ch.${t.chapNum}')">${t.secretMessage ? 'Edit Note' : 'Give Note'}</button>`;
                
                let secretHtml = "";
                if (t.secretMessage) {
                    secretHtml = `<div style="font-size:0.75rem; color:#10b981; margin-top:4px;">📝 Your note: ${t.secretMessage}</div>`;
                }

                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                        <div style="display:flex; flex-direction:column; gap:2px;">
                            <span style="${isPartnerDone ? 'text-decoration:line-through; opacity:0.6;' : ''}"><strong class="hud-alert-text">Missed:</strong> ${t.subject} (Ch.${t.chapNum})</span>
                            ${isPartnerDone ? '<span style="font-size:0.7rem; color:var(--hud-green)">Finished late</span>' : ''}
                        </div>
                        ${secretHtml}
                        <div style="display:flex; gap:8px; margin-top:4px;">
                            ${punishBtnHtml}
                            ${noteBtnHtml}
                        </div>
                    </div>
                `;
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

        const isMine = String(p.assignerId) === String(state.currentUser.id);
        const isAssignee = String(p.assigneeId) === String(state.currentUser.id);

        let deletePBtn = "";
        let actionBtn = ""; // Declare here so it exists for all paths

        if (isMine) {
            deletePBtn = `<button class="hud-text-btn" style="color:var(--hud-red); margin-left:8px;" onclick="deletePunishment(${p.id})">Delete</button>`;
            if (p.status === 'completed') {
                actionBtn = `<button class="hud-secondary-btn" style="padding:4px 8px; font-size:0.7rem;" onclick="togglePunishment(${p.id})">Undo</button>`;
            } else {
                actionBtn = `<button class="hud-primary-btn" style="padding:4px 8px; font-size:0.7rem; width:auto;" onclick="togglePunishment(${p.id})">Mark Done</button>`;
            }
        }

        const statusLabel = p.status === 'completed'
            ? `<span style="color:var(--hud-green)">Completed</span>`
            : `<span style="color:#555">Active</span>`;
            
        const catLabel = p.category ? `<span style="font-size:0.6rem; padding: 2px 6px; border-radius: 4px; background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4); text-transform: uppercase;">${p.category}</span>` : '';

        div.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="color:var(--hud-red); font-weight:700; font-size:0.8rem;">! ${p.title}</span>
                    ${catLabel}
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${statusLabel}
                    ${actionBtn}
                </div>
            </div>
            ${deletePBtn}
        `;

        if (isAssignee) myPunishmentsBody.appendChild(div);
        else partnerPunishsmentBody.appendChild(div);
    });

    state.rewards.forEach(r => {
        const div = document.createElement('div');
        div.className = 'list-item';
        
        const isMine = String(r.receiverId) === String(state.currentUser.id);
        
        let actionBtn = "";
        
        if (isMine && r.status === 'assigned') {
            actionBtn = `<button class="hud-success-btn" style="padding:4px 8px; font-size:0.7rem; width:auto; background: #ec4899; box-shadow: 0 0 10px #ec4899; border:none;" onclick="toggleReward(${r.id}, 'redeemed')">Redeem</button>`;
        } else if (r.status === 'redeemed') {
            actionBtn = `<span style="color:#ec4899; font-size: 0.8rem; font-weight:bold;">Redeemed ✨</span>`;
        } else if (!isMine && r.status === 'assigned') {
            actionBtn = `<span style="color:#555; font-size: 0.8rem;">Waiting for partner</span>`;
        }

        div.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="color:#ec4899; font-weight:700; font-size:0.8rem;">🎁 ${r.title}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${actionBtn}
                </div>
            </div>
        `;
        
        if (isMine && myRewardBody) myRewardBody.appendChild(div);
        else if (partnerRewardBody) partnerRewardBody.appendChild(div);
    });

    if (myMissedBody.innerHTML === '') myMissedBody.innerHTML = `<p class="small-text">No missed deadlines! Keep it up.</p>`;
    if (partnerMissedBody.innerHTML === '') partnerMissedBody.innerHTML = `<p class="small-text">No missed deadlines.</p>`;
    if (myRewardBody && myRewardBody.innerHTML === '') myRewardBody.innerHTML = `<p class="small-text">No rewards yet.</p>`;
    if (partnerRewardBody && partnerRewardBody.innerHTML === '') partnerRewardBody.innerHTML = `<p class="small-text" style="color:#555">No rewards assigned.</p>`;
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

/* --- HIGH-FIDELITY CUSTOM CURSOR --- */
const cursorDot = document.getElementById("cursor-dot");
const cursorRing = document.getElementById("cursor-ring");

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let lastMouseX = mouseX;
let lastMouseY = mouseY;
let ringX = mouseX;
let ringY = mouseY;
let dotScaleX = 1;
let dotScaleY = 1;
let dotRotation = 0;

document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Create Particles
    if (Math.random() > 0.7) {
        createCursorParticle(mouseX, mouseY);
    }
    
    // Velocity & Chromatic Aberration
    const vx = mouseX - lastMouseX;
    const vy = mouseY - lastMouseY;
    const speed = Math.sqrt(vx*vx + vy*vy);
    
    // Velocity Stretch
    if (speed > 1) {
        dotScaleX = 1 + Math.min(speed / 50, 0.8);
        dotScaleY = 1 - Math.min(speed / 100, 0.4);
        dotRotation = Math.atan2(vy, vx) * (180 / Math.PI);
    }

    if (cursorDot) {
        cursorDot.style.left = mouseX + "px";
        cursorDot.style.top = mouseY + "px";
        cursorDot.style.transform = `translate(-50%, -50%) rotate(${dotRotation}deg) scale(${dotScaleX}, ${dotScaleY})`;
        
        // Chromatic Aberration during fast movement
        if (speed > 20) {
            cursorDot.style.filter = `drop-shadow(${vx/5}px 0px 0px rgba(255,0,0,0.5)) drop-shadow(${-vx/5}px 0px 0px rgba(0,255,255,0.5))`;
        } else {
            cursorDot.style.filter = '';
        }
    }
    
    lastMouseX = mouseX;
    lastMouseY = mouseY;

    // Heart Trail Sync Logic (Modified to be more subtle)
    if (window.isFullySynchronized && Math.random() > 0.9) {
        createFloatingSymbol('❤', mouseX, mouseY);
    }
});

const createCursorParticle = (x, y) => {
    const p = document.createElement('div');
    p.className = 'cursor-particle';
    const size = Math.random() * 4 + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
};

const createFloatingSymbol = (char, x, y) => {
    const s = document.createElement('div');
    s.className = 'floating-symbol';
    s.innerText = char;
    s.style.left = (x || Math.random() * window.innerWidth) + 'px';
    s.style.top = (y || window.innerHeight) + 'px';
    s.style.color = `hsl(${Math.random() * 360}, 80%, 60%)`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3000);
};

const renderCursor = () => {
    // Lerp Aura
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    
    if (cursorRing) {
        cursorRing.style.left = ringX + "px";
        cursorRing.style.top = ringY + "px";
    }
    
    requestAnimationFrame(renderCursor);
};
requestAnimationFrame(renderCursor);

// Hover magnetics
document.addEventListener("mouseover", (e) => {
    const isInteractive = e.target.closest('button, a, input, .hud-tab, .task-checkbox, .player-icon, .hud-ctrl-btn, .hud-text-btn, .danger-btn');
    
    if (isInteractive && cursorRing) {
        cursorRing.style.width = '60px';
        cursorRing.style.height = '60px';
        cursorRing.style.backgroundColor = 'rgba(124, 58, 237, 0.2)';
        cursorRing.style.border = '2px solid rgba(124, 58, 237, 0.4)';
    } else if (cursorRing) {
        cursorRing.style.width = '36px';
        cursorRing.style.height = '36px';
        cursorRing.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
        cursorRing.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    }
});

document.addEventListener("mousedown", () => {
    if (cursorRing) {
        cursorRing.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }
});
document.addEventListener("mouseup", () => {
    if (cursorRing) {
        cursorRing.style.transform = 'translate(-50%, -50%) scale(1)';
    }
});

/* --- ULTIMATE CELEBRATION LOGIC --- */
const setupCelebrationHooks = () => {
    window.addEventListener('load', () => { setTimeout(triggerUltimateCelebration, 1500); });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") triggerUltimateCelebration();
    });
};

const triggerUltimateCelebration = () => {
    if (!window.isFullySynchronized) return;

    console.log("TRIGGERING ULTIMATE CELEBRATION!");
    document.body.classList.add('active-celebration');
    
    // 1. Flash
    const flash = document.createElement('div');
    flash.className = 'flash-overlay flash-active';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
    
    // 2. Fanfare
    playSound('fanfare');
    
    // 3. Floating Symbols Grid
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createFloatingSymbol(Math.random() > 0.5 ? '❤' : '✨');
        }, i * 150);
    }
    
    // Reset after some time if needed, or keep it active while synced
    // For now, let's keep it active as requested "whenever synchronization is full"
};

// --- NEW FEATURES LISTENERS ---
const btnAddReward = document.getElementById('btn-add-reward');
if (btnAddReward) {
    btnAddReward.addEventListener('click', () => {
        document.getElementById('modal-reward').style.display = 'flex';
    });
}

const formReward = document.getElementById('form-reward');
if (formReward) {
    formReward.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('r-title').value;
        await assignReward(title);
        document.getElementById('modal-reward').style.display = 'none';
        e.target.reset();
    });
}

const fetchDailyImage = async () => {
    if (!state.currentUser) return;
    
    // 1. Fetch image meant for ME (from partner)
    try {
        const res = await fetch(`${API_BASE}/daily_image/${state.currentUser.id}`);
        if(res.ok) {
            const data = await res.json();
            const pImg = document.getElementById('partner-mystery-img');
            if (pImg) {
                pImg.src = data.image_data;
                pImg.style.display = 'block';
                if (data.is_unlocked) {
                    pImg.style.filter = 'none';
                    document.getElementById('partner-mystery-lock').style.display = 'none';
                } else {
                    pImg.style.filter = 'blur(25px)';
                    document.getElementById('partner-mystery-lock').style.display = 'flex';
                    pImg.dataset.id = data.id;
                }
            }
        }
    } catch (e) { console.log("No daily image for me"); }

    // 2. Fetch image uploaded BY ME (for partner)
    try {
        const res = await fetch(`${API_BASE}/daily_image/uploader/${state.currentUser.id}`);
        if(res.ok) {
            const data = await res.json();
            const myPreview = document.getElementById('my-mystery-preview');
            const myImg = document.getElementById('my-uploaded-img');
            if (myPreview && myImg) {
                myImg.src = data.image_data;
                myPreview.classList.remove('display-none');
            }
        }
    } catch (e) { console.log("No daily image uploaded by me"); }
};

const btnUploadMystery = document.getElementById('btn-upload-mystery');
if (btnUploadMystery) {
    btnUploadMystery.addEventListener('click', async () => {
        const file = document.getElementById('mystery-file').files[0];
        if (!file) return alert("Select an image first!");
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const baseString = e.target.result;
            try {
                const res = await fetch(`${API_BASE}/daily_image/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uploader_id: state.currentUser.id,
                        receiver_id: state.partnerId,
                        image_data: baseString
                    })
                });
                if(!res.ok) throw new Error("Upload failed.");
                alert("Image uploaded for partner!");
                playSound('photo');
                fetchDailyImage(); // Refresh my preview
            } catch(err) {
                alert("Upload failed.");
            }
        };
        reader.readAsDataURL(file);
    });
}

// --- NOTE LOGIC ---
const openNoteModal = (taskId, taskName) => {
    document.getElementById('n-task-id').value = taskId;
    document.getElementById('n-task-name').innerText = taskName;
    document.getElementById('modal-note').style.display = 'flex';
};

const formNote = document.getElementById('form-note');
if (formNote) {
    formNote.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('n-task-id').value;
        const message = document.getElementById('n-message').value;

        try {
            const res = await fetch(`${API_BASE}/deadline/${taskId}/note`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret_message: message })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Error saving note");

            // Update local state
            const task = state.tasks.find(t => String(t.id) === String(taskId));
            if (task) task.secretMessage = message;
            saveTasks();

            document.getElementById('modal-note').style.display = 'none';
            e.target.reset();
            renderDashboard();
            playSound('message');
            alert("Note saved for partner!");

        } catch (err) {
            alert("Error: " + err.message);
        }
    });
}

