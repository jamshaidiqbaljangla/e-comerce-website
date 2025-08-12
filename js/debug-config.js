// Debug Configuration for controlling console output
window.DEBUG_CONFIG = {
    // Global debug flag - set to false in production
    enabled: false,
    
    // Specific module debug flags
    modules: {
        main: false,
        products: false,
        cart: false,
        auth: false,
        wishlist: false,
        collections: false,
        shop: false
    },
    
    // Log levels
    levels: {
        error: true,    // Always show errors
        warn: true,     // Always show warnings
        info: false,    // Conditional info
        debug: false    // Conditional debug
    }
};

// Enhanced console wrapper with debug control
window.debugLog = {
    log: (module, message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && 
            (window.DEBUG_CONFIG.modules[module] || window.DEBUG_CONFIG.levels.debug)) {
            console.log(`[${module.toUpperCase()}] ${message}`, ...args);
        }
    },
    
    info: (module, message, ...args) => {
        if (window.DEBUG_CONFIG.enabled && 
            (window.DEBUG_CONFIG.modules[module] || window.DEBUG_CONFIG.levels.info)) {
            console.info(`[${module.toUpperCase()}] ${message}`, ...args);
        }
    },
    
    warn: (module, message, ...args) => {
        if (window.DEBUG_CONFIG.levels.warn) {
            console.warn(`[${module.toUpperCase()}] ${message}`, ...args);
        }
    },
    
    error: (module, message, ...args) => {
        if (window.DEBUG_CONFIG.levels.error) {
            console.error(`[${module.toUpperCase()}] ${message}`, ...args);
        }
    }
};

// Quick debug toggle function for development
window.toggleDebug = (enabled = null) => {
    if (enabled === null) {
        window.DEBUG_CONFIG.enabled = !window.DEBUG_CONFIG.enabled;
    } else {
        window.DEBUG_CONFIG.enabled = enabled;
    }
    console.log(`Debug mode: ${window.DEBUG_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}`);
};

// Enable specific module debugging
window.enableModuleDebug = (module) => {
    window.DEBUG_CONFIG.modules[module] = true;
    console.log(`Debug enabled for module: ${module}`);
};
