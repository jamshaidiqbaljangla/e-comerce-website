/**
 * BINGO E-commerce Auth Manager
 * Handles user authentication, registration, and session management
 */

window.AuthManager = {
    // User session key in localStorage
    SESSION_KEY: 'bingoLoggedInUser',
    USERS_KEY: 'bingoUsers',
    
    /**
     * Initialize the authentication manager
     */
    init: function() {
        console.log('[DEBUG] auth-manager.js: Auth Manager initializing...');
        
        // Inject auth modal
        this.injectAuthModal();
        
        // Set up auth modal
        this.setupAuthModal();
        
        // Only check authentication for protected pages
        if (window.location.pathname.includes('account.html')) {
            this.checkProtectedPage();
        }
        
        // Original init code for dedicated pages
        if (window.location.pathname.includes('login.html')) {
            this.setupLoginForm();
        }
        
        if (window.location.pathname.includes('register.html')) {
            this.setupRegisterForm();
        }
        
        if (window.location.pathname.includes('forgot-password.html')) {
            this.setupForgotPasswordForm();
        }
        if (!localStorage.getItem(this.USERS_KEY)) {
            localStorage.setItem(this.USERS_KEY, JSON.stringify([]));
        }
        
        console.log('[DEBUG] auth-manager.js: Auth Manager initialized');
    },
    
    /**
     * Check if user is authenticated, redirect to login if on protected page
     */
    checkProtectedPage: function() {
        if (!this.isAuthenticated()) {
            console.log('[DEBUG] auth-manager.js: User not authenticated, redirecting to login page.');
            window.location.href = 'login.html';
        }
    },
    
    /**
     * Inject auth modal HTML
     */
    injectAuthModal: function() {
        // Check if auth modal already exists
        if (document.getElementById('auth-modal')) return;
        
        // Create modal HTML
        const modalHTML = `
            <div id="auth-modal" class="modal">
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
                    <div class="auth-modal-content">
                        <!-- Login Form -->
                        <div id="login-form-container" class="auth-form-container">
                            <h2 class="auth-title">Sign In</h2>
                            <p class="auth-subtitle">Sign in to continue shopping</p>
                            
                            <div id="login-error" class="auth-message error">
                                <p id="login-error-message">Invalid email or password. Please try again.</p>
                            </div>
                            
                            <form id="modal-login-form">
                                <div class="form-group">
                                    <label for="login-email">Email</label>
                                    <input type="email" id="login-email" class="form-control" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="login-password">Password</label>
                                    <input type="password" id="login-password" class="form-control" required>
                                </div>
                                
                                <div class="auth-actions">
                                    <label class="checkbox-container remember-me">
                                        <input type="checkbox" id="login-remember">
                                        <span class="checkmark"></span>
                                        <span>Remember me</span>
                                    </label>
                                    <a href="#" class="forgot-password" id="show-forgot-password">Forgot Password?</a>
                                </div>
                                
                                <button type="submit" class="btn btn-dark btn-full">Sign In</button>
                            </form>
                            
                            <div class="auth-footer">
                                <p>Don't have an account? <a href="#" class="auth-link" id="show-register">Create Account</a></p>
                            </div>
                        </div>
                        
                        <!-- Register Form -->
                        <div id="register-form-container" class="auth-form-container" style="display: none;">
                            <h2 class="auth-title">Create Account</h2>
                            <p class="auth-subtitle">Sign up to continue shopping</p>
                            
                            <div id="register-error" class="auth-message error">
                                <p id="register-error-message">Error message here.</p>
                            </div>
                            
                            <div id="register-success" class="auth-message success">
                                <p>Account created successfully! You can now sign in.</p>
                            </div>
                            
                            <form id="modal-register-form">
                                <div class="input-group">
                                    <div class="form-group">
                                        <label for="register-firstName">First Name</label>
                                        <input type="text" id="register-firstName" class="form-control" required>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label for="register-lastName">Last Name</label>
                                        <input type="text" id="register-lastName" class="form-control" required>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="register-email">Email</label>
                                    <input type="email" id="register-email" class="form-control" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="register-password">Password</label>
                                    <input type="password" id="register-password" class="form-control" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="register-confirmPassword">Confirm Password</label>
                                    <input type="password" id="register-confirmPassword" class="form-control" required>
                                </div>
                                
                                <button type="submit" class="btn btn-dark btn-full">Create Account</button>
                            </form>
                            
                            <div class="auth-footer">
                                <p>Already have an account? <a href="#" class="auth-link" id="show-login">Sign In</a></p>
                            </div>
                        </div>
                        
                        <!-- Forgot Password Form -->
                        <div id="forgot-password-container" class="auth-form-container" style="display: none;">
                            <h2 class="auth-title">Forgot Password</h2>
                            <p class="auth-subtitle">Enter your email to reset your password</p>
                            
                            <div id="reset-error" class="auth-message error">
                                <p id="reset-error-message">Error message here.</p>
                            </div>
                            
                            <div id="reset-success" class="auth-message success">
                                <p>Password reset instructions sent to your email.</p>
                            </div>
                            
                            <form id="modal-reset-form">
                                <div class="form-group">
                                    <label for="reset-email">Email</label>
                                    <input type="email" id="reset-email" class="form-control" required>
                                </div>
                                
                                <button type="submit" class="btn btn-dark btn-full">Reset Password</button>
                            </form>
                            
                            <div class="auth-footer">
                                <p>Remember your password? <a href="#" class="auth-link" id="back-to-login">Back to Sign In</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },
    
    /**
     * Set up login form event listeners
     */
    setupLoginForm: function() {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;
        
        const authManager = this; // Store reference to use in event handler
        
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.querySelector('input[name="remember"]').checked;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            if (submitBtn) submitBtn.classList.add('btn-loading');
            
            try {
                // Attempt to login using the stored reference
                if (authManager.login(email, password, remember)) {
                    // Success, redirect to account page
                    window.location.href = 'account.html';
                } else {
                    // Show error message
                    const errorElement = document.getElementById('login-error');
                    if (errorElement) {
                        errorElement.classList.add('show');
                        
                        // Hide error after 5 seconds
                        setTimeout(function() {
                            errorElement.classList.remove('show');
                        }, 5000);
                    }
                    if (submitBtn) submitBtn.classList.remove('btn-loading');
                }
            } catch (error) {
                console.error('[ERROR] auth-manager.js: Login error:', error);
                if (submitBtn) submitBtn.classList.remove('btn-loading');
            }
        });
    },
    
    /**
     * Set up registration form event listeners
     */
    setupRegisterForm: function() {
        const registerForm = document.getElementById('register-form');
        if (!registerForm) return;
        
        const authManager = this; // Store reference to use in event handler
        
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            const errorElement = document.getElementById('register-error');
            const errorMessage = document.getElementById('error-message');
            const successElement = document.getElementById('register-success');
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            if (submitBtn) submitBtn.classList.add('btn-loading');
            
            // Basic client-side validation
            if (password !== confirmPassword) {
                errorMessage.textContent = "Passwords do not match.";
                errorElement.classList.add('show');
                if (submitBtn) submitBtn.classList.remove('btn-loading');
                return;
            }
            
            // Password strength validation
            const passwordValidation = authManager.validatePassword(password);
            if (!passwordValidation.valid) {
                errorMessage.textContent = passwordValidation.message;
                errorElement.classList.add('show');
                if (submitBtn) submitBtn.classList.remove('btn-loading');
                return;
            }
            
            try {
                // Attempt to register user using the stored reference
                authManager.register(firstName, lastName, email, password);
                
                // Show success message
                successElement.classList.add('show');
                
                // Clear form
                registerForm.reset();
                
                // Redirect to login page after 2 seconds
                setTimeout(function() {
                    window.location.href = 'login.html';
                }, 2000);
                
            } catch (error) {
                // Show error message
                errorMessage.textContent = error.message;
                errorElement.classList.add('show');
                
                // Hide error after 5 seconds
                setTimeout(function() {
                    errorElement.classList.remove('show');
                }, 5000);
                
                if (submitBtn) submitBtn.classList.remove('btn-loading');
            }
        });
    },
    
    /**
     * Set up forgot password form event listeners
     */
    setupForgotPasswordForm: function() {
        const resetForm = document.getElementById('reset-form');
        if (!resetForm) return;
        
        const authManager = this; // Store reference to use in event handler
        
        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const errorElement = document.getElementById('reset-error');
            const errorMessage = document.getElementById('error-message');
            const successElement = document.getElementById('reset-success');
            const submitBtn = resetForm.querySelector('button[type="submit"]');
            
            if (submitBtn) submitBtn.classList.add('btn-loading');
            
            // Check if user exists
            const users = authManager.getUsers();
            const user = users.find(user => user.email === email);
            
            if (!user) {
                errorMessage.textContent = "Email not found. Please check your email or create a new account.";
                errorElement.classList.add('show');
                if (submitBtn) submitBtn.classList.remove('btn-loading');
                return;
            }
            
            // In a real app, send a password reset email
            // For demo purposes, just show success message
            
            // Show success message
            successElement.classList.add('show');
            
            // Clear form
            resetForm.reset();
            
            // Redirect to login page after 3 seconds
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 3000);
            
            if (submitBtn) submitBtn.classList.remove('btn-loading');
        });
    },
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated: function() {
        try {
            const userData = localStorage.getItem(this.SESSION_KEY);
            if (!userData) return false;
            
            const user = JSON.parse(userData);
            
            // Check if session has expired
            if (user.expiresAt && user.expiresAt < new Date().getTime()) {
                // Session expired, remove it
                localStorage.removeItem(this.SESSION_KEY);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[ERROR] auth-manager.js: Error checking authentication:', error);
            return false;
        }
    },
    
    /**
     * Get current logged in user
     */
    getCurrentUser: function() {
        try {
            const userData = localStorage.getItem(this.SESSION_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('[ERROR] auth-manager.js: Error getting current user:', error);
            return null;
        }
    },
    
    /**
     * Get all users from localStorage
     */
    getUsers: function() {
        try {
            const usersData = localStorage.getItem(this.USERS_KEY);
            return usersData ? JSON.parse(usersData) : [];
        } catch (error) {
            console.error('[ERROR] auth-manager.js: Error getting users:', error);
            return [];
        }
    },
    
    /**
     * Save users to localStorage
     */
    saveUsers: function(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    },
    
    /**
     * Validate password strength
     */
    validatePassword: function(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const minLength = password.length >= 8;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (!minLength) {
            return { valid: false, message: 'Password must be at least 8 characters long.' };
        }
        
        if (!hasUppercase || !hasLowercase || !hasNumber) {
            return { 
                valid: false, 
                message: 'Password must include at least one uppercase letter, one lowercase letter, and one number.' 
            };
        }
        
        return { valid: true };
    },
    
    /**
     * Hash password for security
     */
    hashPassword: function(password) {
        // Simple hashing for demo - in production use bcrypt or similar
        return btoa(password + "BINGO_SALT_" + password.length);
    },
    
    /**
     * Login user
     */
    login: function(email, password, remember = false) {
        console.log('[DEBUG] auth-manager.js: Attempting login for:', email);
        
        try {
            // Get users with detailed logging
            const usersRaw = localStorage.getItem(this.USERS_KEY);
            console.log('[DEBUG] Raw users data from localStorage:', usersRaw);
            const users = this.getUsers();
            console.log('[DEBUG] Users found:', users.length);
            
            // Log each user email for debugging
            users.forEach((user, index) => {
                console.log(`[DEBUG] User ${index}: ${user.email}`);
            });
            
            // Generate the hashed password
            const hashedPassword = this.hashPassword(password);
            console.log('[DEBUG] Hashed password for comparison:', hashedPassword);
            
            // Try to find the user
            const user = users.find(user => user.email === email && user.password === hashedPassword);
            
            if (user) {
                console.log('[DEBUG] Login successful for user:', user.email);
                
                // Set session with expiry
                const sessionUser = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    // Set expiry - 30 days if remember me, 1 day if not
                    expiresAt: new Date().getTime() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000
                };
                
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
                return true;
            }
            
            // Check the fallback storage if localStorage was full
            const fallbackUsers = JSON.parse(sessionStorage.getItem('FALLBACK_' + this.USERS_KEY) || '[]');
            const fallbackUser = fallbackUsers.find(u => u.email === email && u.password === hashedPassword);
            if (fallbackUser) {
                console.log('[DEBUG] Login successful using fallback storage');
                localStorage.setItem(this.SESSION_KEY, JSON.stringify({
                    id: fallbackUser.id,
                    name: fallbackUser.name,
                    email: fallbackUser.email,
                    expiresAt: new Date().getTime() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000
                }));
                return true;
            }
            
            console.log('[DEBUG] Login failed - invalid credentials');
            return false;
        } catch (error) {
            console.error('[ERROR] Login error:', error);
            return false;
        }
    },
    
    /**
     * Register new user
     */
    register: function(firstName, lastName, email, password) {
        console.log('[DEBUG] auth-manager.js: Attempting to register:', email);
        
        try {
            // Test direct localStorage access
            const testKey = 'register_test_' + Date.now();
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            const users = this.getUsers();
            console.log('[DEBUG] Current users before registration:', users.length);
            
            // Check if email already exists
            if (users.some(user => user.email === email)) {
                throw new Error('Email is already registered. Please use a different email or sign in.');
            }
            
            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name: `${firstName} ${lastName}`,
                firstName: firstName,
                lastName: lastName,
                email: email,
                password: this.hashPassword(password),
                createdAt: new Date().toISOString(),
                orders: [],
                wishlist: [],
                addresses: [],
                paymentMethods: []
            };
            
            // Add to users array
            users.push(newUser);
            
            // Save to localStorage with direct key reference
            const usersJSON = JSON.stringify(users);
            localStorage.setItem(this.USERS_KEY, usersJSON);
            
            // Verify the save worked
            const savedUsers = JSON.parse(localStorage.getItem('bingoUsers') || '[]');
            console.log('[DEBUG] Users after registration:', savedUsers.length);
            
            console.log('[DEBUG] Registration successful');
            return newUser;
        } catch (error) {
            console.error('[ERROR] Registration error:', error);
            
            // Try alternative storage method
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                console.log('[DEBUG] localStorage quota exceeded, trying session storage');
                // Try session storage as fallback
                sessionStorage.setItem('FALLBACK_' + this.USERS_KEY, JSON.stringify([{
                    id: Date.now().toString(),
                    email: email,
                    password: this.hashPassword(password),
                    name: `${firstName} ${lastName}`
                }]));
            }
            
            throw error;
        }
    },
    
    /**
     * Logout user
     */
    logout: function() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    },
    
    /**
     * Update user
     */
    updateUser: function(userData) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        const users = this.getUsers();
        const userIndex = users.findIndex(user => user.id === currentUser.id);
        
        if (userIndex === -1) return false;
        
        // Update user data
        users[userIndex] = {
            ...users[userIndex],
            ...userData,
            // Ensure password isn't overwritten unless explicitly provided
            password: userData.password ? this.hashPassword(userData.password) : users[userIndex].password
        };
        
        // Save to localStorage
        this.saveUsers(users);
        
        // Update session
        const sessionUser = {
            id: users[userIndex].id,
            name: users[userIndex].name,
            email: users[userIndex].email,
            expiresAt: currentUser.expiresAt
        };
        
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionUser));
        
        return true;
    },
    
    /**
     * Set up auth modal for popup login/register
     */
    setupAuthModal: function() {
        console.log('[DEBUG] auth-manager.js: Setting up auth modal...');
        
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;
        
        // Get all form containers
        const loginContainer = document.getElementById('login-form-container');
        const registerContainer = document.getElementById('register-form-container');
        const forgotContainer = document.getElementById('forgot-password-container');
        
        // Get navigation links
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const showForgotLink = document.getElementById('show-forgot-password');
        const backToLoginLink = document.getElementById('back-to-login');
        
        // Get close button
        const closeModalBtn = authModal.querySelector('.modal-close');
        
        // Switch between forms function
        const switchForm = (showForm, hideForm1, hideForm2) => {
            hideForm1.style.display = 'none';
            hideForm2.style.display = 'none';
            showForm.style.display = 'block';
            showForm.classList.add('form-fade-in');
        };
        
        // Navigation event listeners
        if (showRegisterLink) {
            showRegisterLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchForm(registerContainer, loginContainer, forgotContainer);
            });
        }
        
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchForm(loginContainer, registerContainer, forgotContainer);
            });
        }
        
        if (showForgotLink) {
            showForgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchForm(forgotContainer, loginContainer, registerContainer);
            });
        }
        
        if (backToLoginLink) {
            backToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                switchForm(loginContainer, registerContainer, forgotContainer);
            });
        }
        
        // Close modal functionality - FIXED
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                // Remove active class
                authModal.classList.remove('active');
                
                // Reset body overflow
                document.body.style.overflow = '';
                
                // Clear all inline styles
                authModal.style.display = '';
                authModal.style.opacity = '';
                authModal.style.visibility = '';
                authModal.style.zIndex = '';
                authModal.style.position = '';
                authModal.style.alignItems = '';
                authModal.style.justifyContent = '';
                authModal.style.width = '';
                authModal.style.height = '';
                authModal.style.backgroundColor = '';
                authModal.style.top = '';
                authModal.style.left = '';
            });
        }
        
        // Close when clicking outside the modal content
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                // Remove active class
                authModal.classList.remove('active');
                
                // Reset body overflow
                document.body.style.overflow = '';
                
                // Clear all inline styles
                authModal.style.display = '';
                authModal.style.opacity = '';
                authModal.style.visibility = '';
                authModal.style.zIndex = '';
                authModal.style.position = '';
                authModal.style.alignItems = '';
                authModal.style.justifyContent = '';
                authModal.style.width = '';
                authModal.style.height = '';
                authModal.style.backgroundColor = '';
                authModal.style.top = '';
                authModal.style.left = '';
            }
        });
        
        // Add escape key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && authModal.classList.contains('active')) {
                // Remove active class
                authModal.classList.remove('active');
                
                // Reset body overflow
                document.body.style.overflow = '';
                
                // Clear all inline styles
                authModal.style.display = '';
                authModal.style.opacity = '';
                authModal.style.visibility = '';
                authModal.style.zIndex = '';
                authModal.style.position = '';
                authModal.style.alignItems = '';
                authModal.style.justifyContent = '';
                authModal.style.width = '';
                authModal.style.height = '';
                authModal.style.backgroundColor = '';
                authModal.style.top = '';
                authModal.style.left = '';
            }
        });
        
        // Set up modal login form - FIXED
        const self = this;
        const modalLoginForm = document.getElementById('modal-login-form');
        if (modalLoginForm) {
            modalLoginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form values
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const remember = document.getElementById('login-remember').checked;
                const submitBtn = modalLoginForm.querySelector('button[type="submit"]');
                
                // Show loading state
                submitBtn.classList.add('btn-loading');
                
                console.log('[DEBUG] auth-manager.js: Processing modal login for:', email);
                
                // Small delay to simulate network request
                setTimeout(function() {
                    try {
                        // FIXED: Use window.AuthManager instead of this
                        if (window.AuthManager.login(email, password, remember)) {
                            console.log('[DEBUG] auth-manager.js: Modal login successful');
                            
                            // Success, close modal and refresh the current page
                            authModal.classList.remove('active');
                            document.body.style.overflow = '';
                            
                            // Clear all inline styles
                            authModal.style.display = '';
                            authModal.style.opacity = '';
                            authModal.style.visibility = '';
                            authModal.style.zIndex = '';
                            authModal.style.position = '';
                            authModal.style.alignItems = '';
                            authModal.style.justifyContent = '';
                            authModal.style.width = '';
                            authModal.style.height = '';
                            authModal.style.backgroundColor = '';
                            authModal.style.top = '';
                            authModal.style.left = '';
                            
                            // Fire a custom event to notify other parts of the app
                            const event = new CustomEvent('userAuthenticated');
                            document.dispatchEvent(event);
                            
                            // Refresh cart/wishlist UI
                            if (window.CartManager && typeof window.CartManager.loadCart === 'function') {
                                window.CartManager.loadCart();
                            }
                            if (window.WishlistManager && typeof window.WishlistManager.loadWishlist === 'function') {
                                window.WishlistManager.loadWishlist();
                            }
                            
                            // Show success notification
                            if (window.CartManager && typeof window.CartManager.showNotification === 'function') {
                                window.CartManager.showNotification("Signed in successfully!", "success");
                            }
                        } else {
                            console.log('[DEBUG] auth-manager.js: Modal login failed - invalid credentials');
                            
                            // Show error message
                            const errorElement = document.getElementById('login-error');
                            if (errorElement) {
                                errorElement.classList.add('show');
                                
                                // Hide error after 5 seconds
                                setTimeout(function() {
                                    errorElement.classList.remove('show');
                                }, 5000);
                            }
                        }
                    } catch (error) {
                        console.error('[ERROR] auth-manager.js: Modal login error:', error);
                        
                        // Show error notification
                        if (window.CartManager && typeof window.CartManager.showNotification === 'function') {
                            window.CartManager.showNotification("Login failed: " + error.message, "error");
                        }
                    }
                    
                    // Remove loading state
                    submitBtn.classList.remove('btn-loading');
                }, 500);
            });
        }
        
        // Set up modal register form - FIXED
        const modalRegisterForm = document.getElementById('modal-register-form');
        if (modalRegisterForm) {
            modalRegisterForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Get form values
                const firstName = document.getElementById('register-firstName').value;
                const lastName = document.getElementById('register-lastName').value;
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;
                const confirmPassword = document.getElementById('register-confirmPassword').value;
                
                const errorElement = document.getElementById('register-error');
                const errorMessage = document.getElementById('register-error-message');
                const successElement = document.getElementById('register-success');
                const submitBtn = modalRegisterForm.querySelector('button[type="submit"]');
                
                // Show loading state
                submitBtn.classList.add('btn-loading');
                
                console.log('[DEBUG] auth-manager.js: Processing modal registration for:', email);
                
                // Basic client-side validation
                if (password !== confirmPassword) {
                    errorMessage.textContent = "Passwords do not match.";
                    errorElement.classList.add('show');
                    submitBtn.classList.remove('btn-loading');
                    return;
                }
                
                // Password strength validation
                // FIXED: Use window.AuthManager instead of this
                const passwordValidation = window.AuthManager.validatePassword(password);
                if (!passwordValidation.valid) {
                    errorMessage.textContent = passwordValidation.message;
                    errorElement.classList.add('show');
                    submitBtn.classList.remove('btn-loading');
                    return;
                }
                
                setTimeout(function() {
                    try {
                        // FIXED: Use window.AuthManager instead of this
                        window.AuthManager.register(firstName, lastName, email, password);
                        
                        console.log('[DEBUG] auth-manager.js: Modal registration successful');
                        
                        // Show success message
                        successElement.classList.add('show');
                        errorElement.classList.remove('show');
                        
                        // Clear form
                        modalRegisterForm.reset();
                        
                        // Switch to login form after 1.5 seconds
                        setTimeout(function() {
                            switchForm(loginContainer, registerContainer, forgotContainer);
                            successElement.classList.remove('show');
                        }, 1500);
                        
                    } catch (error) {
                        console.error('[ERROR] auth-manager.js: Modal registration error:', error);
                        
                        // Show error message
                        errorMessage.textContent = error.message;
                        errorElement.classList.add('show');
                    }
                    
                    // Remove loading state
                    submitBtn.classList.remove('btn-loading');
                }, 500);
            });
        }
        
        // Set up modal forgot password form - FIXED
        const modalResetForm = document.getElementById('modal-reset-form');
        if (modalResetForm) {
            modalResetForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('reset-email').value;
                const errorElement = document.getElementById('reset-error');
                const errorMessage = document.getElementById('reset-error-message');
                const successElement = document.getElementById('reset-success');
                const submitBtn = modalResetForm.querySelector('button[type="submit"]');
                
                // Show loading state
                submitBtn.classList.add('btn-loading');
                
                setTimeout(function() {
                    // FIXED: Use window.AuthManager instead of this
                    // Check if user exists
                    const users = window.AuthManager.getUsers();
                    const user = users.find(user => user.email === email);
                    
                    if (!user) {
                        errorMessage.textContent = "Email not found. Please check your email or create a new account.";
                        errorElement.classList.add('show');
                        successElement.classList.remove('show');
                        submitBtn.classList.remove('btn-loading');
                        return;
                    }
                    
                    // In a real app, send a password reset email
                    // For demo purposes, just show success message
                    
                    // Show success message
                    successElement.classList.add('show');
                    errorElement.classList.remove('show');
                    
                    // Clear form
                    modalResetForm.reset();
                    
                    // Switch to login form after 2 seconds
                    setTimeout(function() {
                        switchForm(loginContainer, registerContainer, forgotContainer);
                        successElement.classList.remove('show');
                    }, 2000);
                    
                    // Remove loading state
                    submitBtn.classList.remove('btn-loading');
                }, 500);
            });
        }
    },
    
    /**
     * Show auth modal with specified form
     */
    showAuthModal: function(formToShow = 'login') {
        console.log('[DEBUG] auth-manager.js: Showing auth modal with form:', formToShow);
        
        // First check if modal exists
        let authModal = document.getElementById('auth-modal');
        
        if (!authModal) {
            console.log('[DEBUG] auth-manager.js: Modal not found, injecting it');
            this.injectAuthModal();
            
            // Get the newly created modal
            authModal = document.getElementById('auth-modal');
            
            if (!authModal) {
                console.error('[ERROR] auth-manager.js: Failed to create auth modal');
                return;
            }
            
            // Set up the modal
            this.setupAuthModal();
        }
        
        // Get form containers
        const loginContainer = document.getElementById('login-form-container');
        const registerContainer = document.getElementById('register-form-container');
        const forgotContainer = document.getElementById('forgot-password-container');
        
        if (!loginContainer || !registerContainer || !forgotContainer) {
            console.error('[ERROR] auth-manager.js: Modal form containers not found');
            return;
        }
        
        // Show the requested form
        if (formToShow === 'register') {
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'block';
            forgotContainer.style.display = 'none';
        } else if (formToShow === 'forgot') {
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'none';
            forgotContainer.style.display = 'block';
        } else {
            // Default to login
            loginContainer.style.display = 'block';
            registerContainer.style.display = 'none';
            forgotContainer.style.display = 'none';
        }
        
        // CRITICAL FIX: Force display properties with inline styles
        authModal.style.display = 'flex';
        authModal.style.alignItems = 'center';
        authModal.style.justifyContent = 'center';
        authModal.style.position = 'fixed';
        authModal.style.top = '0';
        authModal.style.left = '0';
        authModal.style.width = '100%';
        authModal.style.height = '100%';
        authModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        authModal.style.opacity = '1';
        authModal.style.visibility = 'visible';
        authModal.style.zIndex = '99999';
        
        // Make sure modal content is visible too
        const modalContent = authModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.display = 'block';
            modalContent.style.opacity = '1';
            modalContent.style.transform = 'scale(1)';
        }
        
        // Now add the active class
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        console.log('[DEBUG] auth-manager.js: Auth modal should now be visible');
    },
    
    /**
     * Close auth modal (helper method)
     */
    closeAuthModal: function() {
        const authModal = document.getElementById('auth-modal');
        if (!authModal) return;
        
        // Remove active class
        authModal.classList.remove('active');
        
        // Reset body overflow
        document.body.style.overflow = '';
        
        // Clear all inline styles
        authModal.style.display = '';
        authModal.style.opacity = '';
        authModal.style.visibility = '';
        authModal.style.zIndex = '';
        authModal.style.position = '';
        authModal.style.alignItems = '';
        authModal.style.justifyContent = '';
        authModal.style.width = '';
        authModal.style.height = '';
        authModal.style.backgroundColor = '';
        authModal.style.top = '';
        authModal.style.left = '';
        
        console.log('[DEBUG] auth-manager.js: Auth modal closed');
    }
};

// Initialize auth manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.AuthManager) {
            window.AuthManager.init();
        }
    });
} else {
    if (window.AuthManager) {
        window.AuthManager.init();
    }
}

console.log('[DEBUG] auth-manager.js: AuthManager object defined');