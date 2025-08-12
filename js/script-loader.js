/**
 * Script Bundle Manager
 * This script helps manage the loading of JS files efficiently
 */

// Define our script modules and dependencies
const scriptModules = {
    'core': [
        'js/auth-manager.js',
        'js/offline-handler.js'
    ],
    'product': [
        'js/fallback-products.js',
        'js/products-data.js',
        'js/product-renderer.js'
    ],
    'shop': [
        'js/category-data.js',
        'js/shop-manager.js',
        'js/category.js',
        'js/collection-manager.js'
    ],
    'cart': [
        'js/cart-manager.js',
        'js/wishlist-manager.js'
    ],
    'account': [
        'js/account-manager.js'
    ],
    'search': [
        'js/search-manager.js'
    ],
    'debug': [
        'js/debug-config.js'
    ],
    'main': [
        'js/main.js'
    ]
};

// Function to load scripts in parallel within a group, but groups sequentially
const loadScriptGroup = (group, onComplete) => {
    if (!scriptModules[group] || scriptModules[group].length === 0) {
        if (onComplete) onComplete();
        return;
    }
    
    let loaded = 0;
    const totalScripts = scriptModules[group].length;
    
    // Handle when all scripts in this group are loaded
    const checkAllLoaded = () => {
        loaded++;
        if (loaded === totalScripts && onComplete) {
            onComplete();
        }
    };
    
    // Load each script in this group
    scriptModules[group].forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        
        script.onload = checkAllLoaded;
        script.onerror = () => {
            console.error(`Failed to load script: ${src}`);
            checkAllLoaded();
        };
        
        document.body.appendChild(script);
    });
};

// Function to load script groups in sequence (dependency order)
const loadBundles = () => {
    // Define the loading sequence based on dependencies
    const sequence = ['core', 'product', 'shop', 'cart', 'account', 'search', 'debug', 'main'];
    let currentIndex = 0;
    
    const loadNextBundle = () => {
        if (currentIndex >= sequence.length) return;
        
        const bundle = sequence[currentIndex++];
        loadScriptGroup(bundle, loadNextBundle);
    };
    
    // Start the loading sequence
    loadNextBundle();
};

// Initialize loading after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBundles);
} else {
    loadBundles();
}
