// Enhanced admin authentication with security improvements
class AdminAuth {
    constructor() {
        this.API_BASE = '/api';
        this.setupAuthInterceptor();
        this.setupRefreshTokenTimer();
        this.setupCSRFProtection();
    }

    // Initialize authentication state
    init() {
        const token = this.getToken();
        const user = this.getUser();

        if (!token || !user || user.role !== 'admin') {
            this.redirectToLogin();
            return false;
        }

        if (window.location.pathname.endsWith('admin-login.html')) {
            window.location.href = 'admin.html';
            return false;
        }

        return true;
    }

    // Set up CSRF protection
    setupCSRFProtection() {
        // Get CSRF token from meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            this.csrfToken = csrfToken;
        }
    }

    // Set up authentication interceptor
    setupAuthInterceptor() {
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            const newOptions = { ...options };
            if (!newOptions.headers) {
                newOptions.headers = {};
            }

            // Add auth token
            const token = this.getToken();
            if (token) {
                newOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            // Add CSRF token
            if (this.csrfToken) {
                newOptions.headers['X-CSRF-Token'] = this.csrfToken;
            }

            try {
                const response = await originalFetch(url, newOptions);
                
                // Handle 401 (Unauthorized)
                if (response.status === 401) {
                    const refreshed = await this.refreshToken();
                    if (refreshed) {
                        // Retry original request with new token
                        newOptions.headers['Authorization'] = `Bearer ${this.getToken()}`;
                        return originalFetch(url, newOptions);
                    } else {
                        this.logout();
                        throw new Error('Authentication failed');
                    }
                }
                
                return response;
            } catch (error) {
                if (error.message === 'Network Error') {
                    this.showError('Network connection lost. Please check your internet connection.');
                }
                throw error;
            }
        };
    }

    // Set up refresh token timer
    setupRefreshTokenTimer() {
        // Refresh token 5 minutes before expiry
        setInterval(async () => {
            const token = this.getToken();
            if (token) {
                const payload = this.parseJWT(token);
                const expiryTime = payload.exp * 1000; // Convert to milliseconds
                const currentTime = Date.now();
                const fiveMinutes = 5 * 60 * 1000;

                if (expiryTime - currentTime < fiveMinutes) {
                    await this.refreshToken();
                }
            }
        }, 60000); // Check every minute
    }

    // Parse JWT token
    parseJWT(token) {
        try {
            return JSON.parse(atob(token.split('.')[1]));
        } catch (e) {
            return null;
        }
    }

    // Get authentication token
    getToken() {
        return localStorage.getItem('adminAuthToken');
    }

    // Get user data
    getUser() {
        try {
            return JSON.parse(localStorage.getItem('adminUser'));
        } catch {
            return null;
        }
    }

    // Refresh authentication token
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('adminRefreshToken');
            if (!refreshToken) return false;

            const response = await fetch(`${this.API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) return false;

            const data = await response.json();
            localStorage.setItem('adminAuthToken', data.token);
            localStorage.setItem('adminRefreshToken', data.refreshToken);
            return true;
        } catch {
            return false;
        }
    }

    // Handle logout
    logout() {
        localStorage.removeItem('adminAuthToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        this.redirectToLogin();
    }

    // Redirect to login page
    redirectToLogin() {
        if (!window.location.pathname.endsWith('admin-login.html')) {
            window.location.href = 'admin-login.html';
        }
    }

    // Show error message
    showError(message) {
        const event = new CustomEvent('admin-error', { detail: message });
        window.dispatchEvent(event);
    }
}

// Initialize admin authentication
const adminAuth = new AdminAuth();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => adminAuth.init());
} else {
    adminAuth.init();
}
