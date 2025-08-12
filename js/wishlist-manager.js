/**
 * BINGO E-commerce Wishlist Manager
 * Handles all wishlist functionality with localStorage persistence
 */

window.WishlistManager = {
    // Wishlist data structure
    wishlist: {
        items: []
    },

    /**
     * Initialize the wishlist manager
     */
    init: function() {
        console.log('[DEBUG] wishlist-manager.js: Wishlist Manager initializing...');
        this.loadWishlistFromStorage();
        this.bindEvents();
        this.updateWishlistDisplay();
        console.log('[DEBUG] wishlist-manager.js: Wishlist Manager initialized.');
    },

    /**
     * Bind all wishlist-related events
     */
    bindEvents: function() {
        console.log('[DEBUG] wishlist-manager.js: Binding events...');
        
        // Use event delegation for wishlist buttons
        document.body.addEventListener('click', (e) => {
            const wishlistBtn = e.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                e.preventDefault();
                const productCard = wishlistBtn.closest('.product-card');
                if (!productCard) return;
                
                const productId = productCard.getAttribute('data-product-id');
                if (!productId) {
                    console.error('[DEBUG] wishlist-manager.js: Product ID missing for wishlist action');
                    return;
                }
                
                // Toggle wishlist status
                if (this.isInWishlist(productId)) {
                    this.removeItem(productId);
                    wishlistBtn.classList.remove('active');
                    const icon = wishlistBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                    }
                    if (window.CartManager) {
                        window.CartManager.showNotification("Removed from wishlist");
                    }
                } else {
                    this.addItem(this.getProductData(productCard));
                    wishlistBtn.classList.add('active');
                    const icon = wishlistBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                    if (window.CartManager) {
                        window.CartManager.showNotification("Added to wishlist!", "success");
                    }
                }
            }
            
            // Handle remove from wishlist on the wishlist page
            const removeFromWishlistBtn = e.target.closest('.remove-from-wishlist');
            if (removeFromWishlistBtn) {
                e.preventDefault();
                const wishlistItem = removeFromWishlistBtn.closest('.wishlist-item');
                if (!wishlistItem) return;
                
                const productId = wishlistItem.getAttribute('data-product-id');
                if (!productId) {
                    console.error('[DEBUG] wishlist-manager.js: Product ID missing for wishlist removal');
                    return;
                }
                
                this.removeItem(productId);
                if (window.CartManager) {
                    window.CartManager.showNotification("Removed from wishlist");
                }
            }
            
            // Handle add to cart from wishlist
            const addToCartFromWishlistBtn = e.target.closest('.move-to-cart');
            if (addToCartFromWishlistBtn) {
                e.preventDefault();
                const wishlistItem = addToCartFromWishlistBtn.closest('.wishlist-item');
                if (!wishlistItem) return;
                
                const productId = wishlistItem.getAttribute('data-product-id');
                if (!productId) {
                    console.error('[DEBUG] wishlist-manager.js: Product ID missing for add to cart action');
                    return;
                }
                
                const item = this.getItemById(productId);
                if (!item) {
                    console.error('[DEBUG] wishlist-manager.js: Wishlist item not found');
                    return;
                }
                
                if (window.CartManager && typeof window.CartManager.addItem === 'function') {
                    window.CartManager.addItem({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        image: item.image,
                        quantity: 1
                    });
                }
            }
        });
        
        console.log('[DEBUG] wishlist-manager.js: Event bindings complete.');
    },
    
    /**
     * Extract product data from product card
     */
    getProductData: function(productCard) {
        try {
            // First try to get from PRODUCTS data
            const productId = productCard.getAttribute('data-product-id');
            if (typeof window.PRODUCTS !== 'undefined' && typeof window.PRODUCTS.getProductById === 'function') {
                const productData = window.PRODUCTS.getProductById(productId);
                if (productData) {
                    return {
                        id: productData.id,
                        name: productData.name,
                        price: productData.price,
                        image: productData.images.primary
                    };
                }
            }
            
            // If not found, extract from DOM
            const nameElement = productCard.querySelector('.product-title a');
            const priceElement = productCard.querySelector('.current-price');
            const imageElement = productCard.querySelector('.primary-image');
            
            if (!nameElement || !priceElement || !imageElement) {
                throw new Error("Could not find all required product elements");
            }
            
            const name = nameElement.textContent;
            const priceText = priceElement.textContent.replace(/[^0-9.]/g, '');
            const price = parseFloat(priceText);
            const image = imageElement.getAttribute('src');
            
            if (!name || isNaN(price) || !image) {
                throw new Error("Invalid product data extracted from DOM");
            }
            
            return {
                id: productId,
                name: name,
                price: price,
                image: image
            };
        } catch (error) {
            console.error('[DEBUG] wishlist-manager.js: Error extracting product data:', error);
            return null;
        }
    },

    /**
     * Add item to wishlist
     */
    addItem: function(item) {
        if (!item) return;
        
        console.log('[DEBUG] wishlist-manager.js: Adding item to wishlist:', item);
        
        // Check if already in wishlist
        if (this.isInWishlist(item.id)) {
            console.log('[DEBUG] wishlist-manager.js: Item already in wishlist');
            return;
        }
        
        this.wishlist.items.push(item);
        this.saveWishlistToStorage();
        this.updateWishlistCount();
        this.updateWishlistDisplay();
    },

    /**
     * Remove item from wishlist
     */
    removeItem: function(itemId) {
        console.log('[DEBUG] wishlist-manager.js: Removing item ID from wishlist:', itemId);
        this.wishlist.items = this.wishlist.items.filter(item => item.id !== itemId);
        this.saveWishlistToStorage();
        this.updateWishlistCount();
        this.updateWishlistDisplay();
    },

    /**
     * Check if an item is in the wishlist
     */
    isInWishlist: function(itemId) {
        return this.wishlist.items.some(item => item.id === itemId);
    },
    
    /**
     * Get wishlist item by ID
     */
    getItemById: function(itemId) {
        return this.wishlist.items.find(item => item.id === itemId);
    },

    /**
     * Save wishlist to localStorage
     */
    saveWishlistToStorage: function() {
        try {
            localStorage.setItem('bingoWishlist', JSON.stringify(this.wishlist));
            console.log('[DEBUG] wishlist-manager.js: Wishlist saved to localStorage.');
        } catch (e) {
            console.error('[DEBUG] wishlist-manager.js: Error saving wishlist to localStorage:', e);
        }
    },

    /**
     * Load wishlist from localStorage
     */
    loadWishlistFromStorage: function() {
        console.log('[DEBUG] wishlist-manager.js: Loading wishlist from localStorage...');
        const savedWishlist = localStorage.getItem('bingoWishlist');
        if (savedWishlist) {
            try {
                const parsedWishlist = JSON.parse(savedWishlist);
                if (parsedWishlist && Array.isArray(parsedWishlist.items)) {
                    this.wishlist = parsedWishlist;
                    console.log('[DEBUG] wishlist-manager.js: Wishlist loaded from localStorage:', this.wishlist);
                } else {
                    console.warn('[DEBUG] wishlist-manager.js: Invalid wishlist data in localStorage. Resetting.');
                    this.resetWishlist();
                }
            } catch (e) {
                console.error('[DEBUG] wishlist-manager.js: Error parsing wishlist from localStorage. Resetting wishlist.', e);
                this.resetWishlist();
            }
        } else {
            console.log('[DEBUG] wishlist-manager.js: No wishlist data found in localStorage. Using default empty wishlist.');
            this.resetWishlist();
        }
    },
    
    /**
     * Reset wishlist to default state
     */
    resetWishlist: function() {
        this.wishlist = { items: [] };
        this.saveWishlistToStorage();
    },

    /**
     * Update wishlist count in header
     */
    updateWishlistCount: function() {
        const wishlistCountElement = document.querySelector('.wishlist-count');
        if (wishlistCountElement) {
            wishlistCountElement.textContent = this.wishlist.items.length;
        }
    },

    /**
     * Update wishlist display on wishlist page
     */
    updateWishlistDisplay: function() {
        // Update wishlist buttons on all product cards
        document.querySelectorAll('.product-card').forEach(card => {
            const productId = card.getAttribute('data-product-id');
            if (!productId) return;
            
            const wishlistBtn = card.querySelector('.wishlist-btn');
            if (!wishlistBtn) return;
            
            if (this.isInWishlist(productId)) {
                wishlistBtn.classList.add('active');
                const icon = wishlistBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
            }
        });
        
        // Update wishlist page if on it
        const wishlistGrid = document.querySelector('.wishlist-grid');
        if (!wishlistGrid) return;
        
        if (this.wishlist.items.length === 0) {
            wishlistGrid.innerHTML = `
                <div class="empty-wishlist">
                    <i class="far fa-heart"></i>
                    <p>Your wishlist is currently empty</p>
                    <a href="shop.html" class="btn btn-dark">Start Shopping</a>
                </div>
            `;
        } else {
            let html = '';
            this.wishlist.items.forEach(item => {
                html += `
                    <div class="wishlist-item" data-product-id="${item.id}">
                        <div class="wishlist-item-image">
                            <a href="product.html?id=${item.id}">
                                <img src="${item.image}" alt="${item.name}">
                            </a>
                        </div>
                        <div class="wishlist-item-content">
                            <h3 class="item-title">
                                <a href="product.html?id=${item.id}">${item.name}</a>
                            </h3>
                            <div class="item-price">$${item.price.toFixed(2)}</div>
                            <div class="item-actions">
                                <button class="btn btn-dark move-to-cart">Add to Cart</button>
                                <button class="btn btn-outline remove-from-wishlist">Remove</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            wishlistGrid.innerHTML = html;
        }
    }
};

// Initialize wishlist manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.WishlistManager) {
            window.WishlistManager.init();
        }
    });
} else {
    if (window.WishlistManager) {
        window.WishlistManager.init();
    }
}

console.log('[DEBUG] wishlist-manager.js: WishlistManager object defined');