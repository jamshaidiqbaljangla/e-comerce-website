// js/admin-login.js
document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const loginButton = document.getElementById('loginButton');
    const btnText = loginButton ? loginButton.querySelector('.btn-text') : null;
    const btnLoader = loginButton ? loginButton.querySelector('.btn-loader') : null;
    const loginErrorMessage = document.getElementById('loginErrorMessage');

    // Check if user is already logged in as admin and redirect
    const existingToken = localStorage.getItem('adminAuthToken');
    const adminUser = localStorage.getItem('adminUser');
    if (existingToken && adminUser) {
        try {
            const user = JSON.parse(adminUser);
            if (user && user.role === 'admin') {
                // Optionally, you might want to verify token validity with backend here
                // For simplicity, we redirect if token and admin role marker exist
                console.log('Admin token found, redirecting to dashboard.');
                window.location.href = 'admin.html'; // Or admin-products.html
                return; // Stop further execution of login script
            }
        } catch (e) {
            console.error("Error parsing stored admin user data", e);
            // Clear potentially corrupted stored data
            localStorage.removeItem('adminAuthToken');
            localStorage.removeItem('adminUser');
        }
    }


    if (adminLoginForm && loginButton && btnText && btnLoader) {
        adminLoginForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            
            // Reset previous messages
            loginErrorMessage.textContent = '';
            loginErrorMessage.className = 'error-message'; // Reset class

            // Show loader, disable button
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            loginButton.disabled = true;

            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;

            if (!email || !password) {
                loginErrorMessage.textContent = 'Email and Password are required.';
                loginErrorMessage.classList.add('show');
                btnText.style.display = 'inline-block';
                btnLoader.style.display = 'none';
                loginButton.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw data; 
                }

                if (data.token && data.user && data.user.role === 'admin') {
                    localStorage.setItem('adminAuthToken', data.token);
                    localStorage.setItem('adminUser', JSON.stringify(data.user));
                    
                    loginErrorMessage.textContent = 'Login successful! Redirecting...';
                    loginErrorMessage.className = 'success-message show'; // Use success styles

                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'admin.html'; // Or your preferred admin landing page
                    }, 1000);

                } else if (data.user && data.user.role !== 'admin') {
                    loginErrorMessage.textContent = 'Access Denied. User is not an administrator.';
                    loginErrorMessage.classList.add('show');
                    btnText.style.display = 'inline-block';
                    btnLoader.style.display = 'none';
                    loginButton.disabled = false;
                } else {
                    loginErrorMessage.textContent = data.error || 'Login failed. Please check your credentials.';
                    loginErrorMessage.classList.add('show');
                    btnText.style.display = 'inline-block';
                    btnLoader.style.display = 'none';
                    loginButton.disabled = false;
                }
            } catch (error) {
                console.error('Admin Login process error:', error);
                loginErrorMessage.textContent = `Login error: ${error.error || 'An unknown issue occurred. Please try again.'}`;
                loginErrorMessage.classList.add('show');
                btnText.style.display = 'inline-block';
                btnLoader.style.display = 'none';
                loginButton.disabled = false;
            }
        });
    } else {
        console.error('Login form or button elements not found.');
    }
});