document.addEventListener('DOMContentLoaded', function () {
    // Ensure API_BASE is available
    if (!window.API_BASE) {
        console.error('❌ API_BASE not configured. Please ensure config.js is loaded first.');
        return;
    }

    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser'));

    if (!token || !user || user.role !== 'admin') {
        // If not on the login page, redirect to login
        if (!window.location.pathname.endsWith('admin-login.html')) {
            window.location.href = 'admin-login.html';
        }
        return;
    }

    // If already on the login page and authenticated, redirect to the dashboard
    if (window.location.pathname.endsWith('admin-login.html')) {
        window.location.href = 'admin.html';
        return;
    }

    // Attach token to all subsequent API requests
    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
        const newOptions = { ...options };
        if (!newOptions.headers) {
            newOptions.headers = {};
        }
        newOptions.headers['Authorization'] = `Bearer ${token}`;
        
        // Construct the full URL using the global API_BASE with fallback
        const apiBase = window.API_BASE || window.location.origin || 'https://ubiquitous-meringue-b2611a.netlify.app';
        const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`;
        
        return originalFetch(fullUrl, newOptions);
    };

    // Handle logout
    const logoutButton = document.querySelector('a[href="logout.html"]');
    if (logoutButton) {
        logoutButton.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            // Clear app cache on logout
            if (window.APP_CACHE) {
                window.APP_CACHE.clearCache();
            }
            window.location.href = 'admin-login.html';
        });
    }
});
