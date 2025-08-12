/**
 * BINGO E-commerce Category Data Manager
 * Centralized category data management system - similar to products-data.js
 */

window.CATEGORIES = {
    // Storage key for categories data
    STORAGE_KEY: 'bingo_categories_data',
    
    // Cache for category data
    categories: new Map(),
    hierarchy: new Map(), // parent_id -> [child_ids]
    
    // Default categories for first load
    defaultCategories: [
        {
            id: '1',
            name: 'Premium Collection',
            slug: 'premium-collection',
            description: 'High-end luxury items with premium materials and exceptional craftsmanship',
            parentId: null,
            isActive: true,
            sortOrder: 1,
            color: '#007bff',
            productCount: 24,
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center',
            metaDescription: 'Premium luxury products with exceptional quality and design',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Urban Series',
            slug: 'urban-series',
            description: 'Modern urban lifestyle products for contemporary living',
            parentId: '1',
            isActive: true,
            sortOrder: 2,
            color: '#28a745',
            productCount: 18,
            image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center',
            metaDescription: 'Urban lifestyle products for modern city living',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '3',
            name: 'Lifestyle Essentials',
            slug: 'lifestyle-essentials',
            description: 'Essential items for everyday lifestyle and comfort',
            parentId: null,
            isActive: true,
            sortOrder: 3,
            color: '#ffc107',
            productCount: 32,
            image: 'https://images.unsplash.com/photo-1586880244386-8b3c109b3b86?w=400&h=400&fit=crop&crop=center',
            metaDescription: 'Essential lifestyle products for everyday comfort and convenience',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '4',
            name: 'Limited Edition',
            slug: 'limited-edition',
            description: 'Exclusive limited edition products available for a short time',
            parentId: null,
            isActive: false,
            sortOrder: 4,
            color: '#dc3545',
            productCount: 8,
            image: 'https://images.unsplash.com/photo-1589834390005-5d4fb3d32?w=400&h=400&fit=crop&crop=center',
            metaDescription: 'Exclusive limited edition products with unique designs',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            id: '5',
            name: 'Summer Collection',
            slug: 'summer-collection',
            description: 'Bright and vibrant products perfect for the summer season',
            parentId: '3',
            isActive: true,
            sortOrder: 5,
            color: '#fd7e14',
            productCount: 15,
            image: 'https://images.unsplash.com/photo-1536431311719-398b6704d4cc?w=400&h=400&fit=crop&crop=center',
            metaDescription: 'Summer collection featuring bright and vibrant seasonal products',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],

    /**
     * Initialize the category data system
     */
    init: async function() {
        console.log('[DEBUG] category-data.js: Initializing CATEGORIES system...');
        
        try {
            await this.loadCategories();
            this.buildHierarchy();
            
            console.log('[DEBUG] category-data.js: Categories loaded:', this.categories.size);
            console.log('[DEBUG] category-data.js: Hierarchy built:', this.hierarchy.size);
            
            // Dispatch event for other components
            // Dispatch update event with more details
document.dispatchEvent(new CustomEvent('categoriesLoaded', {
    detail: { categories: this.getAllCategories() }
}));

// Also dispatch to window for cross-frame communication
if (window.parent !== window) {
    try {
        window.parent.dispatchEvent(new CustomEvent('categoriesUpdated', {
            detail: { categories: this.getAllCategories() }
        }));
    } catch (e) {
        console.log('[DEBUG] category-data.js: Could not dispatch to parent window');
    }
}
            
            return true;
        } catch (error) {
            console.error('[DEBUG] category-data.js: Error initializing categories:', error);
            return false;
        }
    },

    /**
     * Load categories from localStorage or set defaults
     */
    loadCategories: async function() {
    try {
        const storedData = localStorage.getItem(this.STORAGE_KEY);
        
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            console.log('[DEBUG] category-data.js: Loaded categories from storage:', parsedData.length);
            
            // Check if we actually have categories or just an empty array
            if (parsedData && Array.isArray(parsedData) && parsedData.length > 0) {
                // Convert array to Map
                parsedData.forEach(category => {
                    this.categories.set(category.id, category);
                });
            } else {
                console.log('[DEBUG] category-data.js: Storage contains empty array, using defaults');
                await this.setDefaultCategories();
            }
        } else {
            console.log('[DEBUG] category-data.js: No stored categories found, using defaults');
            await this.setDefaultCategories();
        }
    } catch (error) {
        console.error('[DEBUG] category-data.js: Error loading categories:', error);
        await this.setDefaultCategories();
    }
},

    /**
     * Set default categories and save to storage
     */
    setDefaultCategories: async function() {
        console.log('[DEBUG] category-data.js: Setting default categories');
        
        this.categories.clear();
        this.defaultCategories.forEach(category => {
            this.categories.set(category.id, { ...category });
        });
        
        await this.saveCategories();
    },

    /**
     * Save categories to localStorage
     */
    saveCategories: async function() {
        try {
            const categoriesArray = Array.from(this.categories.values());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(categoriesArray));
            
            console.log('[DEBUG] category-data.js: Categories saved to storage:', categoriesArray.length);
            
            // Rebuild hierarchy after save
            this.buildHierarchy();
            
            // Dispatch update event
            document.dispatchEvent(new CustomEvent('categoriesLoaded', {
    detail: { categories: this.getAllCategories() }
}));
            
            return true;
        } catch (error) {
            console.error('[DEBUG] category-data.js: Error saving categories:', error);
            return false;
        }
    },

    /**
     * Build category hierarchy map
     */
    buildHierarchy: function() {
        this.hierarchy.clear();
        
        this.categories.forEach(category => {
            if (category.parentId) {
                if (!this.hierarchy.has(category.parentId)) {
                    this.hierarchy.set(category.parentId, []);
                }
                this.hierarchy.get(category.parentId).push(category.id);
            }
        });
        
        console.log('[DEBUG] category-data.js: Hierarchy built with', this.hierarchy.size, 'parent categories');
    },

    /**
     * Get all categories as array
     */
    getAllCategories: function() {
        return Array.from(this.categories.values())
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    },

    /**
     * Get active categories only
     */
    getActiveCategories: function() {
        return this.getAllCategories().filter(category => category.isActive);
    },

    /**
     * Get root categories (no parent)
     */
    getRootCategories: function() {
        return this.getAllCategories().filter(category => !category.parentId);
    },

    /**
     * Get child categories of a parent
     */
    getChildCategories: function(parentId) {
        const childIds = this.hierarchy.get(parentId) || [];
        return childIds.map(id => this.categories.get(id)).filter(Boolean);
    },

    /**
     * Get category by ID
     */
    getCategoryById: function(id) {
        return this.categories.get(id);
    },

    /**
     * Get category by slug
     */
    getCategoryBySlug: function(slug) {
        for (const category of this.categories.values()) {
            if (category.slug === slug) {
                return category;
            }
        }
        return null;
    },

    /**
     * Add or update category
     */
    saveCategory: async function(categoryData) {
        try {
            // Generate ID if not provided
            if (!categoryData.id) {
                categoryData.id = this.generateId();
            }

            // Set timestamps
            const now = new Date().toISOString();
            if (!categoryData.createdAt) {
                categoryData.createdAt = now;
            }
            categoryData.updatedAt = now;

            // Update product count from PRODUCTS if available
            if (window.PRODUCTS && window.PRODUCTS.items) {
                categoryData.productCount = this.calculateProductCount(categoryData.id);
            }

            this.categories.set(categoryData.id, categoryData);
            await this.saveCategories();
            
            console.log('[DEBUG] category-data.js: Category saved:', categoryData.id);
            return categoryData;
        } catch (error) {
            console.error('[DEBUG] category-data.js: Error saving category:', error);
            throw error;
        }
    },

    /**
     * Delete category
     */
    deleteCategory: async function(categoryId) {
        try {
            // Check if category has children
            const children = this.getChildCategories(categoryId);
            if (children.length > 0) {
                throw new Error('Cannot delete category with subcategories');
            }

            this.categories.delete(categoryId);
            await this.saveCategories();
            
            console.log('[DEBUG] category-data.js: Category deleted:', categoryId);
            return true;
        } catch (error) {
            console.error('[DEBUG] category-data.js: Error deleting category:', error);
            throw error;
        }
    },

    /**
     * Generate unique category ID
     */
    generateId: function() {
        return 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Calculate product count for category
     */
    calculateProductCount: function(categoryId) {
        if (!window.PRODUCTS || !window.PRODUCTS.items) {
            return 0;
        }

        return window.PRODUCTS.items.filter(product => 
            product.categories && product.categories.includes(categoryId)
        ).length;
    },

    /**
     * Update product counts for all categories
     */
    updateProductCounts: async function() {
        let updated = false;
        
        this.categories.forEach((category, id) => {
            const newCount = this.calculateProductCount(id);
            if (category.productCount !== newCount) {
                category.productCount = newCount;
                category.updatedAt = new Date().toISOString();
                updated = true;
            }
        });

        if (updated) {
            await this.saveCategories();
            console.log('[DEBUG] category-data.js: Product counts updated');
        }
    },

    /**
     * Get category hierarchy tree structure
     */
    getCategoryTree: function() {
        const tree = [];
        const rootCategories = this.getRootCategories();

        function buildNode(category) {
            const node = { ...category };
            const children = this.getChildCategories(category.id);
            
            if (children.length > 0) {
                node.children = children.map(child => buildNode.call(this, child));
            }
            
            return node;
        }

        rootCategories.forEach(category => {
            tree.push(buildNode.call(this, category));
        });

        return tree;
    },

    /**
     * Get categories formatted for navigation menus
     */
    getNavigationCategories: function() {
        return this.getActiveCategories()
            .filter(category => !category.parentId) // Only root categories for main nav
            .slice(0, 6) // Limit for navigation
            .map(category => ({
                id: category.id,
                name: category.name,
                slug: category.slug,
                url: `category.html?id=${category.id}`,
                children: this.getChildCategories(category.id)
                    .filter(child => child.isActive)
                    .map(child => ({
                        id: child.id,
                        name: child.name,
                        slug: child.slug,
                        url: `category.html?id=${child.id}`
                    }))
            }));
    },

    /**
     * Search categories by name or description
     */
    searchCategories: function(query) {
        if (!query || query.trim() === '') {
            return this.getAllCategories();
        }

        const searchTerm = query.toLowerCase().trim();
        return this.getAllCategories().filter(category =>
            category.name.toLowerCase().includes(searchTerm) ||
            (category.description && category.description.toLowerCase().includes(searchTerm)) ||
            category.slug.toLowerCase().includes(searchTerm)
        );
    },

    /**
     * Export categories data (for admin)
     */
    exportCategories: function() {
        const data = {
            categories: this.getAllCategories(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bingo-categories-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Import categories data (for admin)
     */
    importCategories: async function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.categories && Array.isArray(data.categories)) {
                        this.categories.clear();
                        
                        data.categories.forEach(category => {
                            this.categories.set(category.id, category);
                        });
                        
                        await this.saveCategories();
                        resolve(data.categories.length);
                    } else {
                        reject(new Error('Invalid categories data format'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
};

// Auto-initialize when script loads
// Auto-initialize when script loads with proper error handling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            await window.CATEGORIES.init();
        } catch (error) {
            console.error('[DEBUG] category-data.js: Auto-initialization failed:', error);
        }
    });
} else {
    // Use setTimeout to ensure script is fully loaded
    setTimeout(async () => {
        try {
            await window.CATEGORIES.init();
        } catch (error) {
            console.error('[DEBUG] category-data.js: Auto-initialization failed:', error);
        }
    }, 0);
}

console.log('[DEBUG] category-data.js: CATEGORIES object defined and initializing...');