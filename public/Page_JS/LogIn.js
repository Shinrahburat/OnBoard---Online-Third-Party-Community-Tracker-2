document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
        displayMessage('Please enter both email and password', 'error');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
            displayMessage(data.error, 'error');
            return;
        }

        const user = data.user;
        displayMessage(`Welcome back, ${user.name}!`, 'success');

        // Redirect based on role
        const role = user.role.toLowerCase();
        if (role === 'admin' || role === 'founder') {
            window.location.href = '/Html/AdminDashboard.html';
        } else if (role === 'member') {
            window.location.href = '/Html/UserDashboard.html';
        } else {
            window.location.href = '/dashboard.html';
        }

    } catch (err) {
        console.error(err);
        displayMessage('Login failed due to server error', 'error');
    }
});

// Optional: function to display messages on the page
function displayMessage(msg, type = 'info') {
    let msgBox = document.getElementById('messageBox');

    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'messageBox';
        msgBox.style.position = 'fixed';
        msgBox.style.top = '20px';
        msgBox.style.right = '20px';
        msgBox.style.padding = '10px 20px';
        msgBox.style.borderRadius = '5px';
        msgBox.style.color = '#fff';
        msgBox.style.zIndex = '9999';
        document.body.appendChild(msgBox);
    }

    msgBox.innerText = msg;
    msgBox.style.backgroundColor = type === 'error' ? '#e74c3c' : '#2ecc71';

    setTimeout(() => { msgBox.innerText = ''; }, 3000);
}

// Input animations (optional)
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'translateX(5px)';
        input.parentElement.style.transition = 'transform 0.3s ease';
    });
    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'translateX(0)';
    });
});
