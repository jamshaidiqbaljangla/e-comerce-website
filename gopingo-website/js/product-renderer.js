/**
 * product-renderer.js
 * BINGO E-commerce Dynamic Product Renderer - Fixed Version
 */

window.ProductRenderer = {
  /**
   * Initialize the renderer (called from main.js)
   */
  init: function() {
    console.log('[DEBUG] product-renderer.js: ProductRenderer.init() called.');
    if (typeof PRODUCTS === 'undefined') {
      console.error('[DEBUG] product-renderer.js: PRODUCTS API not available for init.');
      return;
    }
    
    // Render the "Trending" tab on page load with a small delay to ensure PRODUCTS is ready
    setTimeout(() => {
      this.renderFeaturedProducts();
    }, 100);
  },

  /**
   * Format image URL to ensure it's properly accessible
   */
  formatImageUrl: function(imageUrl) {
    if (!imageUrl) {
      return 'images/placeholder.jpg';
    }
    
    // If it's already a full URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it starts with /uploads/, prepend server base URL
    if (imageUrl.startsWith('/uploads/')) {
      return `http://localhost:3000${imageUrl}`;
    }
    
    // If it starts with /, it's an absolute path from server root
    if (imageUrl.startsWith('/')) {
      return `http://localhost:3000${imageUrl}`;
    }
    
    // Otherwise assume it's a relative path from images folder
    return imageUrl;
  },

  /**
   * Normalize product data to handle different API response formats
   */
  normalizeProduct: function(product) {
    return {
      id: product.id || ('unknown-' + Date.now()),
      name: product.name || 'Unnamed Product',
      price: product.price != null ? product.price : 0,
      oldPrice: product.old_price || product.oldPrice,
      // Handle both inStock and in_stock properties
      inStock: product.inStock !== undefined ? product.inStock : (product.in_stock !== false),
      // Handle different image structures
      images: {
        primary: this.getProductImage(product, 'primary'),
        gallery: this.getProductImages(product, 'gallery')
      },
      categories: Array.isArray(product.categories) ? product.categories : [],
      reviewCount: product.reviewCount || product.review_count || 0,
      rating: product.rating || 0,
      quantity: product.quantity || 0
    };
  },

  /**
   * Get primary or fallback image for a product
   */
  getProductImage: function(product, type = 'primary') {
    // Check new API structure
    if (product.images && product.images[type]) {
      return this.formatImageUrl(product.images[type]);
    }
    
    // Check product_images array structure
    if (Array.isArray(product.product_images)) {
      const imageRow = product.product_images.find(img => img.image_type === type);
      if (imageRow && imageRow.image_url) {
        return this.formatImageUrl(imageRow.image_url);
      }
    }
    
    // Check legacy image_url field
    if (product.image_url) {
      return this.formatImageUrl(product.image_url);
    }
    
    // Default placeholder
    return this.formatImageUrl('images/placeholder.jpg');
  },

  /**
   * Get gallery images for a product
   */
  getProductImages: function(product, type = 'gallery') {
    let images = [];
    
    // Check new API structure
    if (product.images && Array.isArray(product.images[type])) {
      images = product.images[type];
    }
    // Check product_images array structure
    else if (Array.isArray(product.product_images)) {
      images = product.product_images
        .filter(img => img.image_type === type || img.image_type !== 'primary')
        .map(img => img.image_url);
    }
    
    return images.map(url => this.formatImageUrl(url));
  },

  /**
   * Build a single product card's HTML
   */
  createProductCard: function(product) {
    console.log('[DEBUG] product-renderer.js: createProductCard() for', product.id);
    
    // Normalize the product data
    const normalizedProduct = this.normalizeProduct(product);
    
    const productId = normalizedProduct.id;
    const name = normalizedProduct.name;
    const priceHtml = normalizedProduct.price != null ? PRODUCTS.formatPrice(normalizedProduct.price) : '$0.00';
    const inStock = normalizedProduct.inStock && normalizedProduct.quantity > 0;
    
    // Get images with fallbacks
    const primaryImage = normalizedProduct.images.primary;
    const hoverImage = normalizedProduct.images.gallery.length > 0 
      ? normalizedProduct.images.gallery[0] 
      : primaryImage;
    
    // Get category info
    const categoryId = normalizedProduct.categories[0] || 'general';
    const categoryName = (PRODUCTS.categories && PRODUCTS.categories[categoryId])
      ? PRODUCTS.categories[categoryId].name
      : 'Category';
    
    const reviewCount = normalizedProduct.reviewCount;
    const rating = normalizedProduct.rating;

    // Build old price HTML if exists
    let oldPriceHtml = '';
    if (normalizedProduct.oldPrice && normalizedProduct.oldPrice > normalizedProduct.price) {
      oldPriceHtml = `<span class="old-price">${PRODUCTS.formatPrice(normalizedProduct.oldPrice)}</span>`;
    }

    // Build stars
    let starsHtml = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        starsHtml += '<i class="fas fa-star"></i>';
      } else if (i === fullStars && halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt"></i>';
      } else {
        starsHtml += '<i class="far fa-star"></i>';
      }
    }

    // Create image error handler
    const imageErrorHandler = `onerror="if(!this.dataset.fallback){this.dataset.fallback='true';this.src='images/placeholder.jpg';}"`;

    return `
      <div class="product-card" data-product-id="${productId}">
        <div class="product-image">
          <a href="product.html?id=${productId}">
            <img src="${primaryImage}" alt="${name}" class="primary-image" ${imageErrorHandler}>
            <img src="${hoverImage}" alt="${name} Hover" class="hover-image" ${imageErrorHandler}>
          </a>
          <div class="product-actions">
            <button class="action-btn quick-view-btn" data-product-id="${productId}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn wishlist-btn" data-product-id="${productId}">
              <i class="far fa-heart"></i>
            </button>
          </div>
          <div class="add-to-cart-wrapper">
            <button class="btn btn-dark add-to-cart-btn" data-product-id="${productId}" ${!inStock ? 'disabled' : ''}>
              ${inStock ? 'Add to Cart' : 'Sold Out'}
            </button>
          </div>
        </div>
        <div class="product-content">
          <div class="product-categories">
            <a href="category.html?id=${categoryId}">${categoryName}</a>
          </div>
          <h3 class="product-title">
            <a href="product.html?id=${productId}">${name}</a>
          </h3>
          ${rating > 0 ? `
          <div class="product-rating">
            <div class="stars">${starsHtml}</div>
            <span class="rating-count">(${reviewCount})</span>
          </div>
          ` : ''}
          <div class="product-price">
            ${oldPriceHtml}
            <span class="current-price">${priceHtml}</span>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * FIXED: Handle grid wrapper based on container structure
   */
  wrapProductsInGrid: function(productsHtml, container) {
    // Check if the container itself is already the grid
    if (container && container.classList.contains('products-grid')) {
      console.log('[DEBUG] Container', container.id, 'is already a grid - no wrapper needed');
      return productsHtml; // No wrapper needed - container is the grid
    }
    
    // Otherwise, wrap in grid container
    console.log('[DEBUG] Container', container?.id, 'needs grid wrapper');
    return `<div class="products-grid">${productsHtml}</div>`;
  },

  /**
   * FIXED: Update container content while preserving original structure
   */
  updateTabContainer: function(container, content) {
    // Simply update the content - don't touch classes, let main.js handle tab management
    container.innerHTML = content;
  },

  /**
   * Render the "Trending" (#trending) tab content
   */
  async renderFeaturedProducts() {
    console.log('[DEBUG] product-renderer.js: renderFeaturedProducts() called.');
    const container = document.getElementById('trending');
    if (!container) {
      console.warn('[DEBUG] product-renderer.js: #trending container not found.');
      return;
    }

    // Show loading state
    this.updateTabContainer(container, '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading trending products...</div>');

    let trendingProducts = [];
    try {
      trendingProducts = await PRODUCTS.getTrendingProducts(4);
      console.log('[DEBUG] product-renderer.js: Fetched trending products:', trendingProducts);
    } catch (err) {
      console.error('[DEBUG] product-renderer.js: Error fetching trending products:', err);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Unable to load trending products. Please try again later.</div>');
      return;
    }

    if (!Array.isArray(trendingProducts) || trendingProducts.length === 0) {
      console.warn('[DEBUG] product-renderer.js: No trending products to render.');
      this.updateTabContainer(container, '<div class="no-products"><i class="fas fa-box-open"></i> No trending products available at the moment.</div>');
      return;
    }

    // Build HTML with proper grid wrapper
    let productsHtml = '';
    try {
      trendingProducts.forEach(product => {
        productsHtml += this.createProductCard(product);
      });
      
      // FIXED: Pass container to determine if wrapper is needed
      const finalHtml = this.wrapProductsInGrid(productsHtml, container);
      this.updateTabContainer(container, finalHtml);
      
      console.log('[DEBUG] product-renderer.js: #trending updated with dynamic products.');
      
      // Bind events for the new elements
      this.bindProductCardEvents(container);
    } catch (error) {
      console.error('[DEBUG] product-renderer.js: Error rendering product cards:', error);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Error displaying products.</div>');
    }
  },

  /**
   * Load content for any tab (called from main.js on tab click)
   */
  async loadTabContent(tabId) {
    console.log('[DEBUG] product-renderer.js: loadTabContent() for', tabId);
    const container = document.getElementById(tabId);
    if (!container) {
      console.warn('[DEBUG] product-renderer.js: #' + tabId + ' not found.');
      return;
    }

    if (tabId === 'trending') {
      // Re-render trending if they click it again
      return this.renderFeaturedProducts();
    }

    // Show loading state
    this.updateTabContainer(container, '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading products...</div>');

    let products = [];
    try {
      if (tabId === 'bestsellers') {
        products = await PRODUCTS.getBestSellers(4);
      } else if (tabId === 'newarrivals') {
        products = await PRODUCTS.getNewArrivals(4);
      }
      console.log(`[DEBUG] product-renderer.js: Fetched ${products.length} products for ${tabId}`);
    } catch (err) {
      console.error('[DEBUG] product-renderer.js: Error loading tab content:', err);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Unable to load products. Please try again later.</div>');
      return;
    }

    if (!Array.isArray(products) || products.length === 0) {
      console.warn('[DEBUG] product-renderer.js: No products for tab', tabId);
      this.updateTabContainer(container, '<div class="no-products"><i class="fas fa-box-open"></i> No products available in this category.</div>');
      return;
    }

    // Build HTML with proper grid wrapper
    let productsHtml = '';
    try {
      products.forEach(product => {
        productsHtml += this.createProductCard(product);
      });
      
      // FIXED: Pass container to determine if wrapper is needed
      const finalHtml = this.wrapProductsInGrid(productsHtml, container);
      this.updateTabContainer(container, finalHtml);
      
      // Bind events for the new elements
      this.bindProductCardEvents(container);
    } catch (error) {
      console.error('[DEBUG] product-renderer.js: Error rendering product cards:', error);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Error displaying products.</div>');
    }
  },

  /**
   * Bind events to product cards (add to cart, wishlist, quick view)
   */
  bindProductCardEvents: function(container) {
    // Add to cart buttons
    const addToCartBtns = container.querySelectorAll('.add-to-cart-btn');
    addToCartBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = btn.getAttribute('data-product-id');
        this.handleAddToCart(productId);
      });
    });

    // Wishlist buttons
    const wishlistBtns = container.querySelectorAll('.wishlist-btn');
    wishlistBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = btn.getAttribute('data-product-id');
        this.handleAddToWishlist(productId);
      });
    });

    // Quick view buttons
    const quickViewBtns = container.querySelectorAll('.quick-view-btn');
    quickViewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = btn.getAttribute('data-product-id');
        this.handleQuickView(productId);
      });
    });
  },

  /**
   * Handle add to cart action
   */
  handleAddToCart: function(productId) {
    console.log('[DEBUG] product-renderer.js: Add to cart clicked for product:', productId);
    
    // Check if cart manager exists
    if (typeof window.CartManager !== 'undefined' && window.CartManager.addToCart) {
      window.CartManager.addToCart(productId, 1);
    } else {
      // Fallback - show message or redirect
      console.warn('[DEBUG] product-renderer.js: CartManager not available');
      alert('Added to cart: ' + productId); // Temporary fallback
    }
  },

  /**
   * Handle add to wishlist action
   */
  handleAddToWishlist: function(productId) {
    console.log('[DEBUG] product-renderer.js: Add to wishlist clicked for product:', productId);
    
    // Toggle heart icon
    const btn = document.querySelector(`.wishlist-btn[data-product-id="${productId}"] i`);
    if (btn) {
      if (btn.classList.contains('far')) {
        btn.classList.remove('far');
        btn.classList.add('fas');
        btn.style.color = '#e74c3c';
      } else {
        btn.classList.remove('fas');
        btn.classList.add('far');
        btn.style.color = '';
      }
    }
    
    // Add actual wishlist functionality here
    console.log('Product added to wishlist:', productId);
  },

  /**
   * Handle quick view action
   */
  handleQuickView: function(productId) {
    console.log('[DEBUG] product-renderer.js: Quick view clicked for product:', productId);
    // For now, redirect to product page
    window.location.href = `product.html?id=${productId}`;
  },

  /**
   * Render products in any container (generic method)
   */
  async renderProducts(containerSelector, products) {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.warn('[DEBUG] product-renderer.js: Container not found:', containerSelector);
      return;
    }

    if (!Array.isArray(products) || products.length === 0) {
      this.updateTabContainer(container, '<div class="no-products"><i class="fas fa-box-open"></i> No products available.</div>');
      return;
    }

    let productsHtml = '';
    try {
      products.forEach(product => {
        productsHtml += this.createProductCard(product);
      });
      
      // FIXED: Pass container to determine if wrapper is needed
      const finalHtml = this.wrapProductsInGrid(productsHtml, container);
      this.updateTabContainer(container, finalHtml);
      
      // Bind events for the new elements
      this.bindProductCardEvents(container);
    } catch (error) {
      console.error('[DEBUG] product-renderer.js: Error rendering products:', error);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Error displaying products.</div>');
    }
  },

  /**
   * Search and render products
   */
  async searchAndRender(query, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    this.updateTabContainer(container, '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Searching...</div>');

    try {
      const products = await PRODUCTS.searchProducts(query);
      await this.renderProducts(containerSelector, products);
    } catch (error) {
      console.error('[DEBUG] product-renderer.js: Search error:', error);
      this.updateTabContainer(container, '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Search failed. Please try again.</div>');
    }
  }
};

// Remove auto-initialization - let main.js handle it
console.log('[DEBUG] product-renderer.js: ProductRenderer ready, waiting for main.js to initialize');
// Exported for debugging
console.log('[DEBUG] product-renderer.js: ProductRenderer ready:', typeof window.ProductRenderer);