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
    // If no image provided, return placeholder
    if (!imageUrl) {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNGOEY5RkEiLz48cGF0aCBkPSJNNDUgNDVINzVNNjAgNjBWMzBNNjAgOTBWNjAiIHN0cm9rZT0iI0RFRTJFNiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48dGV4dCB4PSI2MCIgeT0iMTA1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Qzc1N0QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Handle base64 encoded images - if too long, use placeholder instead
    if (imageUrl.includes('data:image/') && imageUrl.length > 100) {
      console.warn('Base64 image detected, using placeholder for better performance');
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNGOEY5RkEiLz48cGF0aCBkPSJNNDUgNDVINzVNNjAgNjBWMzBNNjAgOTBWNjAiIHN0cm9rZT0iI0RFRTJFNiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48dGV4dCB4PSI2MCIgeT0iMTA1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Qzc1N0QiIHRleHQtYW5jaG9yPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Build an absolute URL based on current origin; support absolute paths already
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
    // Handle data URLs properly
    if (imageUrl.startsWith('data:')) return imageUrl;
    // If path already starts with images/ or uploads/ keep it relative to origin
    if (imageUrl.startsWith('images/') || imageUrl.startsWith('/images/')) {
      return `${window.location.origin}/${imageUrl.replace(/^\//, '')}`;
    }
    if (imageUrl.startsWith('uploads/') || imageUrl.startsWith('/uploads/')) {
      return `${window.location.origin}/${imageUrl.replace(/^\//, '')}`;
    }
    // Fallback: treat as an uploaded file name, serve via API proxy on Netlify
    return `${window.location.origin}/api/uploads/${imageUrl.replace(/^\//, '')}`;
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
    
    // Process images using ImageUtils if available
    const processedPrimaryImage = window.ImageUtils 
      ? window.ImageUtils.processImageUrl(primaryImage, 'product') 
      : primaryImage;
    const processedHoverImage = window.ImageUtils 
      ? window.ImageUtils.processImageUrl(hoverImage, 'product') 
      : hoverImage;
    
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
        // Create image error handler
    const imageErrorHandler = `onerror="if(!this.dataset.fallback){this.dataset.fallback='true';this.src='${this.getDefaultCategoryImage()}'; console.log('Failed to load image:', '${imageUrl}');}"`;

    return `
      <div class="product-card" data-product-id="${productId}">
        <div class="product-image">
          <a href="product.html?id=${productId}">
            <img src="${processedPrimaryImage}" alt="${name}" class="primary-image" ${imageErrorHandler}>
            <img src="${processedHoverImage}" alt="${name} Hover" class="hover-image" ${imageErrorHandler}>
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
    
    // Check if this is a featured products tab (has tab-content class)
    if (container && container.classList.contains('tab-content')) {
      console.log('[DEBUG] Container', container.id, 'is a tab-content - no wrapper needed');
      return productsHtml; // No wrapper needed - tab-content handles the grid
    }
    
    // Otherwise, wrap in grid container (for shop pages, etc.)
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
   * Get default placeholder image
   */
  getDefaultCategoryImage() {
    return '/images/placeholder.jpg';
  },

  /**
   * Render the "Trending" (#trending) tab content
   */
  async renderFeaturedProducts() {
    console.log('[DEBUG] product-renderer.js: renderFeaturedProducts() called.');
    const container = document.getElementById('trending');
    if (!container) {
      console.warn('[DEBUG] product-renderer.js: #trending container not found. This is expected on pages without featured products.');
      return; // Gracefully exit without error - this might be a page without featured products
    }

    // Check if static content already exists
    const existingProducts = container.querySelectorAll('.product-card');
    if (existingProducts.length > 0) {
      console.log('[DEBUG] product-renderer.js: Static trending content already exists, skipping dynamic load');
      return;
    }

    // Show loading state only if no static content exists
    this.updateTabContainer(container, '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading trending products...</div>');

    let trendingProducts = [];
    try {
      // First try to use the API method
      if (typeof PRODUCTS !== 'undefined' && typeof PRODUCTS.getTrendingProducts === 'function') {
        trendingProducts = await PRODUCTS.getTrendingProducts(4);
        console.log('[DEBUG] product-renderer.js: Fetched trending products:', trendingProducts);
      } else {
        // Fallback for when PRODUCTS API isn't available
        console.warn('[DEBUG] product-renderer.js: PRODUCTS.getTrendingProducts not available, using fallback data.');
        trendingProducts = [
          { id: 'product-1', name: 'Featured Product 1', price: 199, images: { primary: 'images/product-1.jpg', gallery: ['images/product-1-hover.jpg'] }, categories: ['cat1'] },
          { id: 'product-2', name: 'Featured Product 2', price: 179, images: { primary: 'images/product-2.jpg', gallery: ['images/product-2-hover.jpg'] }, categories: ['cat2'] },
          { id: 'product-3', name: 'Featured Product 3', price: 299, images: { primary: 'images/product-3.jpg', gallery: ['images/product-3-hover.jpg'] }, categories: ['cat3'] },
          { id: 'product-4', name: 'Featured Product 4', price: 349, images: { primary: 'images/product-4.jpg', gallery: ['images/product-4-hover.jpg'] }, categories: ['cat4'] }
        ];
      }
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
      // Re-render trending if they click it again, but only if no static content exists
      const hasStaticContent = container.querySelector('.product-card');
      if (!hasStaticContent) {
        return this.renderFeaturedProducts();
      } else {
        console.log('[DEBUG] product-renderer.js: Static content exists for trending, skipping dynamic load');
        return;
      }
    }

    // Check if static content already exists for this tab
    const existingProducts = container.querySelectorAll('.product-card');
    if (existingProducts.length > 0) {
      console.log(`[DEBUG] product-renderer.js: Static content already exists for ${tabId} (${existingProducts.length} products), skipping dynamic load`);
      return;
    }

    // Show loading state only if no static content exists
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