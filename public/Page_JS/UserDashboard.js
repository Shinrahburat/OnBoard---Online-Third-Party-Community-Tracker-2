// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

// Check session and redirect if necessary
async function checkSessionAndRedirect() {
    const res = await fetch('/api/session');
    const data = await res.json();

    if (!data.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const role = data.user.role.toLowerCase();

    // Redirect to the correct dashboard if wrong page
    if ((role === 'admin' || role === 'founder') && !window.location.href.includes('AdminDashboard')) {
        window.location.href = '/Html/AdminDashboard.html';
    } else if (role === 'member' && !window.location.href.includes('UserDashboard')) {
        window.location.href = '/Html/UserDashboard.html';
    }

}

checkSessionAndRedirect();


// Logout functionality
document.addEventListener('click', async (e) => {
    if (e.target.id === 'logoutBtn') {
        const res = await fetch('/api/logout', { method: 'POST' });
        const data = await res.json();
        if (data.success) window.location.href = '/Index.html';
    }
});


async function postData(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error('Error posting data:', error);
        return null;
    }
}

// ============================================
// INITIALIZE DASHBOARD
// ============================================

async function initializeDashboard() {
    await loadUserProfile();
    initAnnouncements();
    loadRecentActivity();
    loadAttendanceHistory();
    loadTaskStats();
    loadPendingTasks();
    loadTaskHistory();
    loadWaitingforApproval();
    loadSharedDocuments();
    loadMyDocuments();
    loadFeedbackHistory();
    loadInventoryStats();
    loadInventoryTable();
    loadRequestRecordTable();
    loadCompanyName();
}

//Initialze auto attendance autofill on load
window.addEventListener('load', async () => {
    await initializeDashboard();
    await autoFillAbsentLogs();
});

async function autoFillAbsentLogs() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    const memberId = sessionData.user.id;
    await fetch(`/api/Attendance/autofill/${memberId}`, { method: 'POST' });
}

// ============================================
// ANNOUNCEMENTS FEED
// ============================================

let currentFilter = 'all';
let currentCompanyCode = null;

async function initAnnouncements() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    currentCompanyCode = sessionData.user.CompanyCode;
    loadAnnouncements('all');
}
async function loadAnnouncements(filter = 'all') {
    try {
        const response = await fetch(`/api/Announcements/company/${currentCompanyCode}?filter=${filter}`);
        const result = await response.json();

        if (!result.success) {
            console.error('Failed to load announcements');
            return;
        }

        const announcements = result.data;

        if (announcements.length === 0) {
            document.getElementById('announcementsFeed').innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No announcements in this category</p>
                </div>
            `;
            return;
        }

        const announcementsHTML = announcements.map(announcement => {

            const type = announcement.Announcement_Type;
            const badgeClass = `badge-${type}`;
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
            const author = announcement.author || 'Unknown';
            const initials = author.split(' ').map(n => n[0]).join('');
            
            // Format timestamp
            const createdDate = new Date(announcement.createdAt);
            const now = new Date();
            const diffMs = now - createdDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
        

            return `
                <div class="announcement-post" data-type="${announcement.Announcement_Type}" data-id="${announcement.id}">
                    <div class="post-header">
                        <div class="post-author-avatar">${initials}</div>
                        <div class="post-author-info">
                            <div class="post-author-name">${announcement.author}</div>
                            <div class="post-author-role">${announcement.authorRole}</div>
                        </div>
                        <div class="post-badge ${badgeClass}">${typeLabel}</div>
                    </div>
                    
                    <div class="post-content">
                        <h3 class="post-title">${announcement.title}</h3>
                        <p class="post-text">${announcement.content}</p>
                        ${announcement.imageUrl ? `<img src="${announcement.imageUrl}" alt="${announcement.title}" class="post-image">` : ''}
                    </div>
                    
                    <div class="post-footer">
                        <div class="post-meta">
                            <div class="post-meta-item">
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('announcementsFeed').innerHTML = announcementsHTML;
    } catch (error) {
        console.error('Error loading announcements:', error);
        document.getElementById('announcementsFeed').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Failed to load announcements</p>
            </div>
        `;
    }
}
function filterAnnouncements(type) {
    currentFilter = type;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    const clickedButton = document.querySelector(`.filter-btn[onclick*="${type}"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Reload announcements with filter
    loadAnnouncements(type);
}


// ============================================
// USER PROFILE
// ============================================

async function loadUserProfile() {
    
    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;

    const result = await fetch(`/api/Users/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }

    const userData = resultJson.data;
    // Update sidebar
    const initials = `${userData.FirstName[0]}${userData.LastName[0]}`;
    document.getElementById('sidebarAvatar').textContent = initials;
    document.getElementById('sidebarUserName').textContent = `${userData.FirstName} ${userData.LastName}`;
    document.getElementById('sidebarUserRole').textContent = userData.status + ' Member';

    // Update welcome message
    document.getElementById('welcomeMessage').textContent = `Welcome back, ${userData.FirstName}! 👋`;

    // Update profile tab
    renderProfile(userData);
}

function renderProfile(userData) {
    const initials = `${userData.FirstName[0]}${userData.LastName[0]}`;
    const profileHTML = `
        <div class="profile-header">
            <div class="profile-avatar">${initials}</div>
            <div class="profile-info">
                <h3>${userData.FirstName} ${userData.LastName}</h3>
                <div class="profile-role">${userData.role}</div>
                <div class="profile-status">Status: ${userData.status}</div>
            </div>
        </div>

        <div class="profile-details">
            <div class="detail-row">
                <div class="detail-label">Member ID:</div>
                <div class="detail-value">#${String(userData.id).padStart(3, '0')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value" id="emailVal">${userData.email}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Phone:</div>
                <div class="detail-value" id="phoneVal">${userData.phoneNumber}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Address:</div>
                <div class="detail-value" id="addressVal">${userData.address}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Role:</div>
                <div class="detail-value" id="roleVal">${userData.role}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Password:</div>
                <div class="detail-value" id="passVal">${userData.password}</div>
            </div>
            <input type="hidden" id="firstName" value="${userData.FirstName}">
            <input type="hidden" id="lastName" value="${userData.LastName}">
            <input type="hidden" id="userStatus" value="${userData.status}">
            <input type="hidden" id="notes" value="${userData.notes}">
        </div>

        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
            <button id="editBtn" class="btn btn-primary" onclick="editProfile()">✏️ Edit Profile</button>   
        </div>
    `;
    document.getElementById('profileContent').innerHTML = profileHTML;

    window.currentUserData = userData; // store globally
}

function editProfile() {
    const u = window.currentUserData;

    // Transform fields into inputs
    document.getElementById("emailVal").innerHTML =
        `<input id="emailInput" class="profile-input" value="${u.email}">`;

    document.getElementById("phoneVal").innerHTML =
        `<input id="phoneInput" class="profile-input" value="${u.phoneNumber}">`;

    document.getElementById("addressVal").innerHTML =
        `<input id="addressInput" class="profile-input" value="${u.address}">`;

    document.getElementById("roleVal").innerHTML =
        `<input id="roleInput" class="profile-input" value="${u.role}" readonly>`;

    document.getElementById("passVal").innerHTML =
        `<input id="passInput" type="password" class="profile-input" value="${u.password}">`;

    

    // Change Edit → Save
    const editBtn = document.getElementById("editBtn");
    editBtn.innerText = "💾 Save Changes";
    editBtn.onclick = saveProfileChanges;

    // Add Cancel button if not exists
    if (!document.getElementById("cancelBtn")) {
        const cancelBtn = document.createElement("button");
        cancelBtn.id = "cancelBtn";
        cancelBtn.className = "btn btn-danger";
        cancelBtn.style.marginLeft = "0.5rem";
        cancelBtn.innerText = "❌ Cancel";
        cancelBtn.onclick = cancelEdit;

        editBtn.parentNode.appendChild(cancelBtn);
    }
}

function cancelEdit() {
    // Restore original static values
    const u = window.currentUserData;

    document.getElementById("emailVal").innerText = u.email;
    document.getElementById("phoneVal").innerText = u.phoneNumber;
    document.getElementById("addressVal").innerText = u.address;
    document.getElementById("passVal").innerText = u.password;

    // Reset Edit button
    const editBtn = document.getElementById("editBtn");
    editBtn.innerText = "✏️ Edit Profile";
    editBtn.onclick = editProfile;

    // Remove the Cancel button
    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) cancelBtn.remove();
}


async function saveProfileChanges() {
    const updated = {
        id: currentUserData.id,
        email: document.getElementById("emailInput").value,
        phoneNumber: document.getElementById("phoneInput").value,
        address: document.getElementById("addressInput").value,
        FirstName: document.getElementById("firstName").value,
        LastName: document.getElementById("lastName").value,
        status: document.getElementById("userStatus").value,
        notes: document.getElementById("notes").value,
        role: document.getElementById("roleInput").value
    };

    const password = document.getElementById("passInput").value;

    // 🔧 CHANGE THIS URL TO YOUR API ENDPOINT
    const res = await fetch(`/api/Users/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
    });

    const passUp = await fetch(`/api/Users/updatePass/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    

    const dataPass = await passUp.json();
    if (!dataPass.success) {
        alert("Failed to update password.");
        return;
    }

    const data = await res.json();

    if (!data.success) {
        alert("Failed to update profile.");
        return;
    }

    // Refresh the UI with updated values
    renderProfile({ ...currentUserData, ...updated });
}


// ============================================
// HOME STATS (Now Dashboard Stats)
// ============================================

async function loadDashboardStats() {

    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;

    const result = await fetch(`/api/Users/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    
  
    const stats = {
        attendanceRate: resultJson.attendanceRate || 0,
        tasksCompleted: resultJson.tasksCompleted || 0,
        completionRate: resultJson.taskRate || 0,
        feedback: resultJson.feedback || 0
    };



    const statsHTML = `
        <div class="stat-card">
            <div class="stat-header">   
                <div class="stat-icon green">✓</div>
            </div>
            <div class="stat-value">${stats.attendanceRate.toFixed(2)}%</div>
            <div class="stat-label">Attendance Rate</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">📊</div>
            </div>
            <div class="stat-value">${stats.tasksCompleted}</div>
            <div class="stat-label">Tasks Completed</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon orange">🏆</div>
            </div>
            <div class="stat-value">${stats.completionRate}</div>
            <div class="stat-label">Completion Rating</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">📅</div>
            </div>
            <div class="stat-value">${stats.feedback}</div>
            <div class="stat-label">Feedback Submitted</div>
        </div>
    `;
    document.getElementById('dashboardStats').innerHTML = statsHTML;
}

// ============================================
// RECENT ACTIVITY
// ============================================

async function loadRecentActivity() {
    const container = document.getElementById('recentActivityContainer');
    console.log("loadRecentActivity started"); 

    // Get session to retrieve company code
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    const companyCode = sessionData.user.CompanyCode;

    try {
        // Fetch logs for this company
        const response = await fetch(`/api/Logs/company/${companyCode}`);
        const result = await response.json();
        if (!result.success) {
            container.innerHTML = '<p class="error-message">Failed to load recent activity.</p>';
            return;
        }

        const logs = result.data;

        // Build table HTML
        const html = `
            <div class="data-table-container">
                <div class="table-header">
                    <h3 class="table-title">Recent Activity</h3>
                    <div class="table-actions">
                        <button class="btn btn-secondary" id="refreshRecentActivity">🔄 Refresh</button>
                    </div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Activity</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td>${log.memberid || 'N/A'}</td>
                                <td>${log.Activity || '-'}</td>
                                <td>${log.date ? new Date(log.date).toLocaleDateString() : '-'}</td>
                                <td><span class="status-badge ${log.status_type|| 'status-pending'}">${log.status_type || '-'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        // Add refresh functionality
        document.getElementById('refreshRecentActivity').addEventListener('click', loadRecentActivity);

    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<p class="error-message">Failed to load recent activity.</p>';
    }
}

// ============================================
// ATTENDANCE
// ============================================

async function loadAttendanceStats() {
    
    const res = await fetch('/api/session');
        const sessionData = await res.json();

        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
    
    const id = sessionData.user.id;
    const result = await fetch(`/api/Users/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }


    const stats = {
        totalPresent: resultJson.attendanceCountPresence || 0,
        totalAbsent: resultJson.attendanceCountAbsence || 0,
        totalLate: resultJson.attendanceCountLate || 0,
        attendanceRate: resultJson.attendanceRate || 0
    };

    const statsHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon green">✓</div>
            </div>
            <div class="stat-value">${stats.totalPresent}</div>
            <div class="stat-label">Total Present</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">❌</div>
            </div>
            <div class="stat-value">${stats.totalAbsent}</div>
            <div class="stat-label">Total Absent</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon orange">⏰</div>
            </div>
            <div class="stat-value">${stats.totalLate}</div>
            <div class="stat-label">Late Arrivals</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">📊</div>
            </div>
            <div class="stat-value">${stats.attendanceRate.toFixed(2)}%</div>
            <div class="stat-label">Attendance Rate</div>
        </div>
    `;
    document.getElementById('attendanceStats').innerHTML = statsHTML;
}

async function loadAttendanceHistory() {

    const tableContainer = document.getElementById('attendanceTable');
    
    // Show loading state
    tableContainer.innerHTML = `<div class="loading">Loading attendance records...</div>`;

    try {

        const res = await fetch('/api/session');
        const sessionData = await res.json();

        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }

        const memberId = sessionData.user.id;

        const response = await fetch(`/api/Users/${memberId}`);
        const data = await response.json();
        
        if (!data.success) {
            tableContainer.innerHTML = `<div class="error">Member not found</div>`;
            return;
        }

        const member = data.data;
        const stat = Array.isArray(data.attendancehistory) ? data.attendancehistory : [];

        if (stat.length === 0) {
            tableContainer.innerHTML = `<div class="empty">No attendance records found</div>`;
            return;
        }

        tableContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${stat.map(a => `
                        <tr>
                            <td>${a.date ? new Date(a.date).toLocaleDateString() : "-"}</td>
                            <td>${formatTime(a.timeIn)}</td>
                            <td>
                                <span class="status-badge ${getStatusClass(a.status)}">
                                    ${a.status || "-"}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (error) {
        console.error('Error loading member data:', error);
        tableContainer.innerHTML = `<div class="error">Failed to load attendance records</div>`;
    }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';

  // Extract the time part (ignore date)
  let timePart = timeStr.split('T')[1];      // "13:38:52.716Z"
  
  // Remove milliseconds and Z if present
  timePart = timePart.split('.')[0];         // "13:38:52"
  
  const [hour, min, sec] = timePart.split(':');
  const h = Number(hour);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return `${hour12}:${min}:${sec} ${suffix}`;
}

// Helper to get badge class
function getStatusClass(status) {
    switch (status) {
        case "Present": return "status-active";
        case "Late": return "status-late";
        case "Absent": return "status-absent";
        default: return "status-inactive";
    }
}


async function clockIn() {
    // 1️⃣ Get session info
    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const employeeId = sessionData.user.id;
    const messageDiv = document.getElementById('message');
    const clockInBtn = document.getElementById('clockInBtn');

    try {
        // 2️⃣ Call backend API to clock in
        const response = await fetch('/api/Attendance/clockin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId })
        });

        const data = await response.json();

        // 3️⃣ Show result and disable button if successful
        if (response.ok) {
            messageDiv.innerText = data.message;
            clockInBtn.disabled = true;
        } else {
            messageDiv.innerText = `Error: ${data.message}`;
        }

    } catch (err) {
        console.error(err);
        messageDiv.innerText = 'Something went wrong. Please try again.';
    }
}

// Attach function to button
document.getElementById('clockInBtn').addEventListener('click', clockIn);


// ============================================
// TASKS
// ============================================

async function loadTaskStats() {
    
    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    
    const id = sessionData.user.id;
    const result = await fetch(`/api/Users/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }

    const rate = await fetch(`/api/user_performance/${id}`);
    const rateJson = await rate.json();
    if (!rateJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    console.log(rateJson.totalTask)
    const stats = {
        tasksCompleted: resultJson.taskCompleted || 0,
        completionRate: resultJson.taskrate || 0,
        positiveOutput: rateJson.outputRate.averageRating || 0,
        totalTask: rateJson.totalTask[""] || 0
    };

    const statsHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">📊</div>
            </div>
            <div class="stat-value">${stats.tasksCompleted}</div>
            <div class="stat-label">Tasks Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon green">⭐</div>
            </div>
            <div class="stat-value">${stats.completionRate.toFixed(2)}%</div>
            <div class="stat-label">Completion Percentage</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon orange">🏆</div>
            </div>
            <div class="stat-value">${stats.positiveOutput.toFixed(2)}/5</div>
            <div class="stat-label">Output Quality Rating</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">⏰</div>
            </div>
            <div class="stat-value">${stats.totalTask}</div>
            <div class="stat-label">Total Tasks</div>
        </div>
    `;
    document.getElementById('taskStats').innerHTML = statsHTML;
}

async function loadPendingTasks() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;
    const result = await fetch(`/api/Tasks/member/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    console.log(resultJson.pending);
    const tasks = resultJson.pending

    const tableHTML =  `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Date Posted</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(review => `
                    <tr>
                        <td>${review.Title}</td>
                        <td>${review.DatePosted ? new Date(review.DatePosted).toLocaleDateString() : '-'}</td>
                        <td>${review.Deadline? new Date(review.Deadline).toLocaleDateString() : '-'}</td>
                        <td><span class="status-badge ${review.status || 'status-pending'}">${review.status || '-'}</span></td>
                        <td>
                            <div class="action-buttons">
                               <button class="action-btn btn" title="View" onclick="openDoTaskModal(${review.id || review.Id})">👁️</button>
                            </div>
                            
                        </td>   
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('taskTable').innerHTML = tableHTML;
}

async function openDoTaskModal(taskId) {

    const result = await fetch(`/api/Tasks/${taskId}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    console.log(resultJson.data);
    const task = resultJson.data[0];  // Get the first item from the array
    
    const modalHTML = `
        <div class="modal-overlay active" id="DoTaskModal">
            <div class="modal-container">
                
                <div class="modal-header">
                    <h2>Upload Document</h2>
                    <button class="modal-close" id="closeUploadTaskModalBtn">×</button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label for="taskTitle">Task Title</label>
                        <input type="text" id="taskTitle" value="${task.Title}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskInstruction">Task Instruction</label>
                        <input type="textarea" id="taskInstruction" value="${task.Instructions}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskDatePosted">Task Posted on</label>
                        <input type="text" id="taskDatePosted" value="${task.DatePosted? new Date(task.DatePosted).toLocaleDateString() : '-'}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskDeadline">Task Deadline</label>
                        <input type="text" id="taskDeadline" value="${task.Deadline? new Date(task.Deadline).toLocaleDateString() : '-'}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskDocType">Document Type</label>
                        <input type="text" id="taskDocType" value="Report" readonly>
                    </div>

                    
                    <div class="form-group">
                        <label for="taskDocName">Document Name</label>
                        <input type="text" id="taskDocName" placeholder="OutPut-TaskTitle" value="">
                    </div>

                    <div class="form-group">
                        <label for="taskDocAccess">Access Type</label>
                        <select id="taskDocAccess" name="taskDocAccess" required>
                                <option value="">Select Access</option>
                                <option value="Shared">Shared</option>
                                <option value="Personal">Personal</option>
                            </select>
                    </div>

                    <div class="form-group">
                        <label for="docFile">Upload File</label>
                        <input type="file" id="docFile">
                    </div>

                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" id="cancelDoTaskBtn">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="uploadTask(${task.id})">Upload</button>
                </div>

            </div>
        </div>
    `;

    // Remove existing modal to avoid duplicates
    const existing = document.getElementById("DoTaskModal");
    if (existing) existing.remove();

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden"; // Lock background

    // Event Listeners
    document.getElementById("closeUploadTaskModalBtn").addEventListener("click", closeUploadTaskDocumentModal);
    document.getElementById("cancelDoTaskBtn").addEventListener("click", closeUploadTaskDocumentModal);


    // Close on overlay click
    document.getElementById("DoTaskModal").addEventListener("click", e => {
        if (e.target.classList.contains("modal-overlay")) closeUploadTaskDocumentModal();
    });
}
function closeUploadTaskDocumentModal() {
    const modal = document.getElementById("DoTaskModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
        }, 300);
    }
}
async function uploadTask(taskId) {
    const taskDocAccess = document.getElementById("taskDocAccess").value;
    const docName = document.getElementById("taskDocName").value.trim();
    const docType = document.getElementById("taskDocType").value;
    const file = document.getElementById("docFile").files[0];

    if (!docName || !file) {
        alert("Please fill all fields and upload a file.");
        return;
    }

    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();
    const companyCode = sessionData.user.CompanyCode;
    const owner = sessionData.user.id;

    const formData = new FormData();
    formData.append("accessType", taskDocAccess);
    formData.append("taskId", taskId);
    formData.append("owner", owner);
    formData.append("name", docName);
    formData.append("type", docType);
    formData.append("DocumentFile", file);
    formData.append("companyCode", companyCode);

    const logData = {
        title: document.getElementById("taskTitle").value,
        status: "Pending",
        userId: owner,
        CompanyCode: companyCode
    } 

    try {
        const res = await fetch('/api/Documents/task/upload', {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        console.log(data.documentId)

        const log = await fetch('/api/Logs/task/update',{
            method: "POST",
            body: logData
        });

        if (data.success) {
            alert("Document uploaded successfully!");

            closeUploadTaskDocumentModal();
            loadPendingTasks(); // Refresh table
            loadWaitingforApproval(); // Refresh table
        } else {
            alert("Upload failed: " + (data.error || ""));
        }

    } catch (err) {
        console.error("Upload error:", err);
        alert("Upload failed");
    }
}
async function loadWaitingforApproval() {

    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;
    const result = await fetch(`/api/Tasks/member/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    console.log(resultJson.forApproval);
    const tasks = resultJson.forApproval

    const tableHTML =  `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Date Posted</th>
                    <th>Deadline</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(review => `
                    <tr>
                        <td>${review.Title}</td>
                        <td>${review.DatePosted ? new Date(review.DatePosted).toLocaleDateString() : '-'}</td>
                        <td>${review.Deadline? new Date(review.Deadline).toLocaleDateString() : '-'}</td>
                        <td><span class="status-badge ${review.status || 'status-pending'}">${review.status || '-'}</span></td> 
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('forApprovalTaskTable').innerHTML = tableHTML;
}

async function loadTaskHistory() {
     const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;
    const result = await fetch(`/api/Tasks/member/${id}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }
    console.log(resultJson.taskHistory);
    const tasks = resultJson.taskHistory
    

    const tableHTML =  `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Date Posted</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tasks.map(review => `
                    <tr>
                        <td>${review.Title}</td>
                        <td>${review.DatePosted ? new Date(review.DatePosted).toLocaleDateString() : '-'}</td>
                        <td>${review.Deadline? new Date(review.Deadline).toLocaleDateString() : '-'}</td>
                        <td><span class="status-badge ${review.status || 'status-pending'}">${review.status || '-'}</span></td> 
                        <td>
                        <div class="action-buttons">
                               <button class="action-btn btn" title="View" onclick="openCheckReply(${review.id || review.Id})">👁️</button>
                        </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('taskHistoryTable').innerHTML = tableHTML;
}

async function openCheckReply(taskId) {

    const result = await fetch(`/api/user_performance/task/${taskId}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }

    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    const id = sessionData.user.id;

    const result2 = await fetch(`/api/Tasks/member/${id}`);
    const resultJson2= await result2.json();
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }

    console.log(resultJson.data);
    const task = resultJson.data[0];  // Get the first item from the array
    const task2 = resultJson2.data[0];  // Get the first item from the array
    const modalHTML = `
        <div class="modal-overlay active" id="CheckReplyModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Task Reply</h2>
                    <button class="modal-close" id="closeCheckReplyModalBtn">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="taskTitle">Task Title</label>
                        <input type="text" id="taskTitle" value="${task2.Title}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskRating">Task Rating</label>
                        <input type="text" id="taskRating" value="${task.rating}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskReply">Task Reply</label>
                        <input type="textarea" id="taskReply" value="${task.remarks || 'No reply submitted.'}"readonly>   
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" id="closeCheckReplyBtn">Close</button>
                </div>
            </div>
        </div>
    `;
    // Remove existing modal to avoid duplicates
    const existing = document.getElementById("CheckReplyModal");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden"; // Lock background
    // Event Listeners
    document.getElementById("closeCheckReplyModalBtn").addEventListener("click", closeCheckReplyModal);
    document.getElementById("closeCheckReplyBtn").addEventListener("click", closeCheckReplyModal);
    // Close on overlay click
    document.getElementById("CheckReplyModal").addEventListener("click", e => {
        if (e.target.classList.contains("modal-overlay")) closeCheckReplyModal();
    }
    );
}

function closeCheckReplyModal() {
    const modal = document.getElementById("CheckReplyModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
        }, 300);
    }
}

// ============================================
// DOCUMENTS
// ============================================

async function loadMyDocuments() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;

    const result = await fetch(`/api/Documents/${id}`);
    const myDocumentsJson = await result.json();
    if (!myDocumentsJson.success) {
        console.error('Failed to load user documents');
        return;
    }

    const myDocuments = myDocumentsJson.documents;
    
    console.log(myDocuments)
    const tableHTML = myDocuments.length > 0 ? `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Upload Date</th>
                    <th>Access</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${myDocuments.map(doc => `
                    <tr>
                        <td>${doc.name}</td>
                        <td>${doc.type}</td>
                        <td>${doc.uploadDate ? new Date(doc.uploadDate ).toLocaleDateString() : '-'}</td>
                        <td>${doc.Access}</td>
                        <td>
                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem;" onclick="downloadDocument(${doc.id})">⬇️ Download</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<div class="empty-state"><div class="empty-state-icon">📄</div><p>No documents uploaded</p></div>';

    document.getElementById('myDocumentsTable').innerHTML = tableHTML;
}

async function loadSharedDocuments() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    const companyCode = sessionData.user.CompanyCode;
    const result = await fetch(`/api/Documents/company/${companyCode}`);
    const documentsJson = await result.json();
    if (!documentsJson.success) {
        console.error('Failed to load shared documents');
        return;
    }
    const documents = documentsJson.sharedDocuments;

    const tableHTML = documents.length > 0 ? `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Document Name</th>
                    <th>Shared By</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${documents.map(doc => `
                    <tr>
                        <td>${doc.name}</td>
                        <td>${doc.owner}</td>
                        <td>${doc.type}</td>
                        <td>${doc.uploadDate ? new Date(doc.uploadDate  ).toLocaleDateString() : '-'}</td>
                        <td>
                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem;" onclick="downloadDocument(${doc.id})">⬇️ Download</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<div class="empty-state"><div class="empty-state-icon">📄</div><p>No shared documents</p></div>';

    document.getElementById('sharedDocumentsTable').innerHTML = tableHTML;
}

function downloadDocument(id) {
    fetch(`/api/Documents/download/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("Download failed");
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        })
        .catch(err => {
            console.error("Download error:", err);
            alert("Failed to download document");
        });
}
// ============================================
// FEEDBACK
// ============================================

async function loadFeedbackHistory() {
    
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const id = sessionData.user.id;
    const result = await fetch(`/api/Feedback/member/${id}`);
    const resultJson = await result.json();
    console.log(resultJson);
    if (!resultJson.success) {
        console.error('Failed to load user profile');
        return;
    }

    const feedback = resultJson.data;

    const tableHTML = feedback.length > 0 ? `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Response</th>
                </tr>
            </thead>
            <tbody>
                ${feedback.map(item => `
                    <tr>
                        <td>${item.type}</td>
                        <td>${item.subject}</td>
                        <td>${item.dateSubmitted? new Date(item.dateSubmitted).toLocaleDateString() : '-'}</td>
                        <td><span class="status-badge ${item.status}">${item.status}</span></td>
                        <td>
                            <button class="btn btn-secondary" onclick="openViewFeedback(${item.id})">👁️ View</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : `<div class="empty-state"><div class="empty-state-icon">💬</div><p>No feedback submitted</p></div>`;


    document.getElementById('feedbackHistoryTable').innerHTML = tableHTML;
}

async function openViewFeedback(feedbackId) {

    const feedbackResult = await fetch(`/api/Feedback/${feedbackId}`);
    const feedbackJson = await feedbackResult.json();
    if (!feedbackJson.success) {
        console.error('Failed to load feedback');
        return;
    }
    
    const feedback = feedbackJson.data;  


    const modalHTML = `
        <div class="modal-overlay active" id="viewFeedback">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Feedback Review</h2>
                    <button class="modal-close" id="closeViewFeedbackModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="feedbackSubject">Feedback Subject</label>
                        <input type="text" id="feedbackSubject" value="${feedback.subject}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="feedbackStatus">Feedback Status</label>
                        <input type="text" id="feedbackStatus" value="${feedback.status}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="feedbackReply">Feedback Reply</label>
                        <input type="text" id="feedbackReply" value="${feedback.reply || 'No Reply Yet'}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="feedbackSubmitDate">Submitted On</label>
                        <input type="text" id="feedbackSubmitDate" value="${feedback.dateSubmitted? new Date(feedback.dateSubmitted).toLocaleDateString() : '-'}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="feedbackRepliedDate">Replied On</label>
                        <input type="text" id="feedbackRepliedDate" value="${feedback.dateResponded || 'No Reply Yet'}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="feedbackby">Feedback Sender</label>
                        <input type="text" id="feedbackby" value="${feedback.feedbacker}"readonly>
                    </div>

                    <div class="form-group">
                        <label for="taskReply">Message Content</label>
                        <input type="textarea" id="taskReply" value="${feedback.content || 'No reply submitted.'}"readonly>   
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" id="closeViewFeedback">Close</button>
                </div>
            </div>
        </div>
    `;
    // Remove existing modal to avoid duplicates
    const existing = document.getElementById("viewFeedback");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden"; // Lock background
    // Event Listeners
    document.getElementById("closeViewFeedbackModal").addEventListener("click", closeViewFeedback);
    document.getElementById("closeViewFeedback").addEventListener("click", closeViewFeedback);
    // Close on overlay click
    document.getElementById("viewFeedback").addEventListener("click", e => {
        if (e.target.classList.contains("modal-overlay")) closeCheckReplyModal();
    }
    );
}

function closeViewFeedback() {
    const modal = document.getElementById("viewFeedback");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
        }, 300);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("feedbackForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Disable button while submitting
        const submitBtn = form.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        try {
            // Get session (to get user ID)
            const sessionRes = await fetch('/api/session');
            const sessionData = await sessionRes.json();

            if (!sessionData.loggedIn) {
                alert("Session expired. Please log in again.");
                window.location.href = "/Index.html";
                return;
            }

            const userId = sessionData.user.id;
            const CompanyCode = sessionData.user.CompanyCode;

            // Collect form values
            const payload = {
                type: document.getElementById("feedbackType").value,
                subject: document.getElementById("subject").value,
                message: document.getElementById("messageContent").value,
                feedbackBy: userId,
                CompanyCode: CompanyCode
            };

            const logData = {
                status: "Pending",
                subject: document.getElementById("subject").value,
                userId: userId,
                CompanyCode: CompanyCode
            }


            // Submit to backend
            const res = await fetch('/api/Feedback', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const log = await fetch('/api/Logs/feedback', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logData)
            });

            const result = await res.json();
            const logResult = await log.json();
            console.log("Feedback API response:", result);

            if (!result.success) {
                alert(result.message || "Failed to submit feedback.");
            } else {
                alert("Your feedback has been submitted successfully!");
                loadFeedbackHistory(); // Refresh feedback history
                // Clear form
                form.reset();
            }

        } catch (err) {
            console.error("Submit feedback error:", err);
            alert("Something went wrong. Please try again.");
        }

        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = "📤 Submit Feedback";
    });
});

// ============================================
// SETTINGS
// ============================================

async function loadCompanyName(){
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    
    companyCode = sessionData.user.CompanyCode;

    const result = await fetch(`/api/Organization/${companyCode}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load organization profile');
        return;
    }
    const settings = resultJson.data;
     document.getElementById('nameSaCompany').textContent = settings.name;

}


async function loadSettings() {
    
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    
    companyCode = sessionData.user.CompanyCode;

    const result = await fetch(`/api/Organization/${companyCode}`);
    const resultJson = await result.json();
    if (!resultJson.success) {
        console.error('Failed to load organization profile');
        return;
    }
    const settings = resultJson.data;

    const settingsHTML = `
        <h3 class="section-title">Company Information</h3>
        
        <div style="margin-bottom: 2rem;">
            <h4 style="margin-bottom: 1rem; color: #667eea; font-size: 1.1rem;">Personal Information</h4>
            <div style="display: grid; gap: 1.5rem;">
                <div class="form-group">
                    <label for="fullName">Full Name</label>
                    <input type="text" id="fullName" value="${settings.name}" readonly>
                </div>
                <div class="form-group">
                    <label for="settingsEmail">Company Contact</label>
                    <input type="email" id="settingsEmail" value="${settings.phone}" readonly>
                </div>
                <div class="form-group">
                    <label for="settingsPhone">Founder</label>
                    <input type="tel" id="settingsPhone" value="${settings.CreatedBy}" readonly>
                </div>
                <div class="form-group">
                    <label for="settingsAddress">Address</label>
                    <input type="text" id="settingsAddress" value="${settings.address}" readonly>
                </div>
            </div>
        </div>
        <div style="display: flex; gap: 1rem;">
            <button id="logoutBtn" class="btn btn-primary">Logout</button>
        </div>
    `;
    document.getElementById('settingsForm').innerHTML = settingsHTML;
   
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================
let fullInventoryList = [];   // all data from DB
let filteredInventoryList = []; // filtered list to display

// =================== Inventory Modal ===================
async function loadInventoryStats() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Inventory/company/${companyCode}`);
        const data = await res.json();

        console.log('Inventory Stats:', data);
        if (!data.success) throw new Error('Failed to load inventory stats');

        // Initialize counts
        const totalItems = data.itemCount;
        const inStock = data.itemInStock || 0;
        const lowStock = data.itemLowOnStock || 0;
        const outStock = data.itemOutOfStock || 0;

        // Update HTML elements
        document.getElementById('itemCount').textContent = totalItems;
        document.getElementById('itemInStock').textContent = inStock;
        document.getElementById('itemLowOnStock').textContent = lowStock;
        document.getElementById('itemOutStock').textContent = outStock;

    } catch (error) {
        console.error('Error loading inventory stats:', error);
        // Optionally display 0 if API fails
        document.getElementById('itemCount').textContent = 0;
        document.getElementById('itemInStock').textContent = 0;
        document.getElementById('itemLowOnStock').textContent = 0;
        document.getElementById('itemOutStock').textContent = 0;
    }
}

function openInventoryRequestModal(inventory = null) {
    const modalHTML = `
        <div class="modal-overlay active" id="inventoryRequestModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Request Inventory Item Usage</h2>
                    <button class="modal-close" id="closeRequestBtn">×</button>
                </div>

                <div class="modal-body">

                    ${inventory ? `
                    <div class="form-group">
                        <label>Item Code</label>
                        <input type="text" id="requestItemCode" value="${inventory.id}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Item Name</label>
                        <input type="text" id="requestItemName" value="${inventory.name}" readonly>
                    </div>
                    
                    <div class="form-group">
                        <label>Current Quantity</label>
                        <input type="number" value="${inventory.quantity}" readonly>
                    </div>
                    ` : `
                    <div class="form-group">
                            <label for="requestItemName">Item Name</label>
                            <select id="requestItemName" name="requestItemName" required>
                                <option value="">Select Item</option>
                            </select>
                    </div>
                    `}

                    <div class="form-group">
                        <label>Requested Quantity</label>
                        <input type="number" id="requestQuantity" placeholder="Enter quantity" min="1">
                    </div>
                    <div class="form-group">
                        <label>Reason for Request</label>
                        <textarea id="requestReason" rows="3" placeholder="Explain why this item is needed..."></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" id="cancelRequestBtn">Cancel</button>
                    <button class="modal-btn modal-btn-primary" id="submitRequestBtn">Submit Request</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById("inventoryRequestModal");
    if (existingModal) existingModal.remove();

    // Add modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Prevent scroll
    document.body.style.overflow = 'hidden';

    // Only load items when dropdown is present (new request)
    const dropdown = document.getElementById('requestItemName');
    if (!inventory && dropdown && dropdown.tagName === "SELECT") {
        loadItemsforRequest();
    }

    // Event listeners
    document.getElementById('closeRequestBtn').addEventListener('click', closeInventoryRequestModal);
    document.getElementById('cancelRequestBtn').addEventListener('click', closeInventoryRequestModal);

    document.getElementById('submitRequestBtn').addEventListener('click', () => 
        submitInventoryRequest(inventory ? inventory.id : null)
    );

    // Close on overlay click
    document.getElementById('inventoryRequestModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeInventoryRequestModal();
    });
}
async function loadItemsforRequest() {
    try {
        // Get session to retrieve company code
        const respo = await fetch('/api/session');
        const sessionData = await respo.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }

        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Inventory/company/${companyCode}`);
        const data = await res.json();


        const select = document.getElementById('requestItemName');

        if (!select) return;

        // Clear dropdown options
        select.innerHTML = '<option value="">Select Item</option>';

        if (data.success) {
            // Load only the item dropdown — no auto-fill
            data.data.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load items for request', error);
    }
}
function closeInventoryRequestModal() {
    const modal = document.getElementById('inventoryRequestModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

async function submitInventoryRequest(passedItemId = null) {
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();

    const dropdown = document.getElementById('requestItemName');
    const itemId = passedItemId ? passedItemId : (dropdown ? dropdown.value : null);

    const requestedQuantity = parseInt(document.getElementById('requestQuantity').value);
    const reason = document.getElementById('requestReason').value;

    // Send EXACT field names expected by backend
    const requestData = {
        itemId: itemId,
        quantity: requestedQuantity,   // ✔ correct name
        reason: reason,                // ✔ matches backend
        status: "Pending"
    };

    const logData = {
        status: "Pending",
        CompanyCode: sessionData.user.CompanyCode,
        userId: sessionData.user.id,
        itemId: itemId
    }

    

    // Validation
    if (!itemId) return alert("Please select an item.");
    if (!requestedQuantity || requestedQuantity < 1) return alert("Enter valid quantity.");
    if (!reason.trim()) return alert("Please provide a reason.");

    try {
        const res = await fetch('/api/Item_Requests', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        

        const log = await fetch("/api/Logs/item_request", {
        method: 'POST',
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(logData)
        });

        const result = await res.json();

        if (result.success) {
            alert("Inventory request submitted successfully!");
            closeInventoryRequestModal();
            loadInventoryTable();
        } else {
            alert(result.error || "Failed to submit request.");
        }

    } catch (error) {
        console.error("Error submitting request:", error);
        alert("Error submitting inventory request.");
    }
}



// =================== Inventory Table ===================
async function loadInventoryTable() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Inventory/company/${companyCode}`);
        const result = await res.json();

        const container = document.querySelector('#inventory .data-table-container tbody');
        if (!container) return;

        if (!result.success || result.data.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="error-message">No inventory records found.</td>
                </tr>`;
            return;
        }

        // Store full list in memory
        fullInventoryList = result.data;
        filteredInventoryList = fullInventoryList;

        // Render table
        renderInventoryTable(filteredInventoryList);

    } catch (error) {
        console.error("Error loading inventory:", error);
    }
}

function renderInventoryTable(list) {
    const container = document.querySelector('#inventory .data-table-container tbody');
    if (!container) return;

    container.innerHTML = list.map(item => {
        const encoded = encodeURIComponent(JSON.stringify(item));
        return `
            <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.quantity}</td>
                <td><span class="status-badge ${
                    item.status === "In Stock" ? "status-present" :
                    item.status === "Low on Stock" ? "status-late" :
                    "status-absent"
                }">${item.status}</span></td>
            </tr>
        `;
    }).join('');
}

function searchInventory(keyword) {
    keyword = keyword.toLowerCase();

    filteredInventoryList = fullInventoryList.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        item.id.toString().includes(keyword)
    );

    renderInventoryTable(filteredInventoryList);
}

function filterInventory(status) {
    if (status === "All") {
        filteredInventoryList = fullInventoryList;
    } else {
        filteredInventoryList = fullInventoryList.filter(item => item.status === status);
    }

    renderInventoryTable(filteredInventoryList);
}

    document.getElementById('inventorySearch').addEventListener('input', (e) => {
        searchInventory(e.target.value);
    });

// =================== Request Inventory Button ===================
document.querySelector('#inventory .table-actions .btn-primary')?.addEventListener('click', () => openInventoryRequestModal());

async function loadRequestRecordTable() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const userId = sessionData.user.id;

        const res = await fetch(`/api/Item_Requests/${userId}`);
        const result = await res.json();

        const container = document.getElementById('requestTableBody');
        if (!container) return;

        if (!result.success || result.data.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="error-message">No request records found.</td>
                </tr>`;
            return;
        }

        

        // Render table
        renderRequestTable(result.data);

    } catch (error) {
        console.error("Error loading inventory:", error);
    }
}

function renderRequestTable(list) {
    const container = document.getElementById('requestTableBody');
    if (!container) return;

    container.innerHTML = list.map(item => {
        const encoded = encodeURIComponent(JSON.stringify(item));
        return `
            <tr>
                <td>${item.id}</td>
                <td>${item.itemName}</td>
                <td>${item.requestQuantity}</td>
                <td><span class="status-badge ${
                    item.status === "Approved" ? "status-present" :
                    item.status === "Pending" ? "status-late" :
                    item.status === "Rejected" ?"status-absent":
                    "status-inactive"
                }">${item.status}</span></td>
                <td>
                     <button class="btn btn-secondary" onclick="openRequestRecieptModal(${item.id})">👁️ View</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openRequestRecieptModal(requestId) {
    const result = await fetch(`/api/Item_Requests/getRequest/${requestId}`);
    const json = await result.json();

    if (!json.success) {
        console.error("Failed to load request receipt");
        return;
    }

    const req = json.data;
    
    // Determine status class
    let statusClass = 'pending';
    if (req.status.toLowerCase() === 'approved') {
        statusClass = 'approved';
    } else if (req.status.toLowerCase() === 'rejected') {
        statusClass = 'rejected';
    }
    
    // Get current date
    const today = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const modalHTML = `
        

        <div class="modal-overlay active" id="viewRequestReceipt">
            <div class="receipt-container">
                <button class="receipt-close" id="closeRequestReceiptModal">×</button>
                
                <div class="receipt-header">
                    <h2>REQUEST RECEIPT</h2>
                    <div class="company-info">Inventory Management System</div>
                    <div class="receipt-date">Date: ${today}</div>
                </div>

                <div class="receipt-body">
                    <div class="receipt-row">
                        <span class="receipt-label">Item Name</span>
                        <span class="receipt-value">${req.itemName}</span>
                    </div>

                    <div class="receipt-row">
                        <span class="receipt-label">Quantity</span>
                        <span class="receipt-value">${req.requestQuantity}</span>
                    </div>

                    <div class="receipt-row">
                        <span class="receipt-label">Status</span>
                        <span class="receipt-value">
                            <span class="receipt-status ${statusClass}">${req.status}</span>
                        </span>
                    </div>

                    <div class="receipt-row">
                        <span class="receipt-label">Requested By</span>
                        <span class="receipt-value">${req.requestedBy || 'Unknown'}</span>
                    </div>

                    <div class="receipt-reason">
                        <div class="receipt-reason-label">Reason</div>
                        <div>${req.requestReason || "No reason provided"}</div>
                    </div>
                </div>

                <div class="receipt-footer">
                    <div class="receipt-footer-text">Thank you for your request. Show receipt to HR to claim item. Disregard if request REJECTED</div>
                    <button class="receipt-btn" id="closeRequestReceipt">CLOSE</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal to avoid duplicates
    const existing = document.getElementById("viewRequestReceipt");
    if (existing) existing.remove();

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden"; 

    // event listeners
    document.getElementById("closeRequestReceiptModal").addEventListener("click", closeRequestReceipt);
    document.getElementById("closeRequestReceipt").addEventListener("click", closeRequestReceipt);

    // Close when clicking overlay
    document.getElementById("viewRequestReceipt").addEventListener("click", e => {
        if (e.target.classList.contains("modal-overlay")) closeRequestReceipt();
    });
}

function closeRequestReceipt() {
    const modal = document.getElementById("viewRequestReceipt");
    if (modal) {
        modal.remove();
        document.body.style.overflow = "";
    }
}


// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    
    const titles = {
        'home': 'Home',
        'dashboard': 'Dashboard',
        'profile': 'My Profile',
        'attendance': 'My Attendance',
        'task': 'Task',
        'documents': 'Documents',
        'feedback': 'Feedback',
        'settings': 'Settings',
        'inventory': 'Inventory'
    };
    
    document.getElementById('pageTitle').textContent = titles[tabName];
    
    // Load tab-specific data
    if (tabName === 'dashboard') {
        loadDashboardStats();
        loadRecentActivity();
    } else if (tabName === 'attendance') {
        loadAttendanceStats();
        loadAttendanceHistory();
    } else if (tabName === 'performance') {
        loadPerformanceStats();
        loadPerformanceReviews();
        loadAchievements();
    } else if (tabName === 'documents') {
        loadMyDocuments();
        loadSharedDocuments();
    } else if (tabName === 'feedback') {
        loadFeedbackHistory();
    } else if (tabName === 'settings') {
        loadSettings();
    }
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
}


// ============================================
// MOBILE SIDEBAR HANDLING
// ============================================

document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (window.innerWidth <= 768 && 
        !sidebar.contains(event.target) && 
        !menuToggle.contains(event.target) &&
        sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
    }
});

window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('mobile-open');
    }
});

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

window.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});
