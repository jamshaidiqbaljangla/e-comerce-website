/**
 * BINGO E-commerce Shop Manager
 * Handles product filtering, sorting, and pagination
 */

window.ShopManager = {
    // Configuration options
    config: {
        productsPerPage: 12,
        priceStep: 50,
        defaultImageUrl: '/images/placeholder.jpg'
    },

    // DOM element selectors
    selectors: {
        productsContainer: '.products-grid',
        filterButtons: '.filter-button',
        sortSelect: '.sort-select',
        priceRange: '.price-range',
        paginationContainer: '.pagination',
        searchInput: '.search-input',
        productCards: '.product-card',
        loadingSpinner: '.loading-spinner'
    },

    // State variables
    state: {
        currentPage: 1,
        totalPages: 1,
        filteredProducts: [],
        categories: {},
        filters: {
            categories: [],
            priceRange: {
                min: 0,
                max: 1000
            },
            inStock: false,
            onSale: false,
            newArrival: false
        },
        sorting: 'default',
        maxPrice: 0
    },
    
    /**
     * Initialize the shop manager
     */
    init: async function() {
        console.log('[DEBUG] shop-manager.js: Shop Manager initializing...');
        
        // Check if we're on the shop page
        if (!document.querySelector('.shop-page')) {
            console.log('[DEBUG] shop-manager.js: Not on shop page, skipping initialization.');
            return;
        }
        
        // Add debug info
        console.log('[DEBUG] shop-manager.js: Found shop page, checking PRODUCTS...');
        console.log('[DEBUG] shop-manager.js: window.PRODUCTS exists:', !!window.PRODUCTS);
        console.log('[DEBUG] shop-manager.js: API_BASE:', window.API_BASE);
        
        await this.setupProducts();
        this.setupCategories();
        this.setupPriceRange();
        this.bindEvents();
        
        console.log('[DEBUG] shop-manager.js: Shop Manager initialized.');
    },
    
    /**
     * Set up products from PRODUCTS data
     */
    setupProducts: async function() {
        console.log('[DEBUG] shop-manager.js: Loading products from API...');
        
        // Wait for window.PRODUCTS to be available
        let attempts = 0;
        while (!window.PRODUCTS && attempts < 10) {
            console.log('[DEBUG] shop-manager.js: Waiting for window.PRODUCTS to be available...');
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.PRODUCTS) {
            console.error('[DEBUG] shop-manager.js: window.PRODUCTS not available after waiting');
            this.createSampleProducts();
            return;
        }
        
        try {
            // Load products using the PRODUCTS API
            console.log('[DEBUG] shop-manager.js: Calling window.PRODUCTS.loadProducts()...');
            const products = await window.PRODUCTS.loadProducts();
            console.log('[DEBUG] shop-manager.js: Received products:', products.length, products);
            
            this.state.filteredProducts = [...products];
            
            // Find maximum price for price range filter
            this.state.maxPrice = Math.max(...products.map(product => parseFloat(product.price) || 0));
            this.state.filters.priceRange.max = Math.ceil(this.state.maxPrice);
            
            console.log('[DEBUG] shop-manager.js: Products loaded:', this.state.filteredProducts.length);
            
            // Apply filters and sort after products are loaded
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('[DEBUG] shop-manager.js: Error loading products:', error);
            // Create sample products as fallback
            this.createSampleProducts();
        }
    },
    
    /**
     * Create sample products if PRODUCTS data is not available
     */
    createSampleProducts: function() {
        const sampleProducts = [];
        const categories = ['premium', 'lifestyle', 'limited', 'collection'];
        const names = [
            'Signature Collection Item', 
            'Modern Minimalist Piece', 
            'Exclusive Designer Item',
            'Premium Collector\'s Edition',
            'Contemporary Classic',
            'Premium Showcase Item',
            'Signature Design Piece',
            'Luxury Collection Item'
        ];
        
        for (let i = 1; i <= 12; i++) {
            const id = `product-${i}`;
            const name = names[Math.floor(Math.random() * names.length)];
            const price = Math.floor(Math.random() * 300) + 99;
            const category = categories[Math.floor(Math.random() * categories.length)];
            const inStock = Math.random() > 0.2;
            const onSale = Math.random() > 0.7;
            const isNew = Math.random() > 0.7;
            
            sampleProducts.push({
                id: id,
                name: name,
                price: price,
                oldPrice: onSale ? price * 1.2 : null,
                categories: [category],
                inStock: inStock,
                newArrival: isNew,
                images: {
                    main: this.config.defaultImageUrl,
                    gallery: [this.config.defaultImageUrl]
                },
                description: `Premium quality ${name.toLowerCase()} crafted with attention to detail.`,
                stock: inStock ? Math.floor(Math.random() * 20) + 1 : 0
            });
        }
        
        this.state.filteredProducts = sampleProducts;
        this.state.maxPrice = Math.max(...sampleProducts.map(product => product.price));
        this.state.filters.priceRange.max = Math.ceil(this.state.maxPrice);
        
        console.log('[DEBUG] shop-manager.js: Sample products created:', this.state.filteredProducts.length);
    },

    /**
     * Set up categories from products
     */
    setupCategories: function() {
        this.state.categories = {};
        
        this.state.filteredProducts.forEach(product => {
            if (product.categories) {
                product.categories.forEach(category => {
                    if (!this.state.categories[category]) {
                        this.state.categories[category] = 0;
                    }
                    this.state.categories[category]++;
                });
            }
        });
        
        console.log('[DEBUG] shop-manager.js: Categories set up:', this.state.categories);
    },

    /**
     * Set up price range slider
     */
    setupPriceRange: function() {
        const priceRange = document.querySelector(this.selectors.priceRange);
        if (priceRange) {
            priceRange.max = this.state.maxPrice;
            priceRange.value = this.state.maxPrice;
            this.state.filters.priceRange.max = this.state.maxPrice;
        }
    },

    /**
     * Bind event listeners
     */
    bindEvents: function() {
        // Filter buttons
        document.querySelectorAll(this.selectors.filterButtons).forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleFilterClick(e);
            });
        });

        // Sort select
        const sortSelect = document.querySelector(this.selectors.sortSelect);
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.state.sorting = e.target.value;
                this.applyFiltersAndSort();
            });
        }

        // Price range
        const priceRange = document.querySelector(this.selectors.priceRange);
        if (priceRange) {
            priceRange.addEventListener('input', (e) => {
                this.state.filters.priceRange.max = parseFloat(e.target.value);
                this.applyFiltersAndSort();
            });
        }

        // Search input
        const searchInput = document.querySelector(this.selectors.searchInput);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value.toLowerCase();
                this.applyFiltersAndSort();
            });
        }
    },

    /**
     * Handle filter button clicks
     */
    handleFilterClick: function(e) {
        const button = e.target;
        const filterType = button.dataset.filter;
        const filterValue = button.dataset.value;

        if (filterType === 'category') {
            // Toggle category filter
            const index = this.state.filters.categories.indexOf(filterValue);
            if (index > -1) {
                this.state.filters.categories.splice(index, 1);
                button.classList.remove('active');
            } else {
                this.state.filters.categories.push(filterValue);
                button.classList.add('active');
            }
        } else if (filterType === 'availability') {
            // Toggle availability filters
            this.state.filters[filterValue] = !this.state.filters[filterValue];
            button.classList.toggle('active');
        }

        this.applyFiltersAndSort();
    },

    /**
     * Apply filters and sorting
     */
    applyFiltersAndSort: function() {
        let filtered = [...this.state.filteredProducts];
        
        console.log('[DEBUG] shop-manager.js: Starting with products:', filtered.length);
        console.log('[DEBUG] shop-manager.js: Sample product structure:', filtered[0]);

        // Apply category filters
        if (this.state.filters.categories.length > 0) {
            const beforeCategory = filtered.length;
            filtered = filtered.filter(product => {
                return product.categories && product.categories.some(cat => 
                    this.state.filters.categories.includes(cat)
                );
            });
            console.log('[DEBUG] shop-manager.js: After category filter:', beforeCategory, '->', filtered.length);
        }

        // Apply price range filter
        const beforePrice = filtered.length;
        filtered = filtered.filter(product => {
            const price = parseFloat(product.price);
            return price >= this.state.filters.priceRange.min && 
                   price <= this.state.filters.priceRange.max;
        });
        console.log('[DEBUG] shop-manager.js: After price filter:', beforePrice, '->', filtered.length, 'Price range:', this.state.filters.priceRange);

        // Apply availability filters
        if (this.state.filters.inStock) {
            const beforeStock = filtered.length;
            filtered = filtered.filter(product => {
                // More lenient stock checking - consider product in stock if:
                // 1. inStock is not explicitly false, AND
                // 2. stock is not 0 or undefined (treat missing stock as available)
                const hasStock = (product.inStock !== false) && (product.stock === undefined || product.stock > 0);
                if (!hasStock) {
                    console.log('[DEBUG] shop-manager.js: Filtering out product due to stock:', product.name, 'inStock:', product.inStock, 'stock:', product.stock);
                }
                return hasStock;
            });
            console.log('[DEBUG] shop-manager.js: After stock filter:', beforeStock, '->', filtered.length);
        }

        if (this.state.filters.onSale) {
            const beforeSale = filtered.length;
            filtered = filtered.filter(product => product.oldPrice || product.onSale);
            console.log('[DEBUG] shop-manager.js: After sale filter:', beforeSale, '->', filtered.length);
        }

        if (this.state.filters.newArrival) {
            const beforeNew = filtered.length;
            filtered = filtered.filter(product => product.newArrival);
            console.log('[DEBUG] shop-manager.js: After new arrival filter:', beforeNew, '->', filtered.length);
        }

        // Apply search filter
        if (this.state.searchTerm) {
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(this.state.searchTerm) ||
                (product.description && product.description.toLowerCase().includes(this.state.searchTerm))
            );
        }

        // Apply sorting
        this.sortProducts(filtered);

        // Update pagination
        this.updatePagination(filtered);

        // Render products
        this.renderProducts(filtered);
    },

    /**
     * Sort products based on current sorting option
     */
    sortProducts: function(products) {
        switch (this.state.sorting) {
            case 'price-low':
                products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-high':
                products.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'name':
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
                products.sort((a, b) => {
                    if (a.newArrival && !b.newArrival) return -1;
                    if (!a.newArrival && b.newArrival) return 1;
                    return 0;
                });
                break;
            default:
                // Default sorting - keep original order
                break;
        }
    },

    /**
     * Update pagination
     */
    updatePagination: function(products) {
        this.state.totalPages = Math.ceil(products.length / this.config.productsPerPage);
        if (this.state.currentPage > this.state.totalPages) {
            this.state.currentPage = 1;
        }
        this.renderPagination();
    },

    /**
     * Render pagination controls
     */
    renderPagination: function() {
        const container = document.querySelector(this.selectors.paginationContainer);
        if (!container) return;

        let html = '';
        
        // Previous button
        if (this.state.currentPage > 1) {
            html += `<button class="pagination-btn" data-page="${this.state.currentPage - 1}">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= this.state.totalPages; i++) {
            const active = i === this.state.currentPage ? 'active' : '';
            html += `<button class="pagination-btn ${active}" data-page="${i}">${i}</button>`;
        }

        // Next button
        if (this.state.currentPage < this.state.totalPages) {
            html += `<button class="pagination-btn" data-page="${this.state.currentPage + 1}">Next</button>`;
        }

        container.innerHTML = html;

        // Bind pagination events
        container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.state.currentPage = parseInt(e.target.dataset.page);
                this.applyFiltersAndSort();
            });
        });
    },

    /**
     * Render products in the grid
     */
    renderProducts: function(products) {
        const container = document.querySelector(this.selectors.productsContainer);
        if (!container) {
            console.error('[DEBUG] shop-manager.js: Products container not found');
            return;
        }

        // Calculate pagination
        const startIndex = (this.state.currentPage - 1) * this.config.productsPerPage;
        const endIndex = startIndex + this.config.productsPerPage;
        const paginatedProducts = products.slice(startIndex, endIndex);

        let html = '';
        
        paginatedProducts.forEach(product => {
            html += this.createProductCard(product);
        });

        container.innerHTML = html;
        
        console.log(`[DEBUG] shop-manager.js: Rendered ${paginatedProducts.length} products`);
    },

    /**
     * Create HTML for a product card
     */
    createProductCard: function(product) {
        // Use ImageUtils for better image handling
        let imageUrl = product.images?.main || product.image_url || this.config.defaultImageUrl;
        
        // Process the image URL using ImageUtils
        if (window.ImageUtils) {
            imageUrl = window.ImageUtils.processImageUrl(imageUrl, 'product');
        } else {
            // Fallback processing if ImageUtils not available
            if (!imageUrl || imageUrl === 'null' || imageUrl === '') {
                imageUrl = this.config.defaultImageUrl;
            }
            
            // Fix base64 data URL issue - if it's base64 data, use placeholder instead
            if (imageUrl.includes('data:image/') && imageUrl.length > 100) {
                console.warn('[DEBUG] shop-manager.js: Base64 image detected, using placeholder instead for product:', product.name);
                imageUrl = this.config.defaultImageUrl;
            }
            
            // Remove leading slash if it's before a data URL
            if (imageUrl.startsWith('/data:')) {
                imageUrl = imageUrl.substring(1);
            }
            
            // Ensure proper URL format for regular URLs
            if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:') && !imageUrl.startsWith('/')) {
                imageUrl = '/' + imageUrl;
            }
        }
        
        const salePrice = product.oldPrice ? product.price : null;
        const originalPrice = product.oldPrice || product.price;
        
        console.log('[DEBUG] shop-manager.js: Creating card for product:', product.name, 'with image:', imageUrl);
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy" 
                         onerror="if(!this.dataset.fallbackAttempted){this.dataset.fallbackAttempted='true';this.src='${this.config.defaultImageUrl}';}">
                    ${product.newArrival ? '<span class="badge new">New</span>' : ''}
                    ${product.oldPrice ? '<span class="badge sale">Sale</span>' : ''}
                    ${!product.inStock || product.stock === 0 ? '<span class="badge out-of-stock">Out of Stock</span>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">
                        ${salePrice ? `<span class="sale-price">$${salePrice}</span>` : ''}
                        <span class="price ${salePrice ? 'original-price' : ''}">$${originalPrice}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary" onclick="window.location.href='product.html?id=${product.id}'">
                            View Details
                        </button>
                        ${product.inStock && product.stock > 0 ? 
                            `<button class="btn btn-secondary" onclick="addToCart('${product.id}')">Add to Cart</button>` :
                            '<button class="btn btn-disabled" disabled>Out of Stock</button>'
                        }
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Refresh products data
     */
    refreshProducts: async function() {
        console.log('[DEBUG] shop-manager.js: Refreshing products...');
        await this.setupProducts();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.PRODUCTS) {
        window.ShopManager.init();
    } else {
        // Wait for PRODUCTS to load
        const checkProducts = setInterval(() => {
            if (window.PRODUCTS) {
                clearInterval(checkProducts);
                window.ShopManager.init();
            }
        }, 100);
    }
});
