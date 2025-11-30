
let currentStep = 1;

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const strengthBar = document.getElementById('strengthBar');
const passwordError = document.getElementById('passwordError');
const emailError = document.getElementById('emailError');
const form = document.getElementById('registerForm');

// Step navigation functions
function nextStep(step) {
    // Validate current step before proceeding
    if (currentStep === 1) {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!email || !password || !confirmPassword) {
            alert('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
    }

    if (currentStep === 2) {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const community = document.getElementById('communityCode').value;

        if (!firstName || !lastName || !community) {
            alert('Please fill in all required fields');
            return;
        }

        // 🔍 CHECK COMMUNITY CODE FROM SERVER

        fetch(`/api/Organization/${community}`)
            .then(res => res.json())
            .then(company => {
                if (!company.exists) {
                    alert("❌ Community Code does not exist in the database.");
                    return; // stop progression
                }

                // 👍 Code exists → continue
                getCompanyData(community);
                goToNextStep(step);
            })
            .catch(err => {
                console.error("Error checking community code:", err);
                alert("Server error. Please try again.");
            });

        return; // prevent auto navigation
    }


    // Update step indicators
    document.getElementById('step' + currentStep).classList.remove('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('completed');
    document.querySelectorAll('.step')[currentStep - 1].classList.remove('active');

    currentStep = step;

    document.getElementById('step' + currentStep).classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('active');

    // Scroll to top of form
    document.querySelector('.register-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function getCompanyData(companyCode){
    const res = await fetch(`/api/Organization/${companyCode}`);
    const result = await res.json();

    const data = result.data;
    console.log(data.name)
    updateReview(data.name);
}




function prevStep(step) {
    document.getElementById('step' + currentStep).classList.remove('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.remove('active');
    
    currentStep = step;
    
    document.getElementById('step' + currentStep).classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.remove('completed');

    // Scroll to top of form
    document.querySelector('.register-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateReview(data) {

    const email = document.getElementById('email').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value || 'Not provided';
    const address = document.getElementById('address').value;
    const community = data

    document.getElementById('reviewEmail').textContent = email;
    document.getElementById('reviewName').textContent = `${firstName} ${lastName}`;
    document.getElementById('reviewPhone').textContent = phone;
    document.getElementById('reviewAddress').textContent = address;
    document.getElementById('reviewCommunity').textContent = community.charAt(0).toUpperCase() + community.slice(1);
}

// Password strength checker
passwordInput.addEventListener('input', function() {
    const password = this.value;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;

    strengthBar.className = 'password-strength-bar';
    
    if (strength === 1) {
        strengthBar.classList.add('strength-weak');
    } else if (strength === 2 || strength === 3) {
        strengthBar.classList.add('strength-medium');
    } else if (strength === 4) {
        strengthBar.classList.add('strength-strong');
    }
});

// Password match checker
confirmPasswordInput.addEventListener('input', function() {
    if (this.value !== passwordInput.value && this.value.length > 0) {
        passwordError.classList.add('show');
        this.style.borderColor = '#ff4444';
    } else {
        passwordError.classList.remove('show');
        this.style.borderColor = '#e0e0e0';
    }
});

// Email validation
document.getElementById('email').addEventListener('blur', function() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value) && this.value.length > 0) {
        emailError.classList.add('show');
        this.style.borderColor = '#ff4444';
    } else {
        emailError.classList.remove('show');
        this.style.borderColor = '#e0e0e0';
    }
});

// Form submission
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const terms = document.getElementById('terms').checked;
    if (!terms) {
        alert('Please agree to the Terms of Service and Privacy Policy');
        return;
    }

    const formData = {
        FirstName: document.getElementById('firstName').value,
        LastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phone').value,
        password: document.getElementById('password').value,
        CompanyCode: document.getElementById('communityCode').value,
        address: document.getElementById('address').value,
    };

    const result = await createMember(formData);  // <-- WAIT HERE

    if (!result || !result.success) {
        alert("Failed to register");
        return;
    }

    await autoLogin(formData.email, formData.password);  
    
    console.log('Registration data:', formData);
    alert('Registration successful! Welcome to OnBoard!');
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


async function createMember(formData){
    try {
        const response = await fetch('/api/Users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        return result;
       
    
        
    } catch (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member. Please try again.');
    }
}

// Input animations
const inputs = document.querySelectorAll('input, select');
inputs.forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateX(5px)';
        this.parentElement.style.transition = 'transform 0.3s ease';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateX(0)';
    });
});


function goToNextStep(step) {
    document.getElementById('step' + currentStep).classList.remove('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('completed');
    document.querySelectorAll('.step')[currentStep - 1].classList.remove('active');

    currentStep = step;

    document.getElementById('step' + currentStep).classList.add('active');
    document.querySelectorAll('.step')[currentStep - 1].classList.add('active');

    document.querySelector('.register-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
