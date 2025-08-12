/**
 * BINGO E-commerce Category Manager
 * Handles category page functionality
 */

window.CategoryManager = {
    // State variables
    state: {
        currentCategoryId: null,
        categories: {},
        relatedCategories: []
    },
    
    // Category data (can be extended or fetched from server)
    categoryData: {
        'premium': {
            name: 'Premium Collection',
            description: 'Discover our exclusive premium collection, featuring high-quality materials and exceptional craftsmanship. Each piece is designed to elevate your lifestyle with sophisticated style and unmatched quality.',
            image: 'images/category-1.jpg'
        },
        'lifestyle': {
            name: 'Lifestyle Essentials',
            description: 'Our lifestyle essentials collection includes versatile pieces designed for everyday living. Combining practicality with style, these products seamlessly integrate into your daily routine.',
            image: 'images/category-2.jpg'
        },
        'limited': {
            name: 'Limited Edition',
            description: 'Our limited edition collection features exclusive pieces available for a short time only. Each item is specially crafted with unique details and premium materials, making them true collector\'s items.',
            image: 'images/category-3.jpg'
        },
        'collection': {
            name: 'Signature Collection',
            description: 'The signature collection represents our core aesthetic and brand values. These timeless pieces showcase our commitment to quality, design, and attention to detail.',
            image: 'images/category-4.jpg'
        },
        'new-season': {
            name: 'New Season',
            description: 'Stay ahead of the trends with our latest new season arrivals. These fresh designs incorporate contemporary elements while maintaining our signature quality and craftsmanship.',
            image: 'images/category-1.jpg'
        },
        'essentials': {
            name: 'Essentials',
            description: 'The essentials collection focuses on must-have pieces for every lifestyle. Timeless designs, versatile functionality, and enduring quality make these products the foundation of any collection.',
            image: 'images/category-2.jpg'
        },
        'trending': {
            name: 'Trending Now',
            description: 'Explore our current trending products - the most popular items among our customers. These fashionable pieces capture the current moment while maintaining our standard of excellence.',
            image: 'images/category-3.jpg'
        }
    },
    
    /**
     * Initialize the category manager
     */
    init: function() {
        console.log('[DEBUG] category-manager.js: Category Manager initializing...');
        
        // Check if we're on the category page
        if (!document.querySelector('.category-banner')) {
            console.log('[DEBUG] category-manager.js: Not on category page, skipping initialization.');
            return;
        }
        
        this.loadCategoryFromUrl();
        this.setupCategories();
        this.renderCategoryInfo();
        this.renderRelatedCategories();
        
        // If ShopManager exists, we'll set the category filter there
        if (window.ShopManager) {
            this.setShopManagerCategory();
        }

        // Bind the all categories checkbox properly
        this.bindAllCategoriesCheckbox();
        
        console.log('[DEBUG] category-manager.js: Category Manager initialized with category:', this.state.currentCategoryId);
    },
    
    /**
     * Load category ID from URL parameter
     */
    loadCategoryFromUrl: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('id');
        
        if (categoryId) {
            this.state.currentCategoryId = categoryId;
        } else {
            // Redirect to shop page if no category ID provided
            window.location.href = 'shop.html';
        }
    },
    
    /**
     * Set up categories from products data
     */
    /**
 * Set up categories from CATEGORIES API
 */
setupCategories: async function() {
    try {
        console.log('[DEBUG] category-manager.js: Fetching categories from API...');
        const response = await fetch('/api/categories');
        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.statusText}`);
        }
        const categories = await response.json();
        
        if (!Array.isArray(categories) || categories.length === 0) {
            throw new Error('No categories returned from API');
        }
        
        console.log('[DEBUG] category-manager.js: Received', categories.length, 'categories from API');
        
        this.state.categories = {};
        categories.forEach(category => {
            this.state.categories[category.id] = {
                name: category.name,
                description: category.description || `Explore our ${category.name} collection.`,
                image: category.image_url || 'images/category-default.jpg',
                count: category.productCount || 0,
                slug: category.slug,
                color: category.color,
                isActive: category.is_active,
                parentId: category.parent_id
            };
            
            // Only create slug reference if it's different from id
            if (category.slug && category.slug !== category.id) {
                this.state.categories[category.slug] = this.state.categories[category.id];
            }
        });
        
        this.findRelatedCategories();
        console.log('[DEBUG] category-manager.js: Categories setup complete');
    } catch (error) {
        console.error('[DEBUG] category-manager.js: Error fetching categories:', error);
        
        // Only use hardcoded data if we have no categories at all
        if (!this.state.categories || Object.keys(this.state.categories).length === 0) {
            console.warn('[DEBUG] category-manager.js: Falling back to hardcoded data');
            this.state.categories = { ...this.categoryData };
        }
    }
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
     * Find categories related to the current one
     */
    findRelatedCategories: function() {
        // Get all categories except current one
        const otherCategories = Object.keys(this.state.categories)
            .filter(catId => catId !== this.state.currentCategoryId)
            .map(catId => ({ 
                id: catId, 
                ...this.state.categories[catId]
            }));
        
        // Sort by product count if available
        otherCategories.sort((a, b) => (b.count || 0) - (a.count || 0));
        
        // Take top 4
        this.state.relatedCategories = otherCategories.slice(0, 4);
    },
    
    /**
     * Render category information (title, description, image)
     */
    renderCategoryInfo: function() {
        const categoryData = this.state.categories[this.state.currentCategoryId] || {
            name: this.formatCategoryName(this.state.currentCategoryId),
            description: 'Explore our collection.',
            image: 'images/category-default.jpg'
        };
        
        // Update page title
        document.title = `${categoryData.name} | BINGO`;
        
        // Update category title and breadcrumb
        const categoryTitle = document.getElementById('category-title');
        const categoryBreadcrumb = document.getElementById('category-breadcrumb');
        
        if (categoryTitle) categoryTitle.textContent = categoryData.name;
        if (categoryBreadcrumb) categoryBreadcrumb.textContent = categoryData.name;
        
        // Update category description
        const categoryDescription = document.getElementById('category-description');
        if (categoryDescription) {
            categoryDescription.innerHTML = `
                <h2>${categoryData.name}</h2>
                <p>${categoryData.description}</p>
            `;
        }
        
        // Update category image
        const categoryImage = document.getElementById('category-image');
        if (categoryImage) {
            const img = categoryImage.querySelector('img');
            if (img) {
                img.src = categoryData.image;
                img.alt = categoryData.name;
            }
        }
    },
    
    /**
     * Render related categories section
     */
    renderRelatedCategories: function() {
        const relatedCategoriesContainer = document.getElementById('related-categories');
        if (!relatedCategoriesContainer) return;
        
        if (this.state.relatedCategories.length === 0) {
            relatedCategoriesContainer.innerHTML = '<p>No related categories found.</p>';
            return;
        }
        
        let html = '';
        this.state.relatedCategories.forEach(category => {
            html += `
                <a href="category.html?id=${category.id}" class="category-card">
                    <div class="category-card-image">
                        <img src="${category.image}" alt="${category.name}">
                    </div>
                    <div class="category-card-content">
                        <h3 class="category-card-title">${category.name}</h3>
                        ${category.count ? `<div class="category-card-count">${category.count} products</div>` : ''}
                    </div>
                </a>
            `;
        });
        
        relatedCategoriesContainer.innerHTML = html;
    },
    
    /**
     * Bind the All Categories checkbox to properly reset filters
     */
    bindAllCategoriesCheckbox: function() {
        const allCategoriesCheckbox = document.getElementById('category-all');
        if (!allCategoriesCheckbox) return;
        
        allCategoriesCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Clear all other category checkboxes
                document.querySelectorAll('#category-filters input[type="checkbox"]:not(#category-all)').forEach(cb => {
                    cb.checked = false;
                });
                
                // Reset ShopManager filters
                if (window.ShopManager && window.ShopManager.state) {
                    window.ShopManager.state.filters.categories = [];
                    window.ShopManager.state.currentPage = 1;
                    
                    // Force reapply filters
                    if (typeof window.ShopManager.applyFiltersAndSort === 'function') {
                        window.ShopManager.applyFiltersAndSort();
                    }
                }
            }
        });
    },
    
    /**
     * Set the category filter in ShopManager
     */
    setShopManagerCategory: function() {
        if (!window.ShopManager) return;
        
        // Wait for ShopManager to be fully initialized
        const checkInterval = setInterval(() => {
            if (window.ShopManager.state && window.ShopManager.state.filters) {
                clearInterval(checkInterval);
                
                // Set the category filter
                window.ShopManager.state.filters.categories = [this.state.currentCategoryId];
                
                // Update the category checkbox in the sidebar
                const categoryCheckbox = document.getElementById(`category-${this.state.currentCategoryId}`);
                const allCategoriesCheckbox = document.getElementById('category-all');
                
                if (categoryCheckbox) {
                    categoryCheckbox.checked = true;
                }
                
                if (allCategoriesCheckbox) {
                    allCategoriesCheckbox.checked = false;
                }
                
                // Apply filters
                if (typeof window.ShopManager.applyFiltersAndSort === 'function') {
                    window.ShopManager.applyFiltersAndSort();
                }
            }
        }, 100);
    },
    
    /**
     * Update all category links to use category.html instead of shop.html
     * This can be called from main.js to fix category links throughout the site
     */
    updateCategoryLinks: function() {
        document.querySelectorAll('a[href^="shop.html?category="], a[href^="category.html?id="], a[href*="category.html"]').forEach(link => {
            const href = link.getAttribute('href');
            const url = new URL(href, window.location.origin);
            
            // Extract category ID from URL
            let categoryId = url.searchParams.get('category') || url.searchParams.get('id');
            
            // If no category ID but link text might be a category, use that
            if (!categoryId) {
                const linkText = link.textContent.trim().toLowerCase();
                // Look for category that matches link text
                Object.keys(this.state.categories).forEach(catId => {
                    const catName = this.state.categories[catId].name.toLowerCase();
                    if (catName === linkText) {
                        categoryId = catId;
                    }
                });
            }
            
            if (categoryId) {
                link.setAttribute('href', `category.html?id=${categoryId}`);
            }
        });
    },



/**
 * Update site navigation menus with current category data
 */
updateSiteNavigation: function() {
    if (!window.CATEGORIES || !window.CATEGORIES.getNavigationCategories) {
        console.log('[DEBUG] category-manager.js: CATEGORIES API not available for navigation update');
        return;
    }
    
    console.log('[DEBUG] category-manager.js: Updating site navigation...');
    
    try {
        const categories = window.CATEGORIES.getNavigationCategories();
        
        // Update mega menu
        const megaMenuCategories = document.querySelector('.mega-menu-column:first-child ul');
        if (megaMenuCategories) {
            let html = '';
            categories.slice(0, 4).forEach(category => {
                html += `<li><a href="category.html?id=${category.id}">${category.name}</a></li>`;
            });
            megaMenuCategories.innerHTML = html;
            console.log('[DEBUG] category-manager.js: Updated mega menu with', categories.length, 'categories');
        }
        
        // Update mobile menu
        const mobileSubmenu = document.querySelector('.mobile-submenu');
        if (mobileSubmenu) {
            let html = '';
            categories.forEach(category => {
                html += `<li><a href="category.html?id=${category.id}">${category.name}</a></li>`;
                // Add children if they exist
                if (category.children && category.children.length > 0) {
                    category.children.forEach(child => {
                        html += `<li style="padding-left: 20px;"><a href="category.html?id=${child.id}">${child.name}</a></li>`;
                    });
                }
            });
            mobileSubmenu.innerHTML = html;
        }
        
        // Update category cards on homepage (if we're on homepage)
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            const categoryGrid = document.querySelector('.categories-grid');
            if (categoryGrid) {
                const activeCategories = window.CATEGORIES.getActiveCategories();
                let html = '';
                activeCategories.slice(0, 4).forEach(category => {
                    html += `
                        <a href="category.html?id=${category.id}" class="category-card">
                            <div class="category-image">
                                <img src="${category.image || 'images/category-default.jpg'}" alt="${category.name}">
                            </div>
                            <div class="category-content">
                                <h3>${category.name}</h3>
                                <span class="shop-link">Shop Now <i class="fas fa-arrow-right"></i></span>
                            </div>
                        </a>
                    `;
                });
                categoryGrid.innerHTML = html;
                console.log('[DEBUG] category-manager.js: Updated homepage category cards');
            }
        }
        
    } catch (error) {
        console.error('[DEBUG] category-manager.js: Error updating site navigation:', error);
    }
}
};



// Initialize CategoryManager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.CategoryManager) {
            window.CategoryManager.init();
        }
    });
} else {
    if (window.CategoryManager) {
        window.CategoryManager.init();
    }
}

console.log('[DEBUG] category-manager.js: CategoryManager object defined');
