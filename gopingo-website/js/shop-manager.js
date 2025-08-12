/**
 * BINGO E-commerce Shop Manager
 * Handles product filtering, sorting, and pagination
 */

window.ShopManager = {
    // Configuration options
    config: {
        productsPerPage: 9,
        defaultSorting: 'default'
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
            inStock: true,
            onSale: false,
            newArrival: false
        },
        sorting: 'default',
        maxPrice: 0
    },
    
    /**
     * Initialize the shop manager
     */
    init: function() {
        console.log('[DEBUG] shop-manager.js: Shop Manager initializing...');
        
        // Check if we're on the shop page
        if (!document.querySelector('.shop-page')) {
            console.log('[DEBUG] shop-manager.js: Not on shop page, skipping initialization.');
            return;
        }
        
        this.setupProducts();
        this.setupCategories();
        this.setupPriceRange();
        this.bindEvents();
        this.applyFiltersAndSort();
        
        console.log('[DEBUG] shop-manager.js: Shop Manager initialized.');
    },
    
    /**
     * Set up products from PRODUCTS data
     */
    setupProducts: function() {
        // Use PRODUCTS data if available, otherwise show placeholder message
        if (typeof window.PRODUCTS !== 'undefined' && Array.isArray(window.PRODUCTS.items)) {
            this.state.filteredProducts = [...window.PRODUCTS.items];
            
            // Find maximum price for price range filter
            this.state.maxPrice = Math.max(...window.PRODUCTS.items.map(product => product.price || 0));
            this.state.filters.priceRange.max = Math.ceil(this.state.maxPrice);
            
            console.log('[DEBUG] shop-manager.js: Products loaded:', this.state.filteredProducts.length);
        } else {
            console.warn('[DEBUG] shop-manager.js: PRODUCTS data not available.');
            // Create sample products
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
                    primary: `images/product-${Math.min(i, 9)}.jpg`,
                    hover: `images/product-${Math.min(i, 9)}-hover.jpg`
                }
            });
        }
        
        this.state.filteredProducts = sampleProducts;
        this.state.maxPrice = Math.max(...sampleProducts.map(product => product.price));
        this.state.filters.priceRange.max = Math.ceil(this.state.maxPrice);
        
        console.log('[DEBUG] shop-manager.js: Sample products created:', sampleProducts.length);
    },
    
    /**
     * Set up categories from products
     */
    setupCategories: function() {
        // Extract unique categories from products
        const categories = {};
        
        this.state.filteredProducts.forEach(product => {
            if (product.categories && Array.isArray(product.categories)) {
                product.categories.forEach(category => {
                    if (!categories[category]) {
                        categories[category] = {
                            id: category,
                            name: this.formatCategoryName(category),
                            count: 1
                        };
                    } else {
                        categories[category].count++;
                    }
                });
            }
        });
        
        this.state.categories = categories;
        this.renderCategoryFilters();
        
        console.log('[DEBUG] shop-manager.js: Categories set up:', Object.keys(categories).length);
    },
    
    /**
     * Format category name (convert slug to title case)
     */
    formatCategoryName: function(category) {
        // If PRODUCTS.categories exists and has this category, use its name
        if (window.PRODUCTS && window.PRODUCTS.categories && window.PRODUCTS.categories[category]) {
            return window.PRODUCTS.categories[category].name;
        }
        
        // Otherwise format the slug
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },
    
    /**
     * Set up price range inputs
     */
    setupPriceRange: function() {
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        
        if (minPriceInput && maxPriceInput) {
            minPriceInput.value = this.state.filters.priceRange.min;
            maxPriceInput.value = this.state.filters.priceRange.max;
            
            // Set max attribute
            maxPriceInput.setAttribute('max', Math.ceil(this.state.maxPrice * 1.2));
        }
    },
    
    /**
     * Bind all shop-related events
     */
    bindEvents: function() {
        // Filter toggle for mobile
        const filterToggleBtn = document.querySelector('.filter-toggle-btn');
        if (filterToggleBtn) {
            filterToggleBtn.addEventListener('click', () => {
                const sidebar = document.querySelector('.shop-sidebar');
                if (sidebar) {
                    // If sidebar doesn't have close button, add it
                    if (!sidebar.querySelector('.sidebar-close')) {
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'sidebar-close';
                        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
                        closeBtn.addEventListener('click', () => {
                            sidebar.classList.remove('active');
                        });
                        sidebar.appendChild(closeBtn);
                    }
                    
                    sidebar.classList.add('active');
                }
            });
        }
        
        // Price range filter
        document.getElementById('apply-price-filter').addEventListener('click', () => {
            const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
            const maxPrice = parseFloat(document.getElementById('max-price').value) || this.state.maxPrice;
            
            this.state.filters.priceRange.min = minPrice;
            this.state.filters.priceRange.max = maxPrice;
            
            this.state.currentPage = 1;
            this.applyFiltersAndSort();
        });
        
        // Product status filters
        document.getElementById('in-stock').addEventListener('change', (e) => {
            this.state.filters.inStock = e.target.checked;
            this.state.currentPage = 1;
            this.applyFiltersAndSort();
        });
        
        document.getElementById('on-sale').addEventListener('change', (e) => {
            this.state.filters.onSale = e.target.checked;
            this.state.currentPage = 1;
            this.applyFiltersAndSort();
        });
        
        document.getElementById('new-arrival').addEventListener('change', (e) => {
            this.state.filters.newArrival = e.target.checked;
            this.state.currentPage = 1;
            this.applyFiltersAndSort();
        });
        
        // Reset filters
        document.getElementById('reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });
        
        // Sorting
        document.getElementById('shop-sort').addEventListener('change', (e) => {
            this.state.sorting = e.target.value;
            this.state.currentPage = 1;
            this.applyFiltersAndSort();
        });
    },
    
    /**
     * Render category filters in sidebar
     * FIXED: prevents duplicate categories and improves checkbox handling
     */
    renderCategoryFilters: function() {
        const categoriesContainer = document.getElementById('category-filters');
        if (!categoriesContainer) return;
        
        // Keep the "All Categories" checkbox only
        categoriesContainer.innerHTML = `
            <div class="filter-option">
                <input type="checkbox" id="category-all" ${this.state.filters.categories.length === 0 ? 'checked' : ''}>
                <label for="category-all">All Categories</label>
            </div>
        `;
        
        // Create a set of unique category IDs to prevent duplicates
        const uniqueCategories = new Set(Object.keys(this.state.categories));
        
        // Add category checkboxes
        uniqueCategories.forEach(categoryId => {
            const category = this.state.categories[categoryId];
            categoriesContainer.innerHTML += `
                <div class="filter-option">
                    <input type="checkbox" id="category-${categoryId}" 
                           ${this.state.filters.categories.includes(categoryId) ? 'checked' : ''}>
                    <label for="category-${categoryId}">${category.name} (${category.count || 0})</label>
                </div>
            `;
        });
        
        // Add event listeners to newly created checkboxes
        const allCategoriesCheckbox = document.getElementById('category-all');
        if (allCategoriesCheckbox) {
            allCategoriesCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Uncheck all other categories
                    document.querySelectorAll('#category-filters input[type="checkbox"]:not(#category-all)').forEach(cb => {
                        cb.checked = false;
                    });
                    
                    // Clear category filters
                    this.state.filters.categories = [];
                    this.state.currentPage = 1;
                    this.applyFiltersAndSort();
                }
            });
        }
        
        // Add event listeners to category checkboxes
        document.querySelectorAll('#category-filters input[type="checkbox"]:not(#category-all)').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const categoryId = e.target.id.replace('category-', '');
                const allCategoriesCheckbox = document.getElementById('category-all');
                
                if (e.target.checked) {
                    // Add category to filters
                    if (!this.state.filters.categories.includes(categoryId)) {
                        this.state.filters.categories.push(categoryId);
                    }
                    
                    // Uncheck "All Categories"
                    if (allCategoriesCheckbox) {
                        allCategoriesCheckbox.checked = false;
                    }
                } else {
                    // Remove category from filters
                    this.state.filters.categories = this.state.filters.categories.filter(cat => cat !== categoryId);
                    
                    // If no categories selected, check "All Categories"
                    if (this.state.filters.categories.length === 0 && allCategoriesCheckbox) {
                        allCategoriesCheckbox.checked = true;
                    }
                }
                
                this.state.currentPage = 1;
                this.applyFiltersAndSort();
            });
        });
    },
    
    /**
     * Reset all filters to default
     */
    resetFilters: function() {
        // Reset state
        this.state.filters = {
            categories: [],
            priceRange: {
                min: 0,
                max: Math.ceil(this.state.maxPrice)
            },
            inStock: true,
            onSale: false,
            newArrival: false
        };
        
        this.state.sorting = this.config.defaultSorting;
        this.state.currentPage = 1;
        
        // Reset UI
        document.querySelectorAll('#category-filters input[type="checkbox"]').forEach(cb => {
            cb.checked = cb.id === 'category-all';
        });
        
        document.getElementById('min-price').value = 0;
        document.getElementById('max-price').value = Math.ceil(this.state.maxPrice);
        
        document.getElementById('in-stock').checked = true;
        document.getElementById('on-sale').checked = false;
        document.getElementById('new-arrival').checked = false;
        
        document.getElementById('shop-sort').value = this.config.defaultSorting;
        
        this.applyFiltersAndSort();
    },
    
    /**
     * Apply all filters and sorting, then update display
     */
    applyFiltersAndSort: function() {
        console.log('[DEBUG] shop-manager.js: Applying filters and sorting...');
        
        // Start with all products from the original data
        let products = [];
        
        if (typeof window.PRODUCTS !== 'undefined' && Array.isArray(window.PRODUCTS.items)) {
            products = [...window.PRODUCTS.items];
        } else {
            products = [...this.state.filteredProducts];
        }
        
        // Apply category filter
        if (this.state.filters.categories.length > 0) {
            products = products.filter(product => {
                return product.categories && Array.isArray(product.categories) && 
                       product.categories.some(category => this.state.filters.categories.includes(category));
            });
        }
        
        // Apply price range filter
        products = products.filter(product => {
            return product.price >= this.state.filters.priceRange.min && 
                   product.price <= this.state.filters.priceRange.max;
        });
        
        // Apply in-stock filter
        if (this.state.filters.inStock) {
            products = products.filter(product => product.inStock !== false);
        }
        
        // Apply on-sale filter
        if (this.state.filters.onSale) {
            products = products.filter(product => product.oldPrice);
        }
        
        // Apply new-arrival filter
        if (this.state.filters.newArrival) {
            products = products.filter(product => product.newArrival);
        }
        
        // Apply sorting
        products = this.sortProducts(products, this.state.sorting);
        
        // Update filtered products
        this.state.filteredProducts = products;
        
        // Calculate total pages
        this.state.totalPages = Math.max(1, Math.ceil(products.length / this.config.productsPerPage));
        
        // Ensure current page is valid
        if (this.state.currentPage > this.state.totalPages) {
            this.state.currentPage = 1;
        }
        
        // Update display
        this.updateProductsDisplay();
        this.updatePagination();
        this.updateResultsCount();
        
        console.log('[DEBUG] shop-manager.js: Filters applied, filtered products:', products.length);
    },
    
    /**
     * Sort products based on selected sorting option
     */
    sortProducts: function(products, sortOption) {
        switch (sortOption) {
            case 'price-low':
                return products.sort((a, b) => (a.price || 0) - (b.price || 0));
                
            case 'price-high':
                return products.sort((a, b) => (b.price || 0) - (a.price || 0));
                
            case 'name-asc':
                return products.sort((a, b) => a.name.localeCompare(b.name));
                
            case 'name-desc':
                return products.sort((a, b) => b.name.localeCompare(a.name));
                
            case 'newest':
                return products.sort((a, b) => a.newArrival ? -1 : (b.newArrival ? 1 : 0));
                
            default:
                // Default sorting (featured or original order)
                return products;
        }
    },
    
    /**
     * Update products display with current page of filtered products
     */
    updateProductsDisplay: function() {
        const productsContainer = document.getElementById('products-grid');
        if (!productsContainer) return;
        
        // Calculate start and end indices for current page
        const startIndex = (this.state.currentPage - 1) * this.config.productsPerPage;
        const endIndex = startIndex + this.config.productsPerPage;
        
        // Get products for current page
        const productsToShow = this.state.filteredProducts.slice(startIndex, endIndex);
        
        // Clear container
        productsContainer.innerHTML = '';
        
        // If no products, show message
        if (productsToShow.length === 0) {
            productsContainer.innerHTML = `
                <div class="no-products-found">
                    <i class="fas fa-search"></i>
                    <p>No products match your criteria.</p>
                    <button id="clear-filters" class="btn btn-dark">Clear Filters</button>
                </div>
            `;
            
            // Add event listener to clear filters button
            const clearFiltersBtn = document.getElementById('clear-filters');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => this.resetFilters());
            }
            
            return;
        }
        
        // Render products
        productsToShow.forEach(product => {
            // Use ProductRenderer if available, otherwise create simple product card
            if (window.ProductRenderer && typeof window.ProductRenderer.createProductCard === 'function') {
                productsContainer.innerHTML += window.ProductRenderer.createProductCard(product);
            } else {
                productsContainer.innerHTML += this.createSimpleProductCard(product);
            }
        });
        
        // Initialize wishlist buttons if WishlistManager is available
        if (window.WishlistManager && typeof window.WishlistManager.updateWishlistDisplay === 'function') {
            window.WishlistManager.updateWishlistDisplay();
        }
    },
    
    /**
     * Create a simple product card (fallback if ProductRenderer is not available)
     */
    createSimpleProductCard: function(product) {
        const isOnSale = product.oldPrice && product.oldPrice > product.price;
        const isNew = product.newArrival;
        const isSoldOut = product.inStock === false;
        
        const badges = [];
        if (isNew) badges.push('<span class="badge new">New</span>');
        if (isOnSale) badges.push(`<span class="badge sale">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>`);
        if (isSoldOut) badges.push('<span class="badge sold-out">Sold Out</span>');
        
        const badgesHtml = badges.length > 0 ? `<div class="product-badges">${badges.join('')}</div>` : '';
        
        const priceHtml = isOnSale 
            ? `<span class="old-price">$${product.oldPrice.toFixed(2)}</span> <span class="current-price">$${product.price.toFixed(2)}</span>` 
            : `<span class="current-price">$${product.price.toFixed(2)}</span>`;
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image">
                    ${badgesHtml}
                    <a href="product.html?id=${product.id}">
                        <img src="${product.images.primary}" alt="${product.name}" class="primary-image">
                        <img src="${product.images.hover || product.images.primary}" alt="${product.name} Hover" class="hover-image">
                    </a>
                    <div class="product-actions">
                        <button class="action-btn quick-view-btn" aria-label="Quick view"><i class="fas fa-eye"></i></button>
                        <button class="action-btn wishlist-btn" aria-label="Add to wishlist"><i class="far fa-heart"></i></button>
                    </div>
                    <div class="add-to-cart-wrapper">
                        <button class="btn btn-dark add-to-cart-btn" ${isSoldOut ? 'disabled' : ''}>${isSoldOut ? 'Sold Out' : 'Add to Cart'}</button>
                    </div>
                </div>
                <div class="product-content">
                    <div class="product-categories">
                        <a href="category.html?id=${product.categories && product.categories[0] || 'all'}">${this.formatCategoryName(product.categories && product.categories[0] || 'general')}</a>
                    </div>
                    <h3 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                    <div class="product-price">
                        ${priceHtml}
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Update pagination based on current state
     */
    updatePagination: function() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;
        
        if (this.state.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <button class="pagination-btn prev ${this.state.currentPage === 1 ? 'disabled' : ''}" 
                    ${this.state.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        const maxPagesToShow = 5;
        const halfMaxPages = Math.floor(maxPagesToShow / 2);
        let startPage = Math.max(1, this.state.currentPage - halfMaxPages);
        let endPage = Math.min(this.state.totalPages, startPage + maxPagesToShow - 1);
        
        // Adjust start if end is maxed out
        if (endPage === this.state.totalPages) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        // First page (if not included in regular pages)
        if (startPage > 1) {
            paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHtml += `<span class="pagination-dots">...</span>`;
            }
        }
        
        // Regular page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="pagination-btn ${i === this.state.currentPage ? 'active' : ''}" 
                        data-page="${i}">${i}</button>
            `;
        }
        
        // Last page (if not included in regular pages)
        if (endPage < this.state.totalPages) {
            if (endPage < this.state.totalPages - 1) {
                paginationHtml += `<span class="pagination-dots">...</span>`;
            }
            paginationHtml += `<button class="pagination-btn" data-page="${this.state.totalPages}">${this.state.totalPages}</button>`;
        }
        
        // Next button
        paginationHtml += `
            <button class="pagination-btn next ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}" 
                    ${this.state.currentPage === this.state.totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHtml;
        
        // Add event listeners
        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled')) return;
                
                if (btn.classList.contains('prev')) {
                    this.state.currentPage = Math.max(1, this.state.currentPage - 1);
                } else if (btn.classList.contains('next')) {
                    this.state.currentPage = Math.min(this.state.totalPages, this.state.currentPage + 1);
                } else {
                    const page = parseInt(btn.getAttribute('data-page'), 10);
                    if (!isNaN(page)) {
                        this.state.currentPage = page;
                    }
                }
                
                this.updateProductsDisplay();
                this.updatePagination();
                this.updateResultsCount();
                
                // Scroll to top of products grid
                document.querySelector('.shop-products').scrollIntoView({ behavior: 'smooth' });
            });
        });
    },
    
    /**
     * Update results count display
     */
    updateResultsCount: function() {
        const showingCount = document.getElementById('showing-count');
        const totalCount = document.getElementById('total-count');
        
        if (showingCount && totalCount) {
            const totalProducts = this.state.filteredProducts.length;
            const startIndex = (this.state.currentPage - 1) * this.config.productsPerPage + 1;
            const endIndex = Math.min(startIndex + this.config.productsPerPage - 1, totalProducts);
            
            if (totalProducts === 0) {
                showingCount.textContent = '0';
            } else {
                showingCount.textContent = `${startIndex}-${endIndex}`;
            }
            
            totalCount.textContent = totalProducts;
        }
    }
};

// Initialize ShopManager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.ShopManager) {
            window.ShopManager.init();
        }
    });
} else {
    if (window.ShopManager) {
        window.ShopManager.init();
    }
}

console.log('[DEBUG] shop-manager.js: ShopManager object defined');