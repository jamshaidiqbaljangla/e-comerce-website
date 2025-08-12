/**
 * Cache Management System for Data Synchronization
 * Handles cache invalidation when admin makes changes
 */

window.CacheManager = {
    // Cache keys
    CACHE_KEYS: {
        PRODUCTS: 'app_products_cache',
        CATEGORIES: 'app_categories_cache',
        COLLECTIONS: 'app_collections_cache',
        LAST_UPDATE: 'app_last_update'
    },

    // Cache duration (5 minutes)
    CACHE_DURATION: 5 * 60 * 1000,

    // Clear all caches
    clearAll() {
        Object.values(this.CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        // Clear in-memory cache if available
        if (window.APP_CACHE) {
            window.APP_CACHE.clearCache();
        }
        
        console.log('🧹 All caches cleared');
    },

    // Clear specific cache
    clear(type) {
        const key = this.CACHE_KEYS[type.toUpperCase()];
        if (key) {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            console.log(`🧹 ${type} cache cleared`);
        }
    },

    // Check if cache is valid
    isValid(type) {
        const lastUpdate = localStorage.getItem(this.CACHE_KEYS.LAST_UPDATE);
        if (!lastUpdate) return false;
        
        const timeDiff = Date.now() - parseInt(lastUpdate);
        return timeDiff < this.CACHE_DURATION;
    },

    // Set cache with timestamp
    set(type, data) {
        const key = this.CACHE_KEYS[type.toUpperCase()];
        if (key) {
            localStorage.setItem(key, JSON.stringify(data));
            localStorage.setItem(this.CACHE_KEYS.LAST_UPDATE, Date.now().toString());
        }
    },

    // Get cached data
    get(type) {
        if (!this.isValid(type)) {
            this.clear(type);
            return null;
        }
        
        const key = this.CACHE_KEYS[type.toUpperCase()];
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
    },

    // Force refresh data from API
    async refresh(type) {
        this.clear(type);
        
        try {
            let endpoint = '';
            switch (type.toLowerCase()) {
                case 'products':
                    endpoint = '/api/products';
                    break;
                case 'categories':
                    endpoint = '/api/categories';
                    break;
                case 'collections':
                    endpoint = '/api/collections';
                    break;
                default:
                    return null;
            }

            const response = await fetch(`${window.API_BASE}${endpoint}`);
            const result = await response.json();
            
            if (result.success) {
                this.set(type, result.data);
                return result.data;
            }
        } catch (error) {
            console.error(`Failed to refresh ${type}:`, error);
        }
        
        return null;
    },

    // Admin change notification
    notifyChange(type, action, data) {
        console.log(`📢 Admin change detected: ${action} ${type}`, data);
        
        // Clear related caches
        this.clear(type);
        
        // If it's a product change, also clear categories cache
        if (type.toLowerCase() === 'products') {
            this.clear('categories');
        }
        
        // Broadcast to other tabs/windows
        this.broadcastChange(type, action, data);
        
        // Trigger refresh on main website if in admin panel
        if (window.location.pathname.includes('admin-')) {
            this.refreshMainWebsite();
        }
    },

    // Broadcast changes to other tabs
    broadcastChange(type, action, data) {
        const message = {
            type: 'cache_invalidation',
            dataType: type,
            action: action,
            data: data,
            timestamp: Date.now()
        };
        
        localStorage.setItem('admin_changes', JSON.stringify(message));
        
        // Use storage event for cross-tab communication
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'admin_changes',
            newValue: JSON.stringify(message)
        }));
    },

    // Listen for admin changes
    listenForChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'admin_changes') {
                const message = JSON.parse(e.newValue);
                console.log('📡 Received admin change notification:', message);
                
                // Clear relevant caches
                this.clear(message.dataType);
                
                // Trigger UI refresh
                this.triggerUIRefresh(message.dataType);
            }
        });
    },

    // Trigger UI refresh
    triggerUIRefresh(type) {
        // Refresh product listings
        if (type.toLowerCase() === 'products' && window.ProductRenderer) {
            setTimeout(() => {
                window.ProductRenderer.loadProducts();
            }, 500);
        }
        
        // Refresh categories
        if (type.toLowerCase() === 'categories' && window.CategoryManager) {
            setTimeout(() => {
                window.CategoryManager.loadCategories();
            }, 500);
        }
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('dataUpdated', {
            detail: { type: type }
        }));
    },

    // Refresh main website (for admin use)
    refreshMainWebsite() {
        // If there's a main website tab open, try to refresh it
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.location.reload();
            }
        } catch (error) {
            // Cross-origin restrictions, ignore
        }
    },

    // Initialize cache manager
    init() {
        this.listenForChanges();
        console.log('🚀 Cache Manager initialized');
        
        // Clean old caches on startup
        const lastUpdate = localStorage.getItem(this.CACHE_KEYS.LAST_UPDATE);
        if (lastUpdate) {
            const timeDiff = Date.now() - parseInt(lastUpdate);
            if (timeDiff > this.CACHE_DURATION * 2) {
                this.clearAll();
                console.log('🧹 Cleared expired caches on startup');
            }
        }
    }
};

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    window.CacheManager.init();
});
