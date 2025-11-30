let currentStep = 1;

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const strengthBar = document.getElementById('strengthBar');
const passwordError = document.getElementById('passwordError');
const emailError = document.getElementById('emailError');
const form = document.getElementById('registerForm');

// STEP NAVIGATION
function nextStep(step) {
    if (currentStep === 1) {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!email || !password || !confirmPassword) return alert('Please fill in all required fields');
        if (password !== confirmPassword) return alert('Passwords do not match!');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return alert('Invalid email');
    }

    if (currentStep === 2) {
        if (!document.getElementById('firstName').value ||
            !document.getElementById('lastName').value) {
            return alert('Please fill in all required fields');
        }
    }

    if (currentStep === 3) {
        if (!document.getElementById('companyName').value ||
            !document.getElementById('companyAddress').value ||
            !document.getElementById('companyContact').value) {
            return alert('Please fill in all company fields');
        }
        updateReview();
    }

    document.getElementById('step' + currentStep).classList.remove('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('completed');
    currentStep = step;

    document.getElementById('step' + currentStep).classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('active');

    document.querySelector('.register-card')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prevStep(step) {
    document.getElementById('step' + currentStep).classList.remove('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.remove('active');
    currentStep = step;
    document.getElementById('step' + currentStep).classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('active');
}

// REVIEW INFO
function updateReview() {
    document.getElementById('reviewEmail').textContent = document.getElementById('email').value;
    document.getElementById('reviewName').textContent = `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`;
    document.getElementById('reviewPhone').textContent = document.getElementById('phone').value || 'Not provided';
    document.getElementById('reviewCompany').textContent = document.getElementById('companyName').value;
    document.getElementById('reviewCompAdd').textContent = document.getElementById('companyAddress').value;
    document.getElementById('reviewCompContact').textContent = document.getElementById('companyContact').value;
}

// PASSWORD STRENGTH
passwordInput.addEventListener('input', function () {
    const password = this.value;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    strengthBar.className = 'password-strength-bar';
    strengthBar.classList.add(
        strength === 1 ? 'strength-weak' :
        strength <= 3 ? 'strength-medium' :
        'strength-strong'
    );
});

// CONFIRM PASSWORD
confirmPasswordInput.addEventListener('input', function () {
    if (this.value !== passwordInput.value && this.value.length > 0) {
        passwordError.classList.add('show');
        this.style.borderColor = '#ff4444';
    } else {
        passwordError.classList.remove('show');
        this.style.borderColor = '#e0e0e0';
    }
});

// EMAIL VALIDATION
document.getElementById('email').addEventListener('blur', function () {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value) && this.value.length > 0) {
        emailError.classList.add('show');
        this.style.borderColor = '#ff4444';
    } else {
        emailError.classList.remove('show');
        this.style.borderColor = '#e0e0e0';
    }
});

// FORM SUBMIT → CONNECT TO BACKEND
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!document.getElementById('terms').checked)
        return alert('Please agree to the terms.');

    const data = {
        CompanyName: document.getElementById('companyName').value,
        CompanyAddress: document.getElementById('companyAddress').value,
        CompanyContact: document.getElementById('companyContact').value,

        FirstName: document.getElementById('firstName').value,
        LastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phone').value,
        password: document.getElementById('password').value,
        address: document.getElementById('address').value
    };

    try {
        const res = await fetch('/api/Organization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (!result.success) return alert(result.error);

        alert('Registration successful! Welcome to OnBoard!');
        autoLogin(data.email,data.password);

    } catch (err) {
        console.error(err);
        alert('Something went wrong.');
    }
});



async function autoLogin(email, password) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!data.success) {
            alert("Account created, but auto-login failed. Please login manually.");
            
            return;
        }

        const user = data.user;
        
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
        console.error("Auto-login error:", err);
        alert("Account created but auto-login failed due to server error.");
    }
}

// INPUT ANIMATION
document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('focus', function () {
        this.parentElement.style.transform = 'translateX(5px)';
        this.parentElement.style.transition = 'transform 0.3s ease';
    });
    input.addEventListener('blur', function () {
        this.parentElement.style.transform = 'translateX(0)';
    });
});
