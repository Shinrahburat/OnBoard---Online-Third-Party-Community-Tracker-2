// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

// Check session and redirect if not logged in or wrong dashboard
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

    // Display user info
    document.getElementById('userName').innerText = `Welcome, ${data.user.FirstName}`;
    document.getElementById('userAvatar').innerText = data.user.FirstName.split(' ').map(n => n[0]).join('');
}

checkSessionAndRedirect();

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
        window.location.href = '/Index.html';
    }
});

// Example: get companyCode from session
async function initMemberList() {
    const res = await fetch('/api/session');
    const sessionData = await res.json();

    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }

    const companyCode = sessionData.user.CompanyCode;
    loadMemberList(companyCode);
}

initMemberList();


window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page was restored from bfcache
        window.location.reload(); // Force full reload
    }
});
// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    // For mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked nav item
    event.currentTarget.classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Update page title
    const titles = {
        'home': 'Home',
        'overview': 'Dashboard',
        'members': 'Member Management',
        'tasks': 'Task Management',
        'attendance': 'Attendance Records',
        'performance': 'Performance Tracking',
        'inventory': 'Inventory Management',
        'documents': 'Document Management',
        'feedback': 'Complaints & Feedback',
        'settings': 'Organization Settings'
    };
    
    document.getElementById('pageTitle').textContent = titles[tabName];
    
    // Close mobile sidebar after selection
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
    }
}

// Close sidebar when clicking outside on mobile
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

// Handle responsive sidebar
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('mobile-open');
    }
});


// Announce page load
async function initializeDashboard() {
    await initAnnouncements();
    loadDashboardStats();
    loadRecentActivity();
    loadTaskList();
    loadAttendanceHistory();
    loadInventoryTable();
    loadInventoryStats();
    loadDocuments();
    loadFeedback();
    loadProfile();
    loadInventoryApprovalTable();
    loadTaskListCompleted();

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

// Initialize announcements when page loads
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
                <div class="announcement-post" data-type="${announcement.type}" data-id="${announcement.id}">
                    <div class="post-header">
                        <div class="post-author-avatar">${initials}</div>
                        <div class="post-author-info">
                            <div class="post-author-name">${announcement.author}</div>
                            <div class="post-author-role">${announcement.authorRole}</div>
                        </div>
                        <div class="post-badge ${badgeClass}">${typeLabel}</div>
                        <button class="delete-announcement-btn" onclick="deleteAnnouncement(${announcement.id})" title="Delete">🗑️</button>
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
    event.currentTarget.classList.add('active');
    
    // Reload announcements with filter
    loadAnnouncements(type);
}


function openNewAnnouncementModal() {
    const modalHTML = `
        <div id="newAnnouncementModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New Announcement</h2>
                    <button class="modal-close" onclick="closeNewAnnouncementModal()">&times;</button>
                </div>
                
                <form id="newAnnouncementForm" onsubmit="saveNewAnnouncement(event)">
                    <div class="form-group">
                        <label for="announcementType">Type *</label>
                        <select id="announcementType" required>
                            <option value="">Select type...</option>
                            <option value="Announcement">Announcement</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Events">Event</option>
                            <option value="Reports">Report</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="announcementTitle">Title *</label>
                        <input type="text" id="announcementTitle" placeholder="Enter announcement title" required>
                    </div>

                    <div class="form-group">
                        <label for="announcementContent">Content *</label>
                        <textarea id="announcementContent" rows="6" placeholder="Enter announcement content" required></textarea>
                    </div>


                    <div class="modal-footer">
                        <button type="button" class="btn-cancel" onclick="closeNewAnnouncementModal()">Cancel</button>
                        <button type="submit" class="btn-save">Create Announcement</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('newAnnouncementModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    document.getElementById('newAnnouncementModal').addEventListener('click', (e) => {
        if (e.target.id === 'newAnnouncementModal') {
            closeNewAnnouncementModal();
        }
    });
}

function closeNewAnnouncementModal() {
    const modal = document.getElementById('newAnnouncementModal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}

async function saveNewAnnouncement(event) {
    event.preventDefault();
    
    const type = document.getElementById('announcementType').value;
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();

    if (!title || !content) {
        alert('Please fill in all required fields');
        return;
    }

    // Get session data for CompanyCode
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();

    if (!sessionData.loggedIn) {
        alert('Session expired. Please log in again.');
        window.location.href = '/Index.html';
        return;
    }

    const newAnnouncement = {
        type: type,
        title: title,
        content: content,
        author: sessionData.user.FirstName,
        authorRole: sessionData.user.role,
        CompanyCode: sessionData.user.CompanyCode
    };

    const logData = {
        Announcement_Type: type,
        title: title,
        CompanyCode: sessionData.user.CompanyCode
    }

    try {
        const response = await fetch('/api/Announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newAnnouncement)
        });

        const log = await fetch('/api/Logs/announcement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to save announcement');
        }
        
        alert('Announcement created successfully!');
        closeNewAnnouncementModal();
        await loadAnnouncements(currentFilter);
        
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Failed to save announcement. Please try again.');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }

    try {
        const response = await fetch(`/api/Announcements/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete announcement');
        }

        alert('Announcement deleted successfully!');
        await loadAnnouncements(currentFilter);

    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Failed to delete announcement. Please try again.');
    }
}





// ============================================
// ATTENDANCE
// ============================================

async function loadAttendanceStats(memberId) {
    try{
        const response = await fetch(`/api/Users/${memberId}`,{
            method: 'GET'
        });
        const data = await response.json();
        if(!data.success){
            console.error('Failed to load user data for attendance stats');
            return;
        }
        const stats = data;

        const statsHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon green">✓</div>
            </div>
            <div class="stat-value">${stats.attendanceCountPresent}</div>
            <div class="stat-label">Total Present</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon green">✓</div>
            </div>
            <div class="stat-value">${stats.taskCompleted}</div>
            <div class="stat-label">Task Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">❌</div>
            </div>
            <div class="stat-value">${stats.attendanceCountAbsence}</div>
            <div class="stat-label">Total Absent</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">❌</div>
            </div>
            <div class="stat-value">${stats.taskUnfinished}</div>
            <div class="stat-label">Incompleted Tasks</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">📊</div>
            </div>
            <div class="stat-value">${stats.taskrate}%</div>
            <div class="stat-label">Task Completion Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">📊</div>
            </div>
            <div class="stat-value">${stats.attendanceRate}%</div>
            <div class="stat-label">Attendance Rate</div>
        </div>
    `;
    document.getElementById('attendanceStats').innerHTML = statsHTML;



    }catch(error){
        console.error('Error loading attendance stats:', error);
    } 
}

// Store original attendance data
let originalAttendanceData = [];
let filteredAttendanceData = [];

async function loadAttendanceHistory() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Attendance/company/${companyCode}`);
        const result = await res.json();

        const container = document.getElementById("attendanceTable");
        container.innerHTML = "";

        if (!result.success || result.data.length === 0) {
            container.innerHTML = `<p class="error-message">No attendance records found.</p>`;
            return;
        }

        // Store the original data
        originalAttendanceData = result.data;
        filteredAttendanceData = [...originalAttendanceData];

        // Setup date filter button
        setupDateFilter();

        // Render the table
        renderAttendanceTable(filteredAttendanceData);

    } catch (error) {
        console.error("Error loading attendance records:", error);
        document.getElementById("attendanceTable").innerHTML =
            `<p class="error-message">Failed to load attendance.</p>`;
    }
}

function renderAttendanceTable(attendance) {
    const container = document.getElementById("attendanceTable");

    if (attendance.length === 0) {
        container.innerHTML = `<p class="error-message">No attendance records found for the selected date.</p>`;
        return;
    }

    const html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${attendance.map(a => `
                    <tr>
                        <td>${a.memberName || "-"}</td>
                        <td>${a.date ? new Date(a.date).toLocaleDateString() : "-"}</td>
                        <td>${formatTime(a.timeIn) || "-"}</td>
                        <td>
                            <span class="status-badge ${a.status === "Present" ? "status-active" : a.status === "Late" ?"status-pending":"status-inactive"}">
                                ${a.status}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function setupDateFilter() {
    const selectDateBtn = document.getElementById('selectDateBtn');
    const tableActions = document.querySelector('.table-actions');

    // Create date input if it doesn't exist
    let dateInput = document.getElementById('dateFilterInput');
    if (!dateInput) {
        dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'dateFilterInput';
        dateInput.className = 'date-filter-input';
        dateInput.style.display = 'none';
        selectDateBtn.parentNode.insertBefore(dateInput, selectDateBtn.nextSibling);

        dateInput.addEventListener('change', function() {
            filterByDate(this.value);
        });
    }

    // Create clear button if it doesn't exist
    let clearBtn = document.getElementById('clearFilterBtn');
    if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.id = 'clearFilterBtn';
        clearBtn.className = 'btn btn-secondary';
        clearBtn.textContent = '🔄 Clear Filter';
        clearBtn.style.display = 'none';
        tableActions.appendChild(clearBtn);

        clearBtn.addEventListener('click', function() {
            clearFilter();
        });
    }

    // Toggle date input visibility
    selectDateBtn.addEventListener('click', function() {
        const dateInput = document.getElementById('dateFilterInput');
        if (dateInput.style.display === 'none') {
            dateInput.style.display = 'inline-block';
            dateInput.focus();
        } else {
            dateInput.style.display = 'none';
        }
    });
}

function filterByDate(selectedDate) {
    if (!selectedDate) return;

    // Filter attendance data by selected date
    filteredAttendanceData = originalAttendanceData.filter(record => {
        if (!record.date) return false;
        const recordDate = new Date(record.date).toISOString().split('T')[0];
        return recordDate === selectedDate;
    });

    // Render filtered data
    renderAttendanceTable(filteredAttendanceData);

    // Show clear button and update select date button
    const clearBtn = document.getElementById('clearFilterBtn');
    const selectDateBtn = document.getElementById('selectDateBtn');
    const dateInput = document.getElementById('dateFilterInput');

    if (clearBtn) clearBtn.style.display = 'inline-block';
    if (selectDateBtn) selectDateBtn.textContent = `📅 ${new Date(selectedDate).toLocaleDateString()}`;
    if (dateInput) dateInput.style.display = 'none';
}

function clearFilter() {
    // Reset to original data
    filteredAttendanceData = [...originalAttendanceData];
    renderAttendanceTable(filteredAttendanceData);

    // Reset UI elements
    const clearBtn = document.getElementById('clearFilterBtn');
    const selectDateBtn = document.getElementById('selectDateBtn');
    const dateInput = document.getElementById('dateFilterInput');

    if (clearBtn) clearBtn.style.display = 'none';
    if (selectDateBtn) selectDateBtn.textContent = '📅 Select Date';
    if (dateInput) {
        dateInput.value = '';
        dateInput.style.display = 'none';
    }
}

function formatTime(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return "-";

    // If includes a date (T or space)
    let timePart = timeStr;

    if (timeStr.includes("T")) {
        timePart = timeStr.split("T")[1];
    } else if (timeStr.includes(" ")) {
        timePart = timeStr.split(" ")[1];
    }

    if (!timePart) return "-";

    // Remove milliseconds - DO NOT PARSE DATE
    timePart = timePart.split(".")[0];  // "13:38:52"

    const [hourStr, min, sec] = timePart.split(":");
    if (!hourStr) return "-";

    const h = Number(hourStr);
    if (isNaN(h)) return "-";

    // Same logic as your first function
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;

    return `${hour12}:${min}:${sec} ${suffix}`;
}


// ============================================
// DASHBOARD STATS 
// ============================================

async function loadDashboardStats() {
    try {
        console.log("loadDashboardStats started"); 
        const res = await fetch('/api/session');
        const sessionData = await res.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
        const companyCode = sessionData.user.CompanyCode;
        const response = await fetch(`/api/Users/company/${companyCode}/count`);

        const data = await response.json();
        console.log("API Response:", data);

        if (!data.success) {
            console.error('Failed to load dashboard stats');
            return;
        }
        const memberCount = data.countMember || 0;
        const attendanceRate = data.countAttendance || 0;
        const inventoryCount = data.countInventory || 0;
        const completedTask = data.countTask || 0;

        document.getElementById('memberCount').innerText = memberCount;
        document.getElementById('attendanceRate').innerText = attendanceRate.toFixed(2) + '%';
        document.getElementById('completedTasks').innerText = completedTask;
        document.getElementById('inventoryCount').innerText = inventoryCount;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

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
                            <th>Date & Time</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `
                            <tr>
                                <td>${log.memberid || 'N/A'}</td>
                                <td>${log.Activity || '-'}</td>
                                <td>${log.date ? new Date(log.date).toLocaleString() : '-'}</td>
                                <td><span class="status-badge ${log.status_type || 'status-pending'}">${log.status_type || '-'}</span></td>
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


// ===========================================
// TASKS FUNCTIONS
// ===========================================
async function loadTaskList() { 
    const container = document.getElementById('taskContainer');
    if (!container) return;

    try {
        // Get session
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
        const companyCode = sessionData.user.CompanyCode;

        // Fetch tasks
        const res = await fetch(`/api/Tasks/company/${companyCode}`);
        const result = await res.json();
        container.innerHTML = '';

        if (!result.success || !result.dataPending.length) {
            container.innerHTML = '<p class="error-message">No tasks found.</p>';
            return;
        }
        const tasks = result.dataPending;

        // Build table
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Member</th>
                        <th>Date Assigned</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td>${task.Title || '-'}</td>
                            <td>${task.memberName || task.memberid || '-'}</td>
                            <td>${task.DatePosted ? new Date(task.DatePosted).toLocaleDateString() : '-'}</td>
                            <td><span class="status-badge ${task.status || 'status-pending'}">${task.status || '-'}</span></td>
                            <td>
                                <div class="action-buttons">
                                    <button class="action-btn view-btn" data-id="${task.id}">👁️</button>
                                    <button class="action-btn delete-btn" data-id="${task.id}">❌</button>
                                    <button class="action-btn approve-btn" data-id="${task.id}">💬</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add listeners
        container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => openTaskModal(btn.dataset.id));
        });
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTask(btn.dataset.id));
        });
        container.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', () => openApproveTaskModal(btn.dataset.id));
        });

    } catch (err) {
        console.error('Error loading task list:', err);
        container.innerHTML = '<p class="error-message">Failed to load tasks.</p>';
    }
}

async function loadTaskListCompleted() { 
    const container = document.getElementById('taskContainerCompleted');
    if (!container) return;

    try {
        // Get session
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
        const companyCode = sessionData.user.CompanyCode;

        // Fetch tasks
        const res = await fetch(`/api/Tasks/company/${companyCode}`);
        const result = await res.json();
        container.innerHTML = '';

        if (!result.success || !result.dataCompleted.length) {
            container.innerHTML = '<p class="error-message">No tasks found.</p>';
            return;
        }

        const tasks = result.dataCompleted;

        // Build table
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Member</th>
                        <th>Date Assigned</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tasks.map(task => `
                        <tr>
                            <td>${task.Title || '-'}</td>
                            <td>${task.memberName || task.memberid || '-'}</td>
                            <td>${task.DatePosted ? new Date(task.DatePosted).toLocaleDateString() : '-'}</td>
                            <td><span class="status-badge ${task.status || 'status-pending'}">${task.status || '-'}</span></td>
                          
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;


    } catch (err) {
        console.error('Error loading task list:', err);
        container.innerHTML = '<p class="error-message">Failed to load tasks.</p>';
    }
}

// Example functions for View/Delete
async function openTaskModal(taskId) {
    try {
        // Fetch task details
        const response = await fetch(`/api/Tasks/${taskId}`);
        const data = await response.json();

        if (!data.success) {
            alert('Task not found');
            return;
        }

        const task = data.data[0];

        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay active" id="taskModal">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Task Details</h2>
                        <button class="modal-close" onclick="closeTaskModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="task-detail-group">
                            <div class="task-detail-label">Title</div>
                            <div class="task-detail-value">${task.Title || '-'}</div>
                        </div>

                        <div class="task-detail-group">
                            <div class="task-detail-label">Assigned To</div>
                            <div class="task-detail-value">${task.memberName || '-'}</div>
                        </div>

                        <div class="task-detail-group">
                            <div class="task-detail-label">Date Assigned</div>
                            <div class="task-detail-value">${task.DatePosted ? new Date(task.DatePosted).toLocaleString() : '-'}</div>
                        </div>

                        <div class="task-detail-group">
                            <div class="task-detail-label">Status</div>
                            <div class="task-detail-value">
                                <span class="status-badge ${task.statusClass || 'status-pending'}">${task.status || '-'}</span>
                            </div>
                        </div>

                        <div class="task-detail-group">
                            <div class="task-detail-label">Description</div>
                            <div class="task-detail-value">${task.Instructions || '-'}</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-secondary" onclick="closeTaskModal()">Close</button>
                        <button class="modal-btn modal-btn-primary" onclick="editTask('${task.id}')">Edit Task</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('taskModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Close modal when clicking outside
        document.getElementById('taskModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeTaskModal();
            }
        });

    } catch (error) {
        console.error('Error loading task data:', error);
        alert('Failed to load task data');
    }
}
// Close modal function
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.remove();
    document.body.style.overflow = ''; // Restore scroll
}
async function editTask(taskId) {
    try {
        // Fetch latest task data
        const res = await fetch(`/api/Tasks/${taskId}`);
        const result = await res.json();

        if (!result.success || !result.data.length) {
            alert('Task not found');
            return;
        }

        const task = result.data[0];
        const modal = document.getElementById('taskModal');
        const modalBody = modal.querySelector('.modal-body');

        // Replace modal body with editable form
        modalBody.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" id="editTaskTitle" value="${task.Title}">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="editTaskDescription" rows="3">${task.Instructions}</textarea>
                </div>
                <div class="form-group">
                    <label>Deadline</label>
                    <input type="date" id="editTaskDeadline" value="${task.Deadline ? new Date(task.Deadline).toISOString().split('T')[0] : ''}">
                </div>
                
            </div>
        `;

        // Update modal footer buttons
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button class="modal-btn modal-btn-secondary" onclick="cancelTaskEdit(${taskId})">Cancel</button>
            <button class="modal-btn modal-btn-primary" onclick="saveTask(${taskId})">Save Changes</button>
        `;
    } catch (error) {
        console.error('Error loading task for edit:', error);
        alert('Failed to load task data');
    }
}
function cancelTaskEdit(taskId) {
    closeTaskModal();
    openTaskModal(taskId);
}
async function saveTask(taskId) {
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();

    if (!sessionData.loggedIn) {
        alert('Session expired. Please log in again.');
        window.location.href = '/Index.html';
        return;
    }

    const updatedData = {
        Title: document.getElementById('editTaskTitle').value,
        Instructions: document.getElementById('editTaskDescription').value,
        Deadline: document.getElementById('editTaskDeadline').value
    };

    

    try {
        const res = await fetch(`/api/Tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        

        const result = await res.json();

        if (result.success) {
            alert('Task updated successfully');
            closeTaskModal();
            loadTaskList(); // reload the task table
        } else {
            alert(result.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Failed to save task');
    }
}
//Delete Task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const res = await fetch(`/api/Tasks/${taskId}`, {
            method: 'DELETE'
        });

        const result = await res.json();

        if (result.success) {
            alert('Task deleted successfully');
            loadTaskList(); // reload the task table after deletion
        } else {
            alert(result.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task');
    }
}
// Function to open Assign Task modal
function openAssignTaskModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('assignTaskModal');
    if (existingModal) existingModal.remove();

    // Modal HTML
    const modalHTML = `
        <div class="modal-overlay active" id="assignTaskModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Assign New Task</h2>
                    <button class="modal-close" onclick="closeAssignTaskModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="assignTaskForm">
                        <div class="form-group">
                            <label for="taskTitle">Task Title</label>
                            <input type="text" id="taskTitle" name="taskTitle" required>
                        </div>
                        <div class="form-group">
                            <label for="taskMember">Assign to Member</label>
                            <select id="taskMember" name="taskMember" required>
                                <option value="">Select Member</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="taskDescription">Description</label>
                            <textarea id="taskDescription" name="taskDescription"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="taskDueDate">Due Date</label>
                            <input type="date" id="taskDueDate" name="taskDueDate" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="closeAssignTaskModal()">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="submitAssignTask()">Assign Task</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Load members for dropdown
    loadMembersForTask();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    document.getElementById('assignTaskModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAssignTaskModal();
        }
    });
}

// Function to close modal
function closeAssignTaskModal() {
    const modal = document.getElementById('assignTaskModal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}
// Load members into select dropdown
async function loadMembersForTask() {
    try {

        // Get session to retrieve company code
        const respo = await fetch('/api/session');
        const sessionData = await respo.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }
        const companyCode = sessionData.user.CompanyCode;


        const res = await fetch(`/api/Users/company/${companyCode}`); // Adjust endpoint to fetch company members
        const data = await res.json();
        const select = document.getElementById('taskMember');
        if (data.success) {
            data.data.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = `${member.FirstName} ${member.LastName}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load members for task', error);
    }
}
// Submit assign task form
async function submitAssignTask() {

     // Get session to retrieve company code
    const res = await fetch('/api/session');
    const sessionData = await res.json();
    if (!sessionData.loggedIn) {
        window.location.href = '/Index.html';
        return;
    }
    const companyCode = sessionData.user.CompanyCode;

    const form = document.getElementById('assignTaskForm');
    const formData = {
        title: form.taskTitle.value,
        memberid: parseInt(form.taskMember.value),
        description: form.taskDescription.value,
        dueDate: form.taskDueDate.value,
        CompanyCode: companyCode
    };

    const logData = {
        title:  document.getElementById('editTaskTitle').value ,
        status: "Pending",
        CompanyCode: sessionData.user.CompanyCode,
        userId : sessionData.user.id
    };

    try {
        const res = await fetch('/api/Tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const log = await fetch(`/api/Logs/task`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        const result = await res.json();
        if (result.success) {
            alert('Task assigned successfully!');
            closeAssignTaskModal();
            loadTaskList(formData.CompanyCode); // Refresh task list
        } else {
            alert('Failed to assign task');
        }
    } catch (error) {
        console.error('Error assigning task', error);
        alert('Error assigning task');
    }
}
// Function to open Approve Task modal
async function openApproveTaskModal(taskId) {
    // Remove existing modal if any

    const res = await fetch(`/api/Tasks/${taskId}`);
    const result = await res.json();

    const taskIdData = result.data[0];

    const existingModal = document.getElementById('approveTaskModal');
    if (existingModal) existingModal.remove();

    console.log("Opening approve modal for task:", taskIdData);

    // Modal HTML
    const modalHTML = `
        <div class="modal-overlay active" id="approveTaskModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Approve Task</h2>
                    <button class="modal-close" onclick="closeApproveTaskModal()">×</button>
                </div>

                <div class="modal-body">
                    <form id="approveTaskForm">

                        <input type="hidden" id="approveMemberId" value="${taskIdData.memberid}">
                        <input type="hidden" id="approveTaskId" value="${taskIdData.id}">

                        <div class="form-group">
                            <label for="taskDocument">View Output</label>
                            <button 
                                type="button" 
                                class="modal-btn" 
                                title="Download" 
                                onclick="downloadDocument(${taskIdData.Outputid})">
                                ⬇️
                            </button>
                        </div>

                        <div class="form-group">
                            <label for="approveRating">Rating</label>
                            <select id="approveRating" name="approveRating" required>
                                <option value="">Select rating</option>
                                <option value="1">1 - Poor</option>
                                <option value="2">2 - Fair</option>
                                <option value="3">3 - Good</option>
                                <option value="4">4 - Very Good</option>
                                <option value="5">5 - Excellent</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="approveRemarks">Remarks</label>
                            <textarea id="approveRemarks" name="approveRemarks" required></textarea>
                        </div>

                    </form>
                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="closeApproveTaskModal()">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="submitApproveTask()">Submit</button>
                </div>
            </div>
        </div>

    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    document.getElementById('approveTaskModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeApproveTaskModal();
        }
    });
}
// Function to close modal
function closeApproveTaskModal() {
    const modal = document.getElementById('approveTaskModal');
    if (modal) modal.remove();
    document.body.style.overflow = 'auto';
}
// Submit approve task
async function submitApproveTask() {

    const respo = await fetch('/api/session');
        const sessionData = await respo.json();
        if (!sessionData.loggedIn) {
            window.location.href = '/Index.html';
            return;
        }

    const form = document.getElementById('approveTaskForm');

    const memberid = parseInt(document.getElementById('approveMemberId').value);
    const task_completed = parseInt(document.getElementById('approveTaskId').value);
    const rating = parseInt(form.approveRating.value);
    const remarks = form.approveRemarks.value.trim();

    const task = await fetch(`/api/Tasks/${task_completed}`);
    const result = await task.json();

    const taskIdData = result.data[0];
    if (!rating || !remarks) {
        alert("Please fill in rating and remarks.");
        return;
    }

    const logData = {
        title: taskIdData.title,
        status: "Approved",
        CompanyCode: sessionData.user.CompanyCode,
        userId: sessionData.user.id
    }
    try {
        const res = await fetch('/api/user_performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memberid,
                task_completed,
                rating,
                remarks
            })
        });

        const log = await fetch(`/api/Logs/task/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        const result = await res.json();

        if (result.success) {
            alert("Task approved successfully!");
            closeApproveTaskModal();
            loadTaskList(); // refresh tasks if needed
        } else {
            alert("Failed to approve task.");
        }
    } catch (error) {
        console.error("Error approving task", error);
        alert("Error approving task.");
    }
}

// ============================================
// MEMBER MODAL FUNCTIONS
// ============================================
async function loadMemberList(companyCode) {
    try {
        const response = await fetch(`/api/Users/company/${companyCode}`);
        const data = await response.json();

        const tableBody = document.getElementById('membersTableBody');
        tableBody.innerHTML = ''; // Clear existing rows

        if (!data.success || data.data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No members found.</td></tr>';
            return;
        }

        data.data.forEach(member => {
            const statusClass = member.status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${member.id.toString().padStart(3, '0')}</td>
                <td>${member.FirstName} ${member.LastName}</td>
                <td>${member.email}</td>
                <td>${member.role}</td>
                <td><span class="status-badge ${statusClass}">${member.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" title="View" onclick="openMemberModal(${member.id})">👁️</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error loading member list:', error);
        const tableBody = document.getElementById('membersTableBody');
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load members.</td></tr>';
    }
}


function getInitials(firstName, lastName) {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
}
// Function to open member modal
async function openMemberModal(memberId) {
    try {
        // Show loading state if needed
        const response = await fetch(`/api/Users/${memberId}`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Member not found');
            return;
        }

        const member = data.data;
        const stat = data.attendancehistory;
        const initials = getInitials(member.FirstName, member.LastName);
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay active" id="memberModal">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Member Details</h2>
                        <button class="modal-close" onclick="closeMemberModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="member-avatar-section">
                            <div class="member-avatar">${initials}</div>
                            <h3 class="member-name-header">${member.FirstName} ${member.LastName}</h3>
                            <p class="member-role-header">${member.role}</p>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Member ID</div>
                            <div class="member-detail-value">#${member.id}</div>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Email Address</div>
                            <div class="member-detail-value">${member.email}</div>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Phone Number</div>
                            <div class="member-detail-value">${member.phone}</div>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Status</div>
                            <div class="member-detail-value">
                                <span class="status-badge status-${member.status.toLowerCase()}">${member.status}</span>
                            </div>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Join Date</div>
                            <div class="member-detail-value">${new Date(member.hiredDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Address</div>
                            <div class="member-detail-value">${member.address}</div>
                        </div>
                        
                        <div class="member-detail-group">
                            <div class="member-detail-label">Notes</div>
                            <div class="member-detail-value">${member.notes}</div>
                        </div>

                        <!-- Members Attendance Tab -->
                
                        <div class="stats-grid" id="attendanceStats">
                            <div class="loading">Loading attendance statistics...</div>
                        </div>

                        <div class="data-table-container">
                            <h3 class="section-title">Attendance History</h3>
                            <div id="attendanceTable">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Member</th>
                                            <th>Date</th>
                                            <th>Time In</th>
                                            <th>Time Out</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${stat.map(a => `
                                            <tr>
                                                <td>${a.memberName || "-"}</td>
                                                <td>${a.date ? new Date(a.date).toLocaleDateString() : "-"}</td>
                                                <td>${formatTime(a.timeIn) || "-"}</td>
                                                <td>${formatTime(a.timeOut) || "-"}</td>
                                                <td>
                                                    <span class="status-badge ${a.status === "Present" ? "status-active" : "status-inactive"}">
                                                        ${a.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                
                    </div>
                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-secondary" onclick="closeMemberModal()">Close</button>
                        <button class="modal-btn modal-btn-primary" onclick="editMember('${member.id}')">Edit Member</button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove any existing modal
        const existingModal = document.getElementById('memberModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        loadAttendanceStats(memberId);
        loadAttendanceHistory();
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        
        // Close modal when clicking outside
        document.getElementById('memberModal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeMemberModal();
            }
        });
        
    } catch (error) {
        console.error('Error loading member data:', error);
        alert('Failed to load member data');
    }
}
async function editMember(memberId) {
    try {
        // Fetch fresh member data from API
        const response = await fetch(`/api/Users/${memberId}`);
        const data = await response.json();

        if (!data.success) {
            alert('Member not found');
            return;
        }

        const member = data.data;
        const modal = document.getElementById('memberModal');
        const modalBody = modal.querySelector('.modal-body');

        modalBody.innerHTML = `
            <div class="member-avatar-section">
                <div class="member-avatar">${getInitials(member.FirstName, member.LastName)}</div>
            </div>
            
            <div class="edit-form">
                <div class="form-group">
                    <label>First Name</label>
                    <input type="text" id="editFirstName" value="${member.FirstName || ''}">
                </div>
                
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" id="editLastName" value="${member.LastName || ''}">
                </div>
                
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="editEmail" value="${member.email || ''}">
                </div>
                
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="text" id="editPhone" value="${member.phoneNumber || ''}">
                </div>
                
                <div class="form-group">
                    <label>Role</label>
                    <select id="editRole">
                        <option value="Member" ${member.role === 'Member' ? 'selected' : ''}>Member</option>
                        <option value="Admin" ${member.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Founder" ${member.role === 'Founder' ? 'selected' : ''}>Founder</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Status</label>
                    <select id="editStatus">
                        <option value="Active" ${member.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${member.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" id="editAddress" value="${member.address || ''}">
                </div>
                
                
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="editNotes" rows="3">${member.notes || ''}</textarea>
                </div>
            </div>
        `;

        // Update footer buttons
        const modalFooter = modal.querySelector('.modal-footer');
        modalFooter.innerHTML = `
            <button class="modal-btn modal-btn-secondary" onclick="cancelEdit(${memberId})">Cancel</button>
            <button class="modal-btn modal-btn-primary" onclick="saveMember(${memberId})">Save Changes</button>
        `;

    } catch (error) {
        console.error('Error loading member for edit:', error);
        alert('Failed to load member data');
    }
}
function cancelEdit(memberId) {
    closeMemberModal();
    openMemberModal(memberId);
}
async function saveMember(memberId) {
    const updatedData = {
        FirstName: document.getElementById('editFirstName').value,
        LastName: document.getElementById('editLastName').value,
        email: document.getElementById('editEmail').value,
        phoneNumber: document.getElementById('editPhone').value,
        role: document.getElementById('editRole').value,
        status: document.getElementById('editStatus').value,
        address: document.getElementById('editAddress').value,
        notes: document.getElementById('editNotes').value
    };

  
    try {
        const response = await fetch(`/api/Users/${memberId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        


        const result = await response.json();

        if (result.success) {
            alert('Member updated successfully');
            closeMemberModal();
            // Reload the member list
            initMemberList();
        } else {
            alert(result.error || 'Failed to update member');
        }
    } catch (error) {
        console.error('Error updating member:', error);
        alert('Failed to update member');
    }
}
// Function to close member modal
function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}
// Function to cancel edit and return to view mode
function cancelEdit(memberId) {
    closeMemberModal();
    openMemberModal(memberId);
}
function openAddMemberModal() {
    const modalHTML = `
        <div class="modal-overlay active" id="addMemberModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Add New Member</h2>
                    <button class="modal-close" onclick="closeAddMemberModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="edit-form">
                        <div class="form-group">
                            <label>First Name <span style="color: red;">*</span></label>
                            <input type="text" id="addFirstName" placeholder="Enter first name" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Last Name <span style="color: red;">*</span></label>
                            <input type="text" id="addLastName" placeholder="Enter last name" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Email Address <span style="color: red;">*</span></label>
                            <input type="email" id="addEmail" placeholder="Enter email address" required>
                        </div>

                        <div class="form-group">
                            <label>Password <span style="color: red;">*</span></label>
                            <input type="password" id="addPassword" placeholder="Enter password" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="text" id="addPhone" placeholder="Enter phone number">
                        </div>
                        
                        <div class="form-group">
                            <label>Role</label>
                            <select id="addRole">
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Status</label>
                            <select id="addStatus">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Hired Date</label>
                            <input type="date" id="addHiredDate">
                        </div>
                        
                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="addAddress" placeholder="Enter address">
                        </div>
                        
                        <div class="form-group">
                            <label>Notes</label>
                            <textarea id="addNotes" rows="3" placeholder="Additional notes"></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" onclick="closeAddMemberModal()">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="saveNewMember()">Add Member</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('addMemberModal');
    if (existingModal) {
        existingModal.remove();
    }

    

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Close on overlay click
    document.getElementById('addMemberModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAddMemberModal();
        }
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("addMemberBtn");
    if (btn) {
        btn.addEventListener("click", openAddMemberModal);
    }
    });
function closeAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = 'auto';
}
async function saveNewMember() {
    const firstName = document.getElementById('addFirstName').value.trim();
    const lastName = document.getElementById('addLastName').value.trim();
    const email = document.getElementById('addEmail').value.trim();
    const password = document.getElementById('addPassword').value;
    const phone = document.getElementById('addPhone').value.trim();
    const role = document.getElementById('addRole').value;
    const status = document.getElementById('addStatus').value;
    const hiredDate = document.getElementById('addHiredDate').value;
    const address = document.getElementById('addAddress').value.trim();
    const notes = document.getElementById('addNotes').value.trim();

    // Validation
    if (!firstName || !lastName || !email || !password) {
        alert('Please fill in all required fields (First Name, Last Name, Email, Password)');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    // Get CompanyCode from session
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();
    
    if (!sessionData.loggedIn) {
        alert('Session expired. Please log in again.');
        window.location.href = '/Index.html';
        return;
    }

    const newMember = {
        FirstName: firstName,
        LastName: lastName,
        email: email,
        password: password,
        phoneNumber: phone,
        role: role,
        status: status,
        hiredDate: hiredDate || new Date().toISOString().split('T')[0],
        address: address,
        notes: notes,
        CompanyCode: sessionData.user.CompanyCode
    };

    const logData = {
        name: firstName + " " + lastName,
        category: status,
        CompanyCode: sessionData.user.CompanyCode
    }

    try {
        const response = await fetch('/api/Users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMember)
        });

        const log = await fetch(`/api/Logs/member`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Member added successfully');
            closeAddMemberModal();
            initMemberList(); // Reload the member list
        } else {
            alert(result.error || 'Failed to add member');
        }
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member');
    }
}


let fullInventoryList = [];   // all data from DB
let filteredInventoryList = []; // filtered list to display
/////////////////////////////
// INVENTORY MODAL FUNCTIONS
////////////////////////////
// =================== Inventory Modal ===================
async function loadInventoryStats() {
    try {
        // Fetch inventory data from API

        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Inventory/company/${companyCode}`);
        const data = await res.json();
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
function openInventoryModal(inventory = null) {
    const modalHTML = `
        <div class="modal-overlay active" id="inventoryModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>${inventory ? "Edit Inventory" : "Add Inventory Item"}</h2>
                    <button class="modal-close" id="closeInventoryBtn">×</button>
                </div>
                <div class="modal-body">
                    ${inventory ? `
                    <div class="form-group">
                        <label>Item Code</label>
                        <input type="text" id="inventoryCode" value="${inventory.id}" readonly>
                    </div>` : ''}

                    <div class="form-group">
                        <label>Item Name</label>
                        <input type="text" id="inventoryName" value="${inventory ? inventory.name : ''}" >
                    </div>

                    <div class="form-group">
                        <label>Category</label>
                        <select id="inventoryCategory">
                            <option value="Supplies" ${inventory && inventory.category === "Supplies" ? "selected" : ""}>Supplies</option>
                            <option value="Medical" ${inventory && inventory.category === "Medical" ? "selected" : ""}>Medical</option>
                            <option value="Stationaries" ${inventory && inventory.category === "Stationaries" ? "selected" : ""}>Stationaries</option>
                            <option value="Sanitary" ${inventory && inventory.category === "Sanitary" ? "selected" : ""}>Sanitary</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" id="inventoryQuantity" value="${inventory ? inventory.quantity : 0}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" id="cancelInventoryBtn">Cancel</button>
                    <button class="modal-btn modal-btn-primary" id="saveInventoryBtn">${inventory ? "Save Changes" : "Add Item"}</button>
                </div>
            </div>
        </div>
    `;

    // Remove any existing modal
    const existingModal = document.getElementById("inventoryModal");
    if (existingModal) existingModal.remove();

    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Event listeners
    document.getElementById('closeInventoryBtn').addEventListener('click', closeInventoryModal);
    document.getElementById('cancelInventoryBtn').addEventListener('click', closeInventoryModal);
    document.getElementById('saveInventoryBtn').addEventListener('click', () => saveInventoryItem(inventory ? inventory.id : null));

    // Close modal by clicking overlay
    document.getElementById('inventoryModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeInventoryModal();
    });
}
function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}
async function saveInventoryItem(id = null) {
    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();
    const companyCode = sessionData.user.CompanyCode;

    const data = {
        name: document.getElementById('inventoryName').value,
        category: document.getElementById('inventoryCategory').value,
        quantity: parseInt(document.getElementById('inventoryQuantity').value),
        companyCode
    };

    try {
        const res = await fetch(id ? `/api/Inventory/${id}` : `/api/Inventory`, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (result.success) {
            alert(`Inventory ${id ? "updated" : "added"} successfully`);
            closeInventoryModal();
            loadInventoryTable();
        } else {
            alert(result.error || "Failed to save inventory");
        }
    } catch (error) {
        console.error("Error saving inventory:", error);
        alert("Failed to save inventory");
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

        // ⭐ Store full list in memory
        fullInventoryList = result.data;
        filteredInventoryList = fullInventoryList;

        // ⭐ Render table
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
                    item.status === "In Stock" ? "status-active" :
                    item.status === "Low Stock" ? "status-pending" :
                    "status-inactive"
                }">${item.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick='openInventoryModal(JSON.parse(decodeURIComponent("${encoded}")))'>✏️</button>
                        <button class="action-btn" onclick='deleteInventoryItem(${item.id})'>🗑️</button>
                    </div>
                </td>
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
async function deleteInventoryItem(itemId) {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;

    try {
        const res = await fetch(`/api/Inventory/${itemId}`, { method: 'DELETE' });
        const result = await res.json();

        if (result.success) {
            alert("Inventory deleted successfully");
            loadInventoryTable();
        } else {
            alert(result.error || "Failed to delete inventory");
        }
    } catch (error) {
        console.error("Error deleting inventory:", error);
        alert("Failed to delete inventory");
    }
}
document.getElementById('inventoryFilter').addEventListener('change', (e) => {
    filterInventory(e.target.value);
});
// =================== Create Inventory Button ===================
document.querySelector('#inventory .table-actions .btn-primary')?.addEventListener('click', () => openInventoryModal());


async function loadInventoryApprovalTable() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;
        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Item_Requests/company/pending/${companyCode}`);
        const data = await res.json();
        console.log("Inventory Approval Data:", data);
        const tbody = document.getElementById('inventoryApprovalTableBody');

        if (!data.success || data.data.length === 0) { 
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="error-message">No inventory approval requests found.</td>
                </tr>`;
            return;
        }
        tbody.innerHTML = data.data.map(req => `
            <tr>
                <td>${req.id}</td>
                <td>${req.itemName}</td>
                <td>${req.requestedBy}</td>
                <td>${req.requestQuantity}</td>
                <td><span class="status-badge ${
                    req.status === "Approved" ? "status-active" :
                    req.status === "Pending" ? "status-pending" :
                    "status-inactive"
                }">${req.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="openApprovalModal(${req.id})">👁</button>
                    </div>
                </td>
            </tr>
        `).join('');
;
    } catch (error) {
        console.error("Error loading inventory approvals:", error);
    }
}
async function approveInventoryRequest(requestId) {
    const request = await fetch(`/api/Item_Requests/getRequest/${requestId}`);
    const reqResult = await request.json();

    const requestData = reqResult.data;

    const logData = {
        status: "Approved",
        CompanyCode: requestData.CompanyCode,
        userId: requestData.memberid,
        itemId: requestData.itemid
    }

    try {
        const res = await fetch(`/api/Item_Requests/approval/${requestId}/approve`, { method: 'PUT' });
        const data = await res.json();

         const log = await fetch(`/api/Logs/item_request/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });

        if (data.success) {
            alert("Inventory request approved");
            closeApprovalModal();
            loadInventoryApprovalTable();
            loadInventoryTable();
        }
        
    } catch (error) {
        console.error("Error approving inventory request:", error);
    }
}
async function rejectInventoryRequest(requestId) {
    const request = await fetch(`/api/Item_Requests/getRequest/${requestId}`);
    const reqResult = await request.json();

    const requestData = reqResult.data;

    const logData = {
        status: "Rejected",
        CompanyCode: requestData.CompanyCode,
        userId: requestData.memberid,
        itemId: requestData.itemid
    }

    try {
        const res = await fetch(`/api/Item_Requests/approval/${requestId}/reject`, { method: 'POST' });
        const data = await res.json();

         const log = await fetch(`/api/Logs/item_request/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logData)
        });
        if (data.success) {
            alert("Inventory request rejected");
            closeApprovalModal();
            loadInventoryApprovalTable();
            
        }


    } catch (error) {
        console.error("Error rejecting inventory request:", error);
    }
}

async function openApprovalModal(requestId) {
    try {
        const res = await fetch(`/api/Item_Requests/approval/${requestId}`);
        const data = await res.json();

        if (!data.success) {
            alert("Failed to load request details.");
            return;
        }

        console.log("Request Details:", data);
        const req = data.data;

        const modalHTML = `
            <div class="modal-overlay active" id="approvalModal">
                <div class="modal-container">
                    <div class="modal-header">
                        <h2>Inventory Request Details</h2>
                        <button class="modal-close" onclick="closeApprovalModal()">×</button>
                    </div>

                    <div class="modal-body">
                        <div class="form-group">
                            <label>Item Name</label>
                            <input type="text" value="${req.itemName}" readonly>
                        </div>

                        <div class="form-group">    
                            <label>Requested By</label>
                            <input type="text" value="${req.requestedBy}" readonly>
                        </div>

                        <div class="form-group">
                            <label>Quantity</label>
                            <input type="text" value="${req.requestQuantity}" readonly>
                        </div>

                        <div class="form-group">
                            <label>Reason</label>
                            <textarea readonly>${req.requestReason}</textarea>
                        </div>    
                    </div>

                    <div class="modal-footer">
                        <button class="modal-btn modal-btn-secondary" onclick="closeApprovalModal()">Close</button>
                        <button class="modal-btn modal-btn-primary" onclick="approveInventoryRequest(${requestId})">Approve</button>
                        <button class="modal-btn modal-btn-danger" onclick="rejectInventoryRequest(${requestId})">Reject</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const oldModal = document.getElementById("approvalModal");
        if (oldModal) oldModal.remove();

        document.body.insertAdjacentHTML("beforeend", modalHTML);
        document.body.style.overflow = "hidden";

    } catch (error) {
        console.error("Error loading request modal:", error);
    }
}

function closeApprovalModal() {
    const modal = document.getElementById("approvalModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
        }, 200);
    }
}




let fullDocumentList = [];
let filteredDocumentList = [];

/////////////////////////////
// DOCUMENT MODAL FUNCTIONS
////////////////////////////

async function loadDocuments() {
    try {
        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Documents/company/${companyCode}`);
        const data = await res.json();

        if (!data.success) return;

        fullDocumentList = data.documents;
        filteredDocumentList = [...fullDocumentList];

        renderDocumentTable(filteredDocumentList);

    } catch (error) {
        console.error("Error loading documents:", error);
    }
}

function renderDocumentTable(list) {
    const tbody = document.getElementById("documentTableBody");

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-message">No documents found.</td>
            </tr>`;
        return;
    }

    tbody.innerHTML = list.map(doc => `
        <tr>
            <td>📄 ${doc.name}</td>
            <td>${doc.type}</td>
            <td>${doc.owner}</td>
            <td>${new Date(doc.uploadDate).toLocaleDateString()}</td>

            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="Download" onclick="downloadDocument('${doc.id}')">⬇️</button>
                    <button class="action-btn" title="Share" onclick="shareDocument('${doc.id}')">🔗</button>
                    <button class="action-btn" title="Delete" onclick="deleteDocument('${doc.id}')">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}
document.getElementById("documentSearch").addEventListener("input", e => {
    const q = e.target.value.toLowerCase();

    filteredDocumentList = fullDocumentList.filter(doc =>
        doc.name.toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q) ||
        doc.owner.toLowerCase().includes(q)
    );

    renderDocumentTable(filteredDocumentList);
});
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
            a.download = ""; // optional: default filename
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
function deleteDocument(id) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    fetch(`/api/Documents/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Document deleted successfully");
                loadDocuments(); // refresh table
            } else {
                alert(data.error || "Failed to delete document");
            }
        })
        .catch(err => {
            console.error("Delete error:", err);
            alert("Failed to delete document");
        });
}
function openUploadDocumentModal() {
    const modalHTML = `
        <div class="modal-overlay active" id="uploadDocumentModal">
            <div class="modal-container">
                
                <div class="modal-header">
                    <h2>Upload Document</h2>
                    <button class="modal-close" id="closeUploadModalBtn">×</button>
                </div>

                <div class="modal-body">

                    <div class="form-group">
                        <label>Document Name</label>
                        <input type="text" id="docName" placeholder="Enter document name">
                    </div>

                    <div class="form-group">
                        <label>Document Type</label>
                        <select id="docType">
                            <option value="Policy">Policy</option>
                            <option value="Report">Report</option>
                            <option value="Minutes">Minutes</option>
                            <option value="Form">Form</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Document Access</label>
                        <select id="docAccess">
                            <option value="Shared">Shared</option>
                            <option value="Report">Personal</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Upload File</label>
                        <input type="file" id="docFile">
                    </div>

                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" id="cancelUploadBtn">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="uploadDocument()">Upload</button>
                </div>

            </div>
        </div>
    `;

    // Remove existing modal to avoid duplicates
    const existing = document.getElementById("uploadDocumentModal");
    if (existing) existing.remove();

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    document.body.style.overflow = "hidden"; // Lock background

    // Event Listeners
    document.getElementById("closeUploadModalBtn").addEventListener("click", closeUploadDocumentModal);
    document.getElementById("cancelUploadBtn").addEventListener("click", closeUploadDocumentModal);


    // Close on overlay click
    document.getElementById("uploadDocumentModal").addEventListener("click", e => {
        if (e.target.classList.contains("modal-overlay")) closeUploadDocumentModal();
    });
}
function closeUploadDocumentModal() {
    const modal = document.getElementById("uploadDocumentModal");
    if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = "";
        }, 300);
    }
}
async function uploadDocument() {
    const name = document.getElementById("docName").value.trim();
    const type = document.getElementById("docType").value;
    const file = document.getElementById("docFile").files[0];
    const access = document.getElementById("docAccess").value;

    if (!name || !file) {
        alert("Please fill all fields and upload a file.");
        return;
    }

    const sessionRes = await fetch('/api/session');
    const sessionData = await sessionRes.json();
    const companyCode = sessionData.user.CompanyCode;
    const owner = sessionData.user.id;

    const formData = new FormData();
    formData.append("owner", owner);
    formData.append("name", name);
    formData.append("type", type);
    formData.append("DocumentFile", file);
    formData.append("companyCode", companyCode);
    formData.append("access", access)



    try {
        const res = await fetch('/api/Documents/upload', {
            method: "POST",
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            alert("Document uploaded successfully!");
            closeUploadDocumentModal();
            loadDocuments(); // Refresh table
        } else {
            alert("Upload failed: " + (data.error || ""));
        }

    } catch (err) {
        console.error("Upload error:", err);
        alert("Upload failed");
    }
}
function searchDocuments(query) {
    query = query.toLowerCase().trim();

    filteredDocumentList = fullDocumentList.filter(doc =>
        doc.name.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        String(doc.owner).toLowerCase().includes(query)
    );

    renderDocumentTable(filteredDocumentList);
}
function filterDocuments(type) {
    if (type === "All") {
        filteredDocumentList = [...fullDocumentList];
    } else {
        filteredDocumentList = fullDocumentList.filter(doc => doc.type === type);
    }

    renderDocumentTable(filteredDocumentList);
}



document.querySelector('#documents .table-actions .btn-primary')
    .addEventListener("click", openUploadDocumentModal);

/////////////////////////////
// FEEDBACK MODAL FUNCTIONS
////////////////////////////



let feedbackCache = [];
let feedbackList = [];
let filteredFeedbackList = [];

async function loadFeedback() {
    try {
        const sessionRes = await fetch("/api/session");
        const sessionData = await sessionRes.json();
        const companyCode = sessionData.user.CompanyCode;

        const res = await fetch(`/api/Feedback/company/${companyCode}`);
        const data = await res.json();
        if (!data.success) return;

        feedbackList = data.feedback;
        filteredFeedbackList = [...feedbackList];

        renderFeedbackStats(filteredFeedbackList);

        // 2. Update the stats now that elements exist
        updateFeedbackStats(filteredFeedbackList);

        // 3. Render table
        renderFeedbackTable(filteredFeedbackList);
      

    } catch (err) {
        console.error("Feedback loading error:", err);
    }
}


function renderFeedbackTable(list) {
    const tbody = document.getElementById("feedbackTableBody");

    if (!list || list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-message">No feedback found.</td>
            </tr>`;
        return;
    }

    tbody.innerHTML = list.map(f => {
        let displayDate = "N/A";
        
        if (f.dateSubmitted) {
            // Simply extract the date part if it's an ISO string
            displayDate = String(f.dateSubmitted).split('T')[0];
        }
        
        return `
        <tr>
            <td>${f.feedbackBy}</td>
            <td>${f.type}</td>
            <td>${f.subject}</td>
            <td>${displayDate}</td>
            <td>
                <span class="status-badge ${f.status === 'Resolved' ? 'status-active' :
                                             f.status === 'Pending' ? 'status-pending' :
                                             f.status === 'Under Review' ? 'status-pending' :
                                             'status-neutral'}">
                    ${f.status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn" title="View" onclick="openViewFeedbackModal(${f.id})">👁️</button>
                    <button class="action-btn" title="Reply" onclick="openReplyFeedbackModal(${f.id})">💬</button>
                </div>
            </td>
        </tr>
    `}).join('');
}




function renderFeedbackStats(data) {
    const statsDiv = document.getElementById("feedbackStats");
    if (!statsDiv) return;

    const total = data.length;
    const positive = data.filter(x => x.Type === "Feedback").length;
    const neutral = data.filter(x => x.Type === "Suggestion").length;
    const needsAttention = data.filter(x => x.Type === "Complaint").length;

    statsDiv.innerHTML = `
        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon blue">💬</div>
            </div>
            <div class="stat-value" id="statTotalFeedback">${total}</div>
            <div class="stat-label">Total Feedback</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon green">😊</div>
            </div>
            <div class="stat-value" id="statPositiveFeedback">${positive}</div>
            <div class="stat-label">Positive</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon orange">😐</div>
            </div>
            <div class="stat-value" id="statNeutralFeedback">${neutral}</div>
            <div class="stat-label">Neutral</div>
        </div>

        <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon red">😞</div>
            </div>
            <div class="stat-value" id="statNeedsAttentionFeedback">${needsAttention}</div>
            <div class="stat-label">Needs Attention</div>
        </div>
    `;
}

function updateFeedbackStats(list) {
    const total = list.length;
    const positive = list.filter(f => f.type === "Feedback").length;
    const neutral = list.filter(f => f.type === "Suggestion").length;
    const needsAttention = list.filter(f => f.type === "Complaint").length;

    document.getElementById("statTotalFeedback").textContent = total;
    document.getElementById("statPositiveFeedback").textContent = positive;
    document.getElementById("statNeutralFeedback").textContent = neutral;
    document.getElementById("statNeedsAttentionFeedback").textContent = needsAttention;
}


function filterFeedback() {
    const search = (document.getElementById("feedbackSearch").value || "").toLowerCase();
    const typeFilter = (document.getElementById("feedbackFilter").value || "All").toLowerCase();

    filteredFeedbackList = feedbackList.filter(f => {
        const matchesSearch =
            f.feedbackBy.toLowerCase().includes(search) ||
            f.subject.toLowerCase().includes(search) ||
            f.content.toLowerCase().includes(search);

        const matchesType =
            typeFilter === "all" || f.type.toLowerCase() === typeFilter;

        return matchesSearch && matchesType;
    });

    renderFeedbackTable(filteredFeedbackList);
}


async function openViewFeedbackModal(id) {
    const res = await fetch(`/api/Feedback/${id}`);
    const data = await res.json();
    if (!data.success) return;


    if(data.data.status === "Pending"){
        await fetch(`/api/Feedback/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Under Review" })
    });
    }
    

    const f = data.data;

    const modalHTML = `
        <div class="modal-overlay active" id="viewFeedbackModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>View Feedback</h2>
                    <button class="modal-close" id="closeViewFeedbackBtn">×</button>
                </div>

                

                <div class="modal-body">
                        <div class="member-detail-group">
                            <div class="member-detail-label">Uploaded By</div>
                            <div class="member-detail-value">${f.feedbackBy}</div>
                        </div>

                        <div class="member-detail-group">
                            <div class="member-detail-label">Type</div>
                            <div class="member-detail-value">${f.type}</div>
                        </div>

                        <div class="member-detail-group">
                            <div class="member-detail-label">Subject</div>
                            <div class="member-detail-value">${f.subject}</div>
                        </div>

                        <div class="member-detail-group">
                            <div class="member-detail-label">Content</div>
                            <div class="member-detail-value">${f.content}</div>
                        </div>

                        <div class="member-detail-group">
                            <div class="member-detail-label">Status</div>
                            <div class="member-detail-value">
                                <span class="status-badge class="status-badge ${f.status === 'Resolved' ? 'status-active' :
                                             f.status === 'Pending' ? 'status-pending' :
                                             f.status === 'Under Review' ? 'status-inactive' :
                                             'status-neutral'}">${f.status}</span>
                            </div>
                        </div>
                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" onclick="openReplyFeedbackModal(${f.id})">Reply</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document.getElementById("closeViewFeedbackBtn").addEventListener("click", closeViewFeedbackModal);
}

function closeViewFeedbackModal() {
    document.getElementById("viewFeedbackModal")?.remove();
}

function openReplyFeedbackModal(id) {
    const modalHTML = `
        <div class="modal-overlay active" id="replyFeedbackModal">
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Reply to Feedback</h2>
                    <button class="modal-close" id="closeReplyFeedbackBtn">×</button>
                </div>

                <div class="modal-body">
                    <div class="form-group">
                        <label>Reply</label>
                        <textarea id="replyMessage" placeholder="Enter your reply..." class="modal-textarea"></textarea>
                    </div>
                            
                        
                            
                    
                </div>

                <div class="modal-footer">
                    <button class="modal-btn modal-btn-primary" onclick="submitFeedbackReply(${id})">Send Reply</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    document.getElementById("closeReplyFeedbackBtn").addEventListener("click", closeReplyFeedbackModal);
}

function closeReplyFeedbackModal() {
    document.getElementById("replyFeedbackModal")?.remove();
}

async function submitFeedbackReply(id) {
    const replyText = document.getElementById("replyMessage").value.trim();

    if (!replyText) {
        alert("Please enter a reply.");
        return;
    }

    await fetch(`/api/Feedback/status/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" })
    });

    closeReplyFeedbackModal();
    loadFeedback();
}

////////////////////////
// SETTINGS FUNCTIONS
////////////////////////
// Load both user and company profiles
async function loadProfile() {
    try {

        const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const userId = sessionData.user.id;

        const res = await fetch(`/api/Users/${userId}`);
        const data = await res.json();

        if (!data.success) return;


        const user = data.data;
        const company = data.companyResult;

        // User Profile
        document.getElementById("firstName").value = user.FirstName || "";
        document.getElementById("lastName").value = user.LastName || "";
        document.getElementById("userEmail").value = user.email || "";
        document.getElementById("userPhone").value = user.phoneNumber || "";
        document.getElementById("userAddress").value = user.address || "";
        document.getElementById("userNotes").value = user.notes || "";
        document.getElementById("userPassword").value = user.password || "";
        document.getElementById("userRole").value = user.role || "";
        document.getElementById("userStatus").value = user.status || "";


        // Company Profile
        document.getElementById("orgName").value = company.name || "";
        document.getElementById("orgAddress").value = company.address || "";
        document.getElementById("orgPhone").value = company.phone || "";
        document.getElementById("orgCode").value = company.CompanyCode || "";

        document.getElementById("nameSaCompany").textContent = company.name

    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

// Save changes
async function saveProfile() {
    const sessionRes = await fetch('/api/session');
        const sessionData = await sessionRes.json();
        if (!sessionData.loggedIn) return;

        const userId = sessionData.user.id;
        const CompanyCode = sessionData.user.CompanyCode

        const user = {
            id: userId,
            FirstName: document.getElementById("firstName").value.trim(),
            LastName: document.getElementById("lastName").value.trim(),
            email: document.getElementById("userEmail").value.trim(),
            phoneNumber: document.getElementById("userPhone").value.trim(),
            address: document.getElementById("userAddress").value.trim(),
            notes: document.getElementById("userNotes").value.trim(),
            password:document.getElementById("userPassword").value.trim(),
            role: document.getElementById("userRole").value.trim(),
            status: document.getElementById("userStatus").value.trim()
        }
        const company = {
            name: document.getElementById("orgName").value.trim(),
            address: document.getElementById("orgAddress").value.trim(),
            phone: document.getElementById("orgPhone").value.trim(),
            companyCode: CompanyCode
        }
        
 

    try {
        const resComp = await fetch('/api/Organization/profile', {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ company })

        });
        const data = await resComp.json();


        const resUser = await fetch(`/api/Users/${userId}`,{
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user)
        });

        const userData = await resUser.json();

        if (data.success&&userData.success) alert("Profile updated successfully!");
        else alert("Failed to update profile: " + (data.error || userData.error|| ""));
    } catch (err) {
        console.error("Error saving profile:", err);
        alert("Error saving profile.");
    }
}

// Reset form
function resetProfile() {
    loadProfile();
}

// Event listeners
document.getElementById("saveProfileBtn").addEventListener("click", saveProfile);
document.getElementById("logoutBtn").addEventListener("click", () => {
    window.location.href = "/Index.html";
});





document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("feedbackSearchInput");
    const filter = document.getElementById("feedbackFilterSelect");

    if (search) search.addEventListener("input", filterFeedback);
    if (filter) filter.addEventListener("change", filterFeedback);
});


// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers to all view buttons
    const viewButtons = document.querySelectorAll('.action-btn[title="View"]');
    viewButtons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Get member ID from the row
            const row = button.closest('tr');
            const memberId = row.querySelector('td:first-child').textContent.replace('#', '');
            openMemberModal(memberId);
        });
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMemberModal();
        }
    });

    document.getElementById("feedbackSearch").addEventListener("input", filterFeedback);
    document.getElementById("feedbackFilter").addEventListener("change", filterFeedback);

    document.getElementById("documentSearch")
    .addEventListener("input", e => searchDocuments(e.target.value));

    document.getElementById("documentFilterDropdown")
    .addEventListener("change", e => filterDocuments(e.target.value));


});

window.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});
