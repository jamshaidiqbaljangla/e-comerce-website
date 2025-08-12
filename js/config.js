// js/config.js

// Centralized API configuration for consistent endpoint access
// Ensure API_BASE is never null/undefined
window.API_BASE = window.location.origin || 'https://ubiquitous-meringue-b2611a.netlify.app';

// Environment-specific configuration
if (window.location.hostname.includes('netlify.app')) {
  window.API_BASE = 'https://ubiquitous-meringue-b2611a.netlify.app';
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // For local development, use the PostgreSQL server on port 3002
  window.API_BASE = 'http://localhost:3002';
}

// Cache management for data synchronization
window.APP_CACHE = {
  lastUpdated: null,
  products: null,
  categories: null,
  collections: null,
  clearCache: function() {
    this.lastUpdated = null;
    this.products = null;
    this.categories = null;
    this.collections = null;
  }
};

console.log('🔧 API Base URL configured:', API_BASE);
