// js/admin-login.js
document.addEventListener('DOMContentLoaded', function () {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const loginButton = document.getElementById('loginButton');
    const btnText = loginButton ? loginButton.querySelector('.btn-text') : null;
    const btnLoader = loginButton ? loginButton.querySelector('.btn-loader') : null;
    const loginErrorMessage = document.getElementById('loginErrorMessage');



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
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw data; 
                }

                if (data.success && data.token && data.user) {
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminUser', JSON.stringify(data.user));
                    
                    loginErrorMessage.textContent = 'Login successful! Redirecting...';
                    loginErrorMessage.className = 'success-message show'; // Use success styles

                    // Redirect after a short delay
                    setTimeout(() => {
                        window.location.href = 'admin.html'; // Or your preferred admin landing page
                    }, 1000);

                } else {
                    loginErrorMessage.textContent = data.message || 'Login failed. Please check your credentials.';
                    loginErrorMessage.classList.add('show');
                    btnText.style.display = 'inline-block';
                    btnLoader.style.display = 'none';
                    loginButton.disabled = false;
                }
            } catch (error) {
                console.error('Admin Login process error:', error);
                loginErrorMessage.textContent = `Login error: ${error.message || 'Invalid credentials. Please try again.'}`;
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
