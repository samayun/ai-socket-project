// Initialize navbar
document.addEventListener('DOMContentLoaded', () => {
    initializeNavbar();
});

function initializeNavbar() {
    // Burger menu toggle
    const burger = document.querySelector('.navbar-burger');
    const menu = document.querySelector('.navbar-menu');
    
    if (burger && menu) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('is-active');
            menu.classList.toggle('is-active');
        });
    }

    // Check authentication status
    checkAuthStatus();

    // Initialize modals
    initializeModals();

    // Add event listeners
    addEventListeners();
}

function checkAuthStatus() {
    fetch('/api/auth/status')
        .then(response => response.json())
        .then(data => {
            const guestButtons = document.querySelector('.guest-buttons');
            const authButtons = document.querySelector('.auth-buttons');
            
            if (data.authenticated) {
                if (guestButtons) guestButtons.style.display = 'none';
                if (authButtons) authButtons.style.display = 'flex';
                
                // Update user info
                const userInfo = document.querySelector('.user-info');
                if (userInfo) {
                    userInfo.textContent = data.user.display_name;
                }
            } else {
                if (guestButtons) guestButtons.style.display = 'flex';
                if (authButtons) authButtons.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Auth status error:', error);
        });
}

function initializeModals() {
    // Sign Up Modal
    const signupModal = document.getElementById('signup-modal');
    const signupModalButton = document.getElementById('signup-modal-button');
    const signupCancel = document.getElementById('signup-cancel');
    const signupClose = signupModal?.querySelector('.delete');
    const signupButton = document.getElementById('signup-button');

    if (signupModal && signupModalButton) {
        signupModalButton.addEventListener('click', () => {
            signupModal.classList.add('is-active');
        });

        if (signupCancel) {
            signupCancel.addEventListener('click', () => {
                signupModal.classList.remove('is-active');
            });
        }

        if (signupClose) {
            signupClose.addEventListener('click', () => {
                signupModal.classList.remove('is-active');
            });
        }

        if (signupButton) {
            signupButton.addEventListener('click', () => {
                document.getElementById('signup-form').dispatchEvent(new Event('submit'));
            });
        }
    }

    // Sign In Modal
    const signinModal = document.getElementById('signin-modal');
    const signinModalButton = document.getElementById('signin-modal-button');
    const signinCancel = document.getElementById('signin-cancel');
    const signinClose = signinModal?.querySelector('.delete');
    const signinButton = document.getElementById('signin-button');

    if (signinModal && signinModalButton) {
        signinModalButton.addEventListener('click', () => {
            signinModal.classList.add('is-active');
        });

        if (signinCancel) {
            signinCancel.addEventListener('click', () => {
                signinModal.classList.remove('is-active');
            });
        }

        if (signinClose) {
            signinClose.addEventListener('click', () => {
                signinModal.classList.remove('is-active');
            });
        }

        if (signinButton) {
            signinButton.addEventListener('click', () => {
                document.getElementById('signin-form').dispatchEvent(new Event('submit'));
            });
        }
    }
}

function validateSignupForm(username, password, displayName, age, parentEmail) {
    const errors = [];

    if (!username || username.length < 3) {
        errors.push('Username must be at least 3 characters long');
    }
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }
    if (!displayName || displayName.length < 2) {
        errors.push('Display name must be at least 2 characters long');
    }
    if (!age || age < 0 || age > 18) {
        errors.push('Age must be between 0 and 18');
    }
    if (!parentEmail || !isValidEmail(parentEmail)) {
        errors.push('Please enter a valid parent email address');
    }

    return errors;
}

function validateSigninForm(username, password) {
    const errors = [];

    if (!username) {
        errors.push('Username is required');
    }
    if (!password) {
        errors.push('Password is required');
    }

    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFormErrors(errors) {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const errorContainer = document.createElement('div');
    errorContainer.className = 'notification is-danger';
    
    const errorList = document.createElement('ul');
    errors.forEach(error => {
        const errorItem = document.createElement('li');
        errorItem.textContent = error;
        errorList.appendChild(errorItem);
    });
    
    errorContainer.appendChild(errorList);
    document.body.appendChild(errorContainer);
    
    // Add error class to form fields
    const form = document.activeElement.closest('form');
    if (form) {
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('is-danger');
            if (errors.some(error => error.toLowerCase().includes(input.id.replace('signup-', '').replace('signin-', '')))) {
                input.classList.add('is-danger');
            }
        });
    }
    
    setTimeout(() => {
        errorContainer.remove();
        // Remove error class from inputs after notification disappears
        if (form) {
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => input.classList.remove('is-danger'));
        }
    }, 5000);
}

function addEventListeners() {
    // Sign up form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;
            const displayName = document.getElementById('signup-display-name').value;
            const age = document.getElementById('signup-age').value;
            const parentEmail = document.getElementById('signup-parent-email').value;

            // Validate form
            const validationErrors = validateSignupForm(username, password, displayName, age, parentEmail);
            if (validationErrors.length > 0) {
                showFormErrors(validationErrors);
                return;
            }

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        display_name: displayName,
                        age: parseInt(age),
                        parent_email: parentEmail
                    }),
                    credentials: 'include'
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Sign up successful!', 'success');
                    document.getElementById('signup-modal').classList.remove('is-active');
                    checkAuthStatus();
                } else {
                    showFormErrors([data.error || 'Error signing up']);
                }
            } catch (error) {
                console.error('Signup error:', error);
                showFormErrors(['Error connecting to server']);
            }
        });
    }

    // Sign in form
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signin-username').value;
            const password = document.getElementById('signin-password').value;

            // Validate form
            const validationErrors = validateSigninForm(username, password);
            if (validationErrors.length > 0) {
                showFormErrors(validationErrors);
                return;
            }

            try {
                const response = await fetch('/api/auth/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        password
                    }),
                    credentials: 'include'
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Sign in successful!', 'success');
                    document.getElementById('signin-modal').classList.remove('is-active');
                    checkAuthStatus();
                } else {
                    showFormErrors([data.error || 'Error signing in']);
                }
            } catch (error) {
                console.error('Signin error:', error);
                showFormErrors(['Error connecting to server']);
            }
        });
    }

    // Logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();
                if (data.success) {
                    showNotification('Logged out successfully', 'success');
                    checkAuthStatus();
                } else {
                    showNotification('Error logging out', 'error');
                }
            } catch (error) {
                console.error('Logout error:', error);
                showNotification('Error logging out', 'error');
            }
        });
    }
}

function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize player data
async function initializePlayerData() {
    try {
        // Get authentication status
        const authResponse = await fetch('/api/auth/status', {
            credentials: 'include'
        });
        const authData = await authResponse.json();

        if (authData.authenticated) {
            // Use authenticated user's ID
            socket.emit('playerData', { id: authData.user.id });
        } else {
            // Generate a temporary ID for anonymous users
            const tempId = 'anon_' + Math.random().toString(36).substr(2, 9);
            socket.emit('playerData', { id: tempId });
        }
    } catch (error) {
        console.error('Error initializing player data:', error);
    }
} 