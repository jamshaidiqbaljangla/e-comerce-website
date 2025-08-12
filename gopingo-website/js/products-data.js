/**
 * BINGO E-commerce Product Data - Database Integration
 * Fetches product information from API and provides utility functions
 */

// API Configuration
// hard‐code your API server's origin:
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINTS = {
  products: '/api/products',
  categories: '/api/categories',
  auth: '/api/auth',
  cart: '/api/cart'
};

// Auth token management
function getAuthToken() {
  return localStorage.getItem('authToken');
}

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function removeAuthToken() {
  localStorage.removeItem('authToken');
}

// API helper function
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...options
  };

  try {
  console.log('🔄 Making API request to:', `${API_BASE_URL}${endpoint}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('✅ API request successful, received:', data?.length || Object.keys(data).length, 'items');
  return data;
} catch (error) {
  console.error('❌ API Request failed:', error);
  throw error;
}
}

// Products API Manager
window.PRODUCTS = {
  // Cache for categories and products
  _cache: {
    categories: null,
    products: new Map(),
    allProducts: null,
    lastFetch: null
  },

  // Cache duration (5 minutes)
  CACHE_DURATION: 5 * 60 * 1000,

  /**
   * Check if cache is valid
   */
  _isCacheValid(timestamp) {
    return timestamp && (Date.now() - timestamp) < this.CACHE_DURATION;
  },

  /**
   * Load categories from API
   */
  async loadCategories() {
    if (this._cache.categories && this._isCacheValid(this._cache.categoriesTimestamp)) {
      return this._cache.categories;
    }

    try {
      const categories = await apiRequest(API_ENDPOINTS.categories);
      
      // Convert to object format for compatibility
      const categoriesObj = {};
      categories.forEach(cat => {
        categoriesObj[cat.id] = { id: cat.id, name: cat.name };
      });

      this._cache.categories = categoriesObj;
      this._cache.categoriesTimestamp = Date.now();
      
      return categoriesObj;
    } catch (error) {
      console.error('Error loading categories:', error);
      // Return fallback categories
      return {
        'premium': { id: 'premium', name: 'Premium' },
        'lifestyle': { id: 'lifestyle', name: 'Lifestyle' },
        'limited': { id: 'limited', name: 'Limited' },
        'collection': { id: 'collection', name: 'Collection' },
        'new-season': { id: 'new-season', name: 'New Season' },
        'essentials': { id: 'essentials', name: 'Essentials' },
        'trending': { id: 'trending', name: 'Trending' }
      };
    }
  },

  /**
   * Load all products from API
   */
  /**
 * Load all products from API
 */
async loadProducts(options = {}) {
  const cacheKey = JSON.stringify(options);
  
  // DISABLE CACHING FOR NOW (can re-enable later with proper cache invalidation)
  console.log('🔄 Loading fresh product data (cache disabled)');
  
  // if (!options.trending && !options.best_seller && !options.new_arrival && !options.search && !options.force && 
  //     this._cache.allProducts && this._isCacheValid(this._cache.lastFetch)) {
  //   return this._cache.allProducts;
  // }

    try {
      const queryParams = new URLSearchParams();
      
      if (options.category) queryParams.append('category', options.category);
      if (options.trending) queryParams.append('trending', 'true');
      if (options.best_seller) queryParams.append('best_seller', 'true');
      if (options.new_arrival) queryParams.append('new_arrival', 'true');
      if (options.search) queryParams.append('search', options.search);
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.offset) queryParams.append('offset', options.offset);

      const endpoint = `${API_ENDPOINTS.products}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const products = await apiRequest(endpoint);

// ─── map new product_images rows into product.images ───
// Process product images - map new product_images rows into product.images
products.forEach(product => {
  if (Array.isArray(product.product_images)) {
    const primaryRow = product.product_images.find(img => img.image_type === 'primary');
    const galleryRows = product.product_images.filter(img => img.image_type !== 'primary');
    
    product.images = {
      primary: primaryRow 
        ? primaryRow.image_url 
        : (product.image_url || 'images/placeholder.jpg'),
      gallery: galleryRows.map(r => r.image_url)
    };
  } else if (!product.images) {
    // fallback for legacy flat image_url or if no images exist
    product.images = {
      primary: product.image_url || 'images/placeholder.jpg',
      gallery: []
    };
  }

  // Ensure image URLs are properly formatted
  if (product.images.primary && !product.images.primary.startsWith('http')) {
    if (!product.images.primary.startsWith('/')) {
      product.images.primary = '/' + product.images.primary;
    }
  }

  product.images.gallery = product.images.gallery.map(url => {
    if (url && !url.startsWith('http') && !url.startsWith('/')) {
      return '/' + url;
    }
    return url;
  });
});
// ────────────────────────────────────────────────────────


      // Cache all products if no specific filters
      // Cache all products if no specific filters
if (!options.category && !options.search && !options.trending && !options.best_seller && !options.new_arrival) {
  this._cache.allProducts = products;
  this._cache.lastFetch = Date.now();
}

      // Cache individual products
      products.forEach(product => {
        this._cache.products.set(product.id, product);
      });

      return products;
    } catch (error) {
      console.error('Error loading products:', error);
      
      // Return empty array on error
      return [];
    }
  },

  /**
   * Get product by ID
   */
  async getProductById(productId) {
    // Check cache first
    if (this._cache.products.has(productId)) {
      return this._cache.products.get(productId);
    }

    try {
         const product = await apiRequest(`${API_ENDPOINTS.products}/${productId}`);

// ─── map product_images rows into product.images ───
    if (Array.isArray(product.product_images)) {
      const primaryRow  = product.product_images.find(img => img.image_type === 'primary');
      const galleryRows = product.product_images.filter(img => img.image_type !== 'primary');
      product.images = {
        primary: primaryRow
          ? primaryRow.image_url
          : (product.image_url || 'images/placeholder.jpg'),
        gallery: galleryRows.map(r => r.image_url)
      };
    } else if (!product.images) {
      // fallback if you still have a flat image_url field
      product.images = {
        primary: product.image_url || 'images/placeholder.jpg',
        gallery: []
      };
    }
// ─────────────────────────────────────────────────────

    // Cache the product
    this._cache.products.set(productId, product);

    return product;

    } catch (error) {
      console.error('Error loading product:', error);
      return null;
    }
  },

  /**
   * Get trending products
   */
  async getTrendingProducts(limit = 4) {
    try {
      return await this.loadProducts({ trending: true, limit });
    } catch (error) {
      console.error('Error loading trending products:', error);
      return [];
    }
  },

  /**
   * Get best sellers
   */
  async getBestSellers(limit = 4) {
    try {
      return await this.loadProducts({ best_seller: true, limit });
    } catch (error) {
      console.error('Error loading best sellers:', error);
      return [];
    }
  },

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit = 4) {
    try {
      return await this.loadProducts({ new_arrival: true, limit });
    } catch (error) {
      console.error('Error loading new arrivals:', error);
      return [];
    }
  },

  /**
   * Search products
   */
  async searchProducts(query, options = {}) {
    try {
      return await this.loadProducts({ search: query, ...options });
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  /**
   * Format price utility
   */
  formatPrice(price) {
    return '$' + parseFloat(price).toFixed(2);
  },

  /**
   * Clear cache (useful for admin updates)
   */
  clearCache() {
    this._cache = {
      categories: null,
      products: new Map(),
      allProducts: null,
      lastFetch: null
    };
  },

  /**
   * Initialize - load initial data
   */
  async init() {
    console.log('[DEBUG] PRODUCTS API: Initializing...');
    
    try {
      // Load categories first
      this.categories = await this.loadCategories();
      
      // Load initial products
      this.items = await this.loadProducts({ limit: 20 });
      
      console.log('[DEBUG] PRODUCTS API: Initialized successfully with', this.items.length, 'products');
      return true;
    } catch (error) {
      console.error('[ERROR] PRODUCTS API: Initialization failed:', error);
      
      // Fallback to empty state
      this.categories = {};
      this.items = [];
      return false;
    }
  }
};

// Authentication API Manager
window.AUTH_API = {
  /**
   * Register new user
   */
  async register(firstName, lastName, email, password) {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.auth}/register`, {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, password })
      });

      if (response.token) {
        setAuthToken(response.token);
      }

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  /**
   * Login user
   */
  async login(email, password) {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.auth}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.token) {
        setAuthToken(response.token);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout() {
    removeAuthToken();
    // Clear product cache on logout
    window.PRODUCTS.clearCache();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!getAuthToken();
  }
};

// Cart API Manager
window.CART_API = {
  /**
   * Get user's cart
   */
  async getCart() {
    try {
      return await apiRequest(API_ENDPOINTS.cart);
    } catch (error) {
      console.error('Error fetching cart:', error);
      return { items: [], subtotal: 0, shipping: 0, total: 0 };
    }
  },

  /**
   * Add item to cart
   */
  async addToCart(productId, quantity = 1) {
    try {
      return await apiRequest(API_ENDPOINTS.cart, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  /**
   * Update cart item quantity
   */
  async updateCartItem(productId, quantity) {
    try {
      return await apiRequest(`${API_ENDPOINTS.cart}/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity })
      });
    } catch (error) {
      console.error('Error updating cart:', error);
      throw error;
    }
  },

  /**
   * Remove item from cart
   */
  async removeFromCart(productId) {
    try {
      return await apiRequest(`${API_ENDPOINTS.cart}/${productId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }
};

// Admin API Manager (for admin panel)
window.ADMIN_API = {
  /**
   * Create product
   */
  async createProduct(productData) {
    try {
      const response = await apiRequest(API_ENDPOINTS.products, {
        method: 'POST',
        body: JSON.stringify(productData)
      });
      
      // Clear cache to refresh data
      window.PRODUCTS.clearCache();
      
      return response;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  /**
   * Update product
   */
  async updateProduct(productId, productData) {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.products}/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData)
      });
      
      // Clear cache to refresh data
      window.PRODUCTS.clearCache();
      
      return response;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  },

  /**
   * Delete product
   */
  async deleteProduct(productId) {
    try {
      const response = await apiRequest(`${API_ENDPOINTS.products}/${productId}`, {
        method: 'DELETE'
      });
      
      // Clear cache to refresh data
      window.PRODUCTS.clearCache();
      
      return response;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    window.PRODUCTS.init();
  });
} else {
  // DOM already loaded
  window.PRODUCTS.init();
}

console.log('[DEBUG] products-data.js: API integration loaded');