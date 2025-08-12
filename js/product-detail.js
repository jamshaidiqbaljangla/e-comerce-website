/**
 * Product Detail Page Functionality
 * Handles product gallery, tabs, quantity adjustment, and other product-specific interactions
 */

// Wrap in an IIFE to avoid global scope pollution
const ProductDetail = (function() {
    'use strict';
    
    // State management
    const state = {
        product: null,
        quantity: 1,
        selectedColor: null,
        selectedVariations: {},
        currentTab: 'description',
        reviewsLoaded: false
    };
    
    // DOM elements cache
    let elements = {};
    
    /**
     * Initialize the product detail page
     */
    function init() {
        console.log('[DEBUG] ProductDetail: Initializing...');
        
        // Cache DOM elements
        cacheElements();
        
        // Get product data
        loadProductData();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('[DEBUG] ProductDetail: Initialization complete.');
    }
    
    /**
     * Cache DOM elements for faster access
     */
    function cacheElements() {
        elements = {
            // Product details elements
            productContainer: document.querySelector('.product-details'),
            productTitle: document.querySelector('.product-title'),
            productPrice: document.querySelector('.product-price'),
            currentPrice: document.querySelector('.current-price'),
            oldPrice: document.querySelector('.old-price'),
            discountBadge: document.querySelector('.discount-badge'),
            mainImage: document.getElementById('main-product-image'),
            thumbnails: document.querySelectorAll('.thumbnail'),
            colorOptions: document.querySelectorAll('.color-option'),
            selectedVariation: document.querySelector('.selected-variation'),
            quantityInput: document.getElementById('product-quantity'),
            decreaseQuantityBtn: document.querySelector('.quantity-decrease'),
            increaseQuantityBtn: document.querySelector('.quantity-increase'),
            addToCartBtn: document.querySelector('.add-to-cart-btn'),
            wishlistBtn: document.querySelector('.wishlist-btn'),
            
            // Tab elements
            tabButtons: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Product zoom elements
            productZoom: document.querySelector('.product-zoom'),
            zoomModal: document.getElementById('image-zoom-modal'),
            zoomedImage: document.getElementById('zoomed-image'),
            zoomThumbnails: document.querySelector('.zoom-thumbnails'),
            zoomClose: document.querySelector('.zoom-close')
        };
    }
    
    /**
     * Load product data from the page or API
     */
    function loadProductData() {
        // Get product ID from the page
        const productContainer = elements.productContainer;
        if (!productContainer) {
            console.error('[DEBUG] ProductDetail: Product container not found.');
            return;
        }
        
        const productId = productContainer.getAttribute('data-product-id');
        if (!productId) {
            console.error('[DEBUG] ProductDetail: Product ID not specified in data-product-id attribute.');
            return;
        }
        
        // Check if window.PRODUCTS is available
        if (typeof window.PRODUCTS === 'undefined' || !window.PRODUCTS.getProductById) {
            console.error('[DEBUG] ProductDetail: PRODUCTS data not available.');
            return;
        }
        
        // Get product data
        const product = window.PRODUCTS.getProductById(productId);
        if (!product) {
            console.error(`[DEBUG] ProductDetail: Product with ID ${productId} not found.`);
            return;
        }
        
        // Store product in state
        state.product = product;
        
        // Set initial color selection
        if (elements.colorOptions && elements.colorOptions.length > 0) {
            const selectedColor = elements.colorOptions[0].getAttribute('data-color');
            state.selectedColor = selectedColor;
        }
        
        // Update product detail page
        updateProductDisplay();
    }
    
    /**
     * Update product display with loaded data
     */
    function updateProductDisplay() {
        // This would update dynamic content if needed
        // For this implementation, we'll use the static HTML provided
        
        // If we were getting data from an API, we'd update things like:
        // - Product title
        // - Prices
        // - Images
        // - Description
        // - Variations
        console.log('[DEBUG] ProductDetail: Using static product data');
    }
    
    /**
     * Set up event listeners for product interactions
     */
    function setupEventListeners() {
        // Thumbnail click
        if (elements.thumbnails) {
            elements.thumbnails.forEach(thumbnail => {
                thumbnail.addEventListener('click', handleThumbnailClick);
            });
        }
        
        // Color options click
        if (elements.colorOptions) {
            elements.colorOptions.forEach(option => {
                option.addEventListener('click', handleColorOptionClick);
            });
        }
        
        // Quantity adjustment
        if (elements.decreaseQuantityBtn) {
            elements.decreaseQuantityBtn.addEventListener('click', decreaseQuantity);
        }
        
        if (elements.increaseQuantityBtn) {
            elements.increaseQuantityBtn.addEventListener('click', increaseQuantity);
        }
        
        if (elements.quantityInput) {
            elements.quantityInput.addEventListener('change', updateQuantity);
        }
        
        // Add to cart button
        if (elements.addToCartBtn) {
            elements.addToCartBtn.addEventListener('click', handleAddToCart);
        }
        
        // Wishlist button
        if (elements.wishlistBtn) {
            elements.wishlistBtn.addEventListener('click', handleWishlistToggle);
        }
        
        // Tab buttons
        if (elements.tabButtons) {
            elements.tabButtons.forEach(button => {
                button.addEventListener('click', handleTabClick);
            });
        }
        
        // Product zoom
        if (elements.productZoom) {
            elements.productZoom.addEventListener('click', openZoomModal);
        }
        
        if (elements.zoomClose) {
            elements.zoomClose.addEventListener('click', closeZoomModal);
        }
        
        // Review link scroll
        const reviewLink = document.querySelector('.review-link');
        if (reviewLink) {
            reviewLink.addEventListener('click', function(e) {
                e.preventDefault();
                const reviewsTab = document.querySelector('.tab-btn[data-tab="reviews"]');
                if (reviewsTab) {
                    reviewsTab.click();
                    
                    // Scroll to reviews tab
                    const reviewsSection = document.getElementById('reviews-tab');
                    if (reviewsSection) {
                        setTimeout(() => {
                            reviewsSection.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                    }
                }
            });
        }
    }
    
    /**
     * Handle thumbnail click
     * @param {Event} event - The click event
     */
    function handleThumbnailClick(event) {
        const thumbnail = event.currentTarget;
        const imageUrl = thumbnail.getAttribute('data-image');
        
        // Update main image
        if (elements.mainImage && imageUrl) {
            elements.mainImage.src = imageUrl;
            
            // Update active thumbnail
            elements.thumbnails.forEach(thumb => {
                thumb.classList.remove('active');
            });
            thumbnail.classList.add('active');
            elements.thumbnails.forEach(thumb => {
                thumb.classList.remove('active');
            });
            thumbnail.classList.add('active');
        }
    }
    
    /**
     * Handle color option click
     * @param {Event} event - The click event
     */
    function handleColorOptionClick(event) {
        const colorOption = event.currentTarget;
        const color = colorOption.getAttribute('data-color');
        
        // Update selected color
        state.selectedColor = color;
        
        // Update UI
        elements.colorOptions.forEach(option => {
            option.classList.remove('selected');
        });
        colorOption.classList.add('selected');
        
        // Update selected variation text
        if (elements.selectedVariation) {
            elements.selectedVariation.textContent = color;
        }
    }
    
    /**
     * Decrease quantity
     */
    function decreaseQuantity() {
        if (!elements.quantityInput) return;
        
        const currentValue = parseInt(elements.quantityInput.value, 10);
        const minValue = parseInt(elements.quantityInput.getAttribute('min'), 10) || 1;
        
        if (currentValue > minValue) {
            elements.quantityInput.value = currentValue - 1;
            state.quantity = currentValue - 1;
        }
    }
    
    /**
     * Increase quantity
     */
    function increaseQuantity() {
        if (!elements.quantityInput) return;
        
        const currentValue = parseInt(elements.quantityInput.value, 10);
        const maxValue = parseInt(elements.quantityInput.getAttribute('max'), 10) || 999;
        
        if (currentValue < maxValue) {
            elements.quantityInput.value = currentValue + 1;
            state.quantity = currentValue + 1;
        }
    }
    
    /**
     * Update quantity from input
     */
    function updateQuantity() {
        if (!elements.quantityInput) return;
        
        let value = parseInt(elements.quantityInput.value, 10);
        const minValue = parseInt(elements.quantityInput.getAttribute('min'), 10) || 1;
        const maxValue = parseInt(elements.quantityInput.getAttribute('max'), 10) || 999;
        
        // Ensure value is within range
        if (isNaN(value) || value < minValue) {
            value = minValue;
        } else if (value > maxValue) {
            value = maxValue;
        }
        
        elements.quantityInput.value = value;
        state.quantity = value;
    }
    
    /**
     * Handle add to cart button click
     */
    function handleAddToCart() {
        // Check if CartManager is available
        if (typeof window.CartManager === 'undefined' || !window.CartManager.addToCart) {
            console.error('[DEBUG] ProductDetail: CartManager not available.');
            return;
        }
        
        // Get product ID from the page
        const productContainer = elements.productContainer;
        if (!productContainer) return;
        
        const productId = productContainer.getAttribute('data-product-id');
        if (!productId) return;
        
        // Get quantity
        const quantity = state.quantity;
        
        // Add to cart
        window.CartManager.addToCart(productId, quantity, {
            color: state.selectedColor
        });
    }
    
    /**
     * Handle wishlist button toggle
     */
    function handleWishlistToggle() {
        // Check if WishlistManager is available
        if (typeof window.WishlistManager === 'undefined' || !window.WishlistManager.toggleWishlistItem) {
            console.error('[DEBUG] ProductDetail: WishlistManager not available.');
            return;
        }
        
        // Get product ID from the page
        const productContainer = elements.productContainer;
        if (!productContainer) return;
        
        const productId = productContainer.getAttribute('data-product-id');
        if (!productId) return;
        
        // Toggle wishlist item
        const isAdded = window.WishlistManager.toggleWishlistItem(productId);
        
        // Update UI
        if (elements.wishlistBtn) {
            if (isAdded) {
                elements.wishlistBtn.classList.add('active');
                elements.wishlistBtn.querySelector('i').classList.remove('far');
                elements.wishlistBtn.querySelector('i').classList.add('fas');
            } else {
                elements.wishlistBtn.classList.remove('active');
                elements.wishlistBtn.querySelector('i').classList.remove('fas');
                elements.wishlistBtn.querySelector('i').classList.add('far');
            }
        }
    }
    
    /**
     * Handle tab click
     * @param {Event} event - The click event
     */
    function handleTabClick(event) {
        const tabButton = event.currentTarget;
        const tabName = tabButton.getAttribute('data-tab');
        
        // Update active tab
        elements.tabButtons.forEach(button => {
            button.classList.remove('active');
        });
        tabButton.classList.add('active');
        
        // Update active tab content
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Track current tab
        state.currentTab = tabName;
        
        // Load reviews if needed
        if (tabName === 'reviews' && !state.reviewsLoaded) {
            loadReviews();
        }
    }
    
    /**
     * Load reviews for the product
     */
    function loadReviews() {
        // Check if ProductReviewsIntegration is available
        if (typeof window.ProductReviewsIntegration !== 'undefined' && typeof window.ProductReviewsIntegration.init === 'function') {
            window.ProductReviewsIntegration.init();
            state.reviewsLoaded = true;
        } else {
            console.log('[DEBUG] ProductDetail: ProductReviewsIntegration not available. Using static review data.');
        }
    }
    
    /**
     * Open zoom modal
     */
    function openZoomModal() {
        if (!elements.zoomModal || !elements.mainImage) return;
        
        // Set zoomed image
        elements.zoomedImage.src = elements.mainImage.src;
        
        // Create thumbnails if needed
        if (elements.zoomThumbnails && elements.thumbnails.length > 0) {
            elements.zoomThumbnails.innerHTML = '';
            
            elements.thumbnails.forEach((thumbnail, index) => {
                const imageUrl = thumbnail.getAttribute('data-image');
                
                const thumbElement = document.createElement('div');
                thumbElement.classList.add('zoom-thumbnail');
                if (elements.mainImage.src === imageUrl) {
                    thumbElement.classList.add('active');
                }
                
                const thumbImage = document.createElement('img');
                thumbImage.src = imageUrl;
                thumbImage.alt = `Thumbnail ${index + 1}`;
                
                thumbElement.appendChild(thumbImage);
                elements.zoomThumbnails.appendChild(thumbElement);
                
                // Add click event
                thumbElement.addEventListener('click', () => {
                    elements.zoomedImage.src = imageUrl;
                    
                    const allThumbs = elements.zoomThumbnails.querySelectorAll('.zoom-thumbnail');
                    allThumbs.forEach(thumb => {
                        thumb.classList.remove('active');
                    });
                    thumbElement.classList.add('active');
                });
            });
        }
        
        // Show modal
        elements.zoomModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    /**
     * Close zoom modal
     */
    function closeZoomModal() {
        if (!elements.zoomModal) return;
        
        elements.zoomModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // Public API
    return {
        init: init
    };
})();

// Initialize the product detail page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    ProductDetail.init();
});