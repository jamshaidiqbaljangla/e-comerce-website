/**
 * BINGO E-commerce Product Data - Database Integration
 * Fetches product information from API and provides utility functions
 */

// API Configuration
const API_BASE_URL = window.API_BASE || window.location.origin;
const API_ENDPOINTS = {
  products: '/api/products',
  categories: '/api/categories',
  collections: '/api/collections',
  auth: '/api/auth',
  cart: '/api/cart'
};

// Auth token management
function getAuthToken() {
  return localStorage.getItem('adminToken') || localStorage.getItem('authToken');
}

function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

function removeAuthToken() {
  localStorage.removeItem('authToken');
}

// Enhanced API helper function with cache integration
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
    console.log('🔄 Making API request to:', `${API_BASE_URL}/${endpoint}`);
    
    // Check cache first for GET requests
    if (!options.method || options.method === 'GET') {
      const cacheKey = endpoint.includes('/products') ? 'products' : 
                      endpoint.includes('/categories') ? 'categories' : 
                      endpoint.includes('/collections') ? 'collections' : null;
      
      if (cacheKey && window.CacheManager) {
        const cached = window.CacheManager.get(cacheKey);
        if (cached) {
          console.log('✅ Using cached data for:', endpoint);
          return { success: true, data: cached, source: 'cache' };
        }
      }
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API request successful, received:', data?.data?.length || Object.keys(data).length, 'items');
    
    // Cache successful GET requests
    if (data.success && (!options.method || options.method === 'GET')) {
      const cacheKey = endpoint.includes('/products') ? 'products' : 
                      endpoint.includes('/categories') ? 'categories' : 
                      endpoint.includes('/collections') ? 'collections' : null;
      
      if (cacheKey && window.CacheManager && data.data) {
        window.CacheManager.set(cacheKey, data.data);
      }
    }
    
    return data;
  } catch (error) {
    console.warn('⚠️ API Request failed, using fallback mode:', error.message);
    
    // Return fallback data based on endpoint
    if (endpoint.includes('/products')) {
      return { success: true, data: window.PRODUCTS.getFallbackProducts(), source: 'fallback' };
    } else if (endpoint.includes('/categories')) {
      return { success: true, data: window.PRODUCTS.getFallbackCategories(), source: 'fallback' };
    } else if (endpoint.includes('/collections')) {
      return { success: true, data: window.PRODUCTS.getFallbackCollections(), source: 'fallback' };
    }
    
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

  // Fallback data methods
  getFallbackProducts() {
    return [
      // Trending Products
      {
        id: 1,
        name: "Premium Wireless Headphones",
        price: 199.99,
        image: "images/product-1.jpg",
        hoverImage: "images/product-1-hover.jpg",
        category: "electronics",
        description: "High-quality wireless headphones with noise cancellation.",
        trending: true,
        bestseller: false,
        newArrival: false,
        stock: 25
      },
      {
        id: 2,
        name: "Stylish Backpack",
        price: 79.99,
        image: "images/product-2.jpg",
        hoverImage: "images/product-2-hover.jpg",
        category: "accessories",
        description: "Durable and stylish backpack for everyday use.",
        trending: true,
        bestseller: false,
        newArrival: false,
        stock: 15
      },
      // Best Sellers
      {
        id: 3,
        name: "Smart Fitness Tracker",
        price: 149.99,
        image: "images/product-3.jpg",
        hoverImage: "images/product-3-hover.jpg",
        category: "electronics",
        description: "Track your fitness goals with this smart device.",
        trending: false,
        bestseller: true,
        newArrival: false,
        stock: 30
      },
      {
        id: 5,
        name: "Premium Coffee Maker",
        price: 249.99,
        image: "images/product-1.jpg",
        hoverImage: "images/product-1-hover.jpg",
        category: "appliances",
        description: "Premium coffee maker for the perfect brew.",
        trending: false,
        bestseller: true,
        newArrival: false,
        stock: 20
      },
      // New Arrivals
      {
        id: 4,
        name: "Organic Cotton T-Shirt",
        price: 29.99,
        image: "images/product-2.jpg",
        hoverImage: "images/product-2-hover.jpg",
        category: "clothing",
        description: "Comfortable organic cotton t-shirt.",
        trending: false,
        bestseller: false,
        newArrival: true,
        eco: true,
        stock: 50
      },
      {
        id: 6,
        name: "Eco-Friendly Water Bottle",
        price: 24.99,
        image: "images/product-3.jpg",
        hoverImage: "images/product-3-hover.jpg",
        category: "accessories",
        description: "Sustainable water bottle made from recycled materials.",
        trending: false,
        bestseller: false,
        newArrival: true,
        eco: true,
        stock: 100
      }
    ];
  },

  getFallbackCategories() {
    return [
      { id: 1, name: "Electronics", slug: "electronics", description: "Latest tech gadgets" },
      { id: 2, name: "Clothing", slug: "clothing", description: "Fashion and apparel" },
      { id: 3, name: "Accessories", slug: "accessories", description: "Bags, watches, and more" },
      { id: 4, name: "Home & Garden", slug: "home-garden", description: "Home essentials" }
    ];
  },

  getFallbackCollections() {
    return [
      { id: 1, name: "Summer 2025", slug: "summer-2025", description: "Summer essentials" },
      { id: 2, name: "Best Sellers", slug: "bestsellers", description: "Most popular items" },
      { id: 3, name: "New Arrivals", slug: "new-arrivals", description: "Latest products" }
    ];
  },

  // Helper method to get fallback products based on options
  _getFallbackByOptions(options) {
    const allProducts = this.getFallbackProducts();
    
    console.log('[DEBUG] _getFallbackByOptions called with options:', options);
    console.log('[DEBUG] Available products:', allProducts.length);
    
    if (options.trending) {
      const trendingProducts = allProducts.filter(p => p.trending === true);
      console.log('[DEBUG] Filtered trending products:', trendingProducts.length);
      return trendingProducts;
    } else if (options.best_seller) {
      const bestSellerProducts = allProducts.filter(p => p.bestseller === true);
      console.log('[DEBUG] Filtered best seller products:', bestSellerProducts.length);
      return bestSellerProducts;
    } else if (options.new_arrival) {
      const newArrivalProducts = allProducts.filter(p => p.newArrival === true);
      console.log('[DEBUG] Filtered new arrival products:', newArrivalProducts.length);
      return newArrivalProducts;
    }
    
    console.log('[DEBUG] Returning all products:', allProducts.length);
    return allProducts;
  },

  // Helper method to process and fix product data
  _processProductData(product) {
    // Fix image URLs
    if (product.image && !product.image.startsWith('http') && !product.image.startsWith('/')) {
      product.image = 'images/' + product.image.replace(/^\/+/, '');
    }
    if (product.hoverImage && !product.hoverImage.startsWith('http') && !product.hoverImage.startsWith('/')) {
      product.hoverImage = 'images/' + product.hoverImage.replace(/^\/+/, '');
    }
    
    // Process product_images array if exists
    if (Array.isArray(product.product_images)) {
      const primaryRow = product.product_images.find(img => img.image_type === 'primary');
      const galleryRows = product.product_images.filter(img => img.image_type !== 'primary');
      
      // Clean up image URLs and handle base64 data
      const cleanImageUrl = (url) => {
        if (!url) return 'images/placeholder.jpg';
        
        // If it's base64 data and too long, return placeholder
        if (url.includes('data:image/') && url.length > 100) {
          console.warn('Base64 image detected, using placeholder for product:', product.name);
          return 'images/placeholder.jpg';
        }
        
        // Clean up localhost references and extra slashes
        return url.replace(/^\/+/, '').replace(/localhost:3000\/uploads\/+/, '');
      };
      
      product.images = {
        primary: cleanImageUrl(primaryRow?.image_url) || 'images/placeholder.jpg',
        gallery: galleryRows.map(r => cleanImageUrl(r.image_url)).filter(url => url !== 'images/placeholder.jpg')
      };
    } else if (!product.images) {
      // Handle base64 in main image URL
      let mainImage = product.image_url || product.image || 'images/placeholder.jpg';
      if (mainImage.includes('data:image/') && mainImage.length > 100) {
        console.warn('Base64 image detected in main image, using placeholder for product:', product.name);
        mainImage = 'images/placeholder.jpg';
      }
      
      product.images = {
        primary: mainImage,
        gallery: []
      };
    }
    
    // Ensure all image URLs are properly formatted
    if (product.images?.primary) {
      product.images.primary = product.images.primary.replace(/localhost:3000\/uploads\/+/, '').replace(/^\/+/, '');
      if (!product.images.primary.startsWith('images/') && !product.images.primary.startsWith('http') && !product.images.primary.includes('data:image/')) {
        product.images.primary = 'images/' + product.images.primary;
      }
    }
    
    return product;
  },

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
      const response = await apiRequest(API_ENDPOINTS.categories);
      
      // Handle API response format (may have {success: true, data: categories} wrapper)
      const categories = response.data || response;
      
      // Convert to object format for compatibility
      const categoriesObj = {};
      categories.forEach(cat => {
        categoriesObj[cat.id] = { 
          id: cat.id, 
          name: cat.name, 
          slug: cat.slug,
          description: cat.description,
          image_url: cat.image_url
        };
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
   * Load collections from API
   */
  async loadCollections() {
    if (this._cache.collections && this._isCacheValid(this._cache.collectionsTimestamp)) {
      return this._cache.collections;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.collections);
      
      // Handle API response format (may have {success: true, data: collections} wrapper)
      const collections = response.data || response;
      
      this._cache.collections = collections;
      this._cache.collectionsTimestamp = Date.now();
      
      return collections;
    } catch (error) {
      console.error('Error loading collections:', error);
      // Return fallback collections
      return this.getFallbackCollections();
    }
  },

  /**
   * Load all products from API
   */
  /**
   * Load all products from API with optimized caching
   */
  async loadProducts(options = {}) {
    const cacheKey = JSON.stringify(options);
    
    // Check cache first for improved performance
    if (this._cache.requests && this._cache.requests.has(cacheKey) && 
        this._isCacheValid(this._cache.requests.get(cacheKey).timestamp)) {
      console.log(`� Using cached products for: ${cacheKey}`);
      return this._cache.requests.get(cacheKey).data;
    }

    // Check if we can serve from allProducts cache
    if (!options.category && !options.search && !options.trending && !options.best_seller && !options.new_arrival && 
        this._cache.allProducts && this._isCacheValid(this._cache.lastFetch)) {
      console.log('📦 Using cached all products');
      return this._cache.allProducts;
    }

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
      console.log(`🌐 Fetching products from API: ${API_BASE_URL}${endpoint}`);
      console.log(`🔍 Query params: ${queryParams.toString() || 'none'}`);
      
      const response = await apiRequest(endpoint);
      console.log('📦 API Response received:', response);
      
      // Handle API response format (may have {success: true, data: products} wrapper)
      const products = response.data || response;
      console.log('🎯 Products extracted:', products?.length || 0, 'items');

      // Process products and fix image URLs
      const processedProducts = products.map(product => this._processProductData(product));

      // Cache all products if no specific filters
      if (!options.category && !options.search && !options.trending && !options.best_seller && !options.new_arrival) {
        this._cache.allProducts = processedProducts;
        this._cache.lastFetch = Date.now();
      }

      // Cache this specific request
      if (!this._cache.requests) this._cache.requests = new Map();
      this._cache.requests.set(cacheKey, {
        data: processedProducts,
        timestamp: Date.now()
      });

      // Cache individual products
      processedProducts.forEach(product => {
        this._cache.products.set(product.id, product);
      });

      return processedProducts;
    } catch (error) {
      console.error('🔥 Error loading products:', error);
      
      // Return fallback data for better UX
      return this._getFallbackByOptions(options);
    }
  },

  /**
   * Get product by ID with improved error handling
   */
  async getProductById(productId) {
    // Check cache first
    if (this._cache.products.has(productId)) {
      return this._cache.products.get(productId);
    }

    try {
      const response = await apiRequest(`${API_ENDPOINTS.products}/${productId}`);
      
      // Handle API response format (may have {success: true, data: product} wrapper)
      const product = response.data || response;
      
      // Process product data using helper method
      const processedProduct = this._processProductData(product);

      // Cache the product
      this._cache.products.set(productId, processedProduct);

      return processedProduct;
    } catch (error) {
      console.error('🔥 Error loading product:', error);
      
      // Return fallback product if available
      const fallbackProducts = this.getFallbackProducts();
      const fallbackProduct = fallbackProducts.find(p => p.id == productId);
      
      if (fallbackProduct) {
        return this._processProductData(fallbackProduct);
      }
      
      return null;
    }
  },

  /**
   * Clear cache (useful for admin operations or data updates)
   */
  clearCache() {
    this._cache = {
      products: new Map(),
      categories: null,
      collections: null,
      allProducts: null,
      requests: new Map(),
      lastFetch: null,
      categoriesTimestamp: null,
      collectionsTimestamp: null
    };
    debugLog.log('products', 'Cache cleared');
  },

  /**
   * Initialize products data with efficient loading
   */
  async init() {
    try {
      debugLog.log('products', 'Initializing ProductsData...');
      
      // Load essential data in parallel
      const [categories, collections] = await Promise.all([
        this.loadCategories().catch(err => {
          debugLog.warn('products', 'Failed to load categories:', err);
          return {};
        }),
        this.loadCollections().catch(err => {
          debugLog.warn('products', 'Failed to load collections:', err);
          return [];
        })
      ]);

      debugLog.log('products', 'ProductsData initialized successfully');
      return { categories, collections };
    } catch (error) {
      debugLog.error('products', 'Failed to initialize ProductsData:', error);
      throw error;
    }
  },
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
