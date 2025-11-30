const memberCard = document.getElementById('memberCard');
const founderCard = document.getElementById('founderCard');
const continueBtn = document.getElementById('continueBtn');
let selectedRole = null;

function selectRole(card, role) {
    memberCard.classList.remove('selected');
    founderCard.classList.remove('selected');
    card.classList.add('selected');
    selectedRole = role;
    continueBtn.disabled = false;
}

memberCard.addEventListener('click', () => {
    selectRole(memberCard, 'Member');
});

founderCard.addEventListener('click', () => {
    selectRole(founderCard, 'Founder');
});

continueBtn.addEventListener('click', () => {
    if (selectedRole) {
        window.registrationData = window.registrationData || {};
        window.registrationData.userType = selectedRole;
        
        continueBtn.textContent = 'Loading...';
        continueBtn.disabled = true;

        if (selectedRole === 'Member') {
            window.location.href = 'MemberRegistration.html';
        } else if (selectedRole === 'Founder') {
            window.location.href = 'Registration.html';
        }
       
    }
});