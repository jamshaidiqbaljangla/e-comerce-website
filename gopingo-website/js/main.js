// It's good practice to wrap your main.js code in a DOMContentLoaded listener
// It's good practice to wrap your main.js code in a DOMContentLoaded listener
// if it's not already, or ensure it runs after the DOM is ready.

console.log('[DEBUG] main.js: Script starting to execute...');

const app = {
    init: function() {
        console.log('[DEBUG] main.js: app.init() called.');
        
        // First initialize UI components that don't depend on PRODUCTS
        this.headerScroll();
        this.heroSlider();
        this.mobileMenu();
        this.headerDropdowns();
        this.quickView();
        this.productsSlider();
        this.countdownTimer();
        this.wishlistToggle();
        this.backToTop();
        this.animateOnScroll();
        this.setupAccountIconClick();
        // Setup enhanced product tabs
        this.setupProductTabs();
        
        // Add the new method for auth-required actions
        this.setupAuthRequiredActions();

        // Check for all required product data attributes on static HTML cards
        this.addProductIDsToStaticCards();

        // IMPROVED: Use a small delay to ensure all scripts are loaded
        setTimeout(() => {
            // Explicit checks for window.PRODUCTS, window.ProductRenderer, and window.CartManager
            if (typeof window.PRODUCTS !== 'undefined') {
                console.log('[DEBUG] main.js: PRODUCTS object found. Initializing ProductRenderer and CartManager...');
                
                if (typeof window.ProductRenderer !== 'undefined' && typeof window.ProductRenderer.init === 'function') {
    console.log('[DEBUG] main.js: Initializing ProductRenderer...');
    window.ProductRenderer.init();
} else {
    console.error('[DEBUG] main.js: ProductRenderer is NOT defined or ProductRenderer.init is not a function.');
}

                if (typeof window.CartManager !== 'undefined' && typeof window.CartManager.init === 'function') {
                    window.CartManager.init();
                } else {
                    console.error('[DEBUG] main.js: CartManager is NOT defined or CartManager.init is not a function.');
                }
                // In the app.init function
                if (typeof window.ShopManager !== 'undefined') {
                    window.ShopManager.init();
                } else {
                    console.error('[DEBUG] main.js: ShopManager is NOT defined or ShopManager.init is not a function.');
                }
                // In the app.init function in main.js
                // In the app.init function in main.js
if (typeof window.CategoryManager !== 'undefined') {
    window.CategoryManager.init();
    // Update category links throughout the site
    setTimeout(() => {
        if (window.CategoryManager.updateCategoryLinks) {
            window.CategoryManager.updateCategoryLinks();
        }
        // Also update navigation menus with live data
        if (window.CategoryManager.updateSiteNavigation) {
            window.CategoryManager.updateSiteNavigation();
        }
    }, 1000); // Increased timeout to ensure CATEGORIES is ready
}
                // In the app.init function
                if (typeof window.SearchManager !== 'undefined') {
                    window.SearchManager.init();
                }
                
                // Now initialize product tabs, which may depend on ProductRenderer
                this.productTabs();
            } else {
                console.error('[DEBUG] main.js: PRODUCTS data not loaded or invalid. Cannot initialize ProductRenderer or CartManager.');
                // Initialize tabs anyway, as they have static HTML fallback
                this.productTabs();
            }
        }, 500); // Small delay to ensure scripts have loaded
        
        console.log('[DEBUG] main.js: app.init() finished.');
    },

    // NEW: Adds product IDs to any static HTML product cards
    addProductIDsToStaticCards: function() {
        const staticCards = document.querySelectorAll('.product-card:not([data-product-id])');
        console.log(`[DEBUG] main.js: Found ${staticCards.length} static product cards without IDs`);
        
        staticCards.forEach((card, index) => {
            // Generate a unique ID for this static card
            const uniqueId = `static-product-${index + 1}`;
            card.setAttribute('data-product-id', uniqueId);
            console.log(`[DEBUG] main.js: Added data-product-id="${uniqueId}" to static product card`);
        });
    },

    headerScroll: function() {
        const header = document.querySelector('header');
        if (!header) return;
        let lastScrollTop = 0;
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > 200) {
                if (scrollTop > lastScrollTop) {
                    header.classList.add('hide');
                } else {
                    header.classList.remove('hide');
                }
            } else {
                 header.classList.remove('hide'); // Ensure header is visible if scrolled back to top
            }
            lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
        });
    },

    heroSlider: function() {
        const sliderContainer = document.querySelector('.hero-slider');
        if (!sliderContainer) return;

        const slides = sliderContainer.querySelectorAll('.hero-slide');
        const dotsContainer = document.querySelector('.hero-dots'); // Assuming one dot container for the hero
        const prevBtn = sliderContainer.parentElement.querySelector('.prev-slide');
        const nextBtn = sliderContainer.parentElement.querySelector('.next-slide');
        
        if (slides.length === 0) return;

        let currentSlide = 0;
        let slideInterval;
        let dots = []; // Will populate if dotsContainer exists

        function createDots() {
            if (!dotsContainer) return;
            dotsContainer.innerHTML = ''; // Clear existing dots
            slides.forEach((_, index) => {
                const button = document.createElement('button');
                button.classList.add('hero-dot');
                button.setAttribute('aria-label', `Slide ${index + 1}`);
                if (index === currentSlide) button.classList.add('active');
                button.addEventListener('click', () => {
                    currentSlide = index;
                    showSlide(currentSlide);
                    resetSlideInterval();
                });
                dotsContainer.appendChild(button);
                dots.push(button);
            });
        }
        
        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
            if (dots.length > 0) {
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }
            currentSlide = index; // ensure currentSlide is updated
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }

        function prevSlideFunc() { // Renamed to avoid conflict if prevBtn is named prevSlide
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        }

        function startSlideInterval() {
            clearInterval(slideInterval); // Clear existing interval before starting a new one
            slideInterval = setInterval(nextSlide, 5000);
        }

        function resetSlideInterval() {
            startSlideInterval(); // This already clears and restarts
        }
        
        if (dotsContainer) createDots(); else dots = document.querySelectorAll('.hero-dot'); // Fallback if dots are static

        showSlide(currentSlide); // Show initial slide
        startSlideInterval();

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                prevSlideFunc();
                resetSlideInterval();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                nextSlide();
                resetSlideInterval();
            });
        }
    },

    // UPDATED: Setup account icon click to show auth modal when not logged in
    setupAccountIconClick: function() {
        const accountLinks = document.querySelectorAll('.account-toggle');
        
        accountLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Check if user is logged in
                if (window.AuthManager && !window.AuthManager.isAuthenticated()) {
                    e.preventDefault();
                    
                    // Show auth modal instead of redirecting
                    if (window.AuthManager.showAuthModal) {
                        window.AuthManager.showAuthModal('login');
                    } else {
                        // Fallback if showAuthModal not available
                        window.location.href = 'login.html';
                    }
                } else {
                    // User is logged in, proceed to account page
                    if (!window.location.pathname.includes('account.html')) {
                        window.location.href = 'account.html';
                    }
                }
            });
        });
    },

    // UPDATED: Setup authentication for cart/wishlist actions
    setupAuthRequiredActions: function() {
        console.log('[DEBUG] main.js: Setting up auth-required actions');
        
        // Handle clicks on "Add to Cart" buttons
        document.body.addEventListener('click', function(e) {
            const addToCartBtn = e.target.closest('.add-to-cart-btn');
            if (addToCartBtn && !addToCartBtn.disabled) {
                console.log('[DEBUG] main.js: Add to cart button clicked');
                
                // If user is not authenticated, show login modal
                if (window.AuthManager && !window.AuthManager.isAuthenticated()) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[DEBUG] main.js: User not authenticated, showing auth modal');
                    
                    // Store the product ID to add to cart after login
                    const productCard = addToCartBtn.closest('.product-card') || 
                                        addToCartBtn.closest('.modal-content');
                    if (productCard) {
                        const productId = productCard.getAttribute('data-product-id');
                        if (productId) {
                            localStorage.setItem('pendingCartAdd', productId);
                            console.log('[DEBUG] main.js: Stored pending cart product ID:', productId);
                        }
                    }
                    
                    // Show auth modal
                    if (window.AuthManager.showAuthModal) {
                        window.AuthManager.showAuthModal('login');
                    } else {
                        // Fallback if showAuthModal not available
                        window.location.href = 'login.html';
                    }
                    return false;
                } else {
                    console.log('[DEBUG] main.js: User authenticated, proceeding with cart add');
                }
            }
        });
        
        // Handle clicks on wishlist buttons
        document.body.addEventListener('click', function(e) {
            const wishlistBtn = e.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                console.log('[DEBUG] main.js: Wishlist button clicked');
                
                // If user is not authenticated, show login modal
                if (window.AuthManager && !window.AuthManager.isAuthenticated()) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[DEBUG] main.js: User not authenticated, showing auth modal');
                    
                    // Store the product ID to add to wishlist after login
                    const productCard = wishlistBtn.closest('.product-card') || 
                                        wishlistBtn.closest('.modal-content');
                    if (productCard) {
                        const productId = productCard.getAttribute('data-product-id');
                        if (productId) {
                            localStorage.setItem('pendingWishlistAdd', productId);
                            console.log('[DEBUG] main.js: Stored pending wishlist product ID:', productId);
                        }
                    }
                    
                    // Show auth modal
                    if (window.AuthManager.showAuthModal) {
                        window.AuthManager.showAuthModal('login');
                    } else {
                        // Fallback if showAuthModal not available
                        window.location.href = 'login.html';
                    }
                    return false;
                } else {
                    console.log('[DEBUG] main.js: User authenticated, proceeding with wishlist add');
                }
            }
        });
        
        // Handle authentication complete event
        document.addEventListener('userAuthenticated', function() {
            console.log('[DEBUG] main.js: User authenticated event received');
            
            // Check if there's a pending cart add
            const pendingCartAdd = localStorage.getItem('pendingCartAdd');
            if (pendingCartAdd && window.CartManager && typeof window.CartManager.addToCart === 'function') {
                console.log('[DEBUG] main.js: Processing pending cart add for product:', pendingCartAdd);
                window.CartManager.addToCart(pendingCartAdd, 1);
                localStorage.removeItem('pendingCartAdd');
            }
            
            // FIXED: Using getItem instead of setItem
            const pendingWishlistAdd = localStorage.getItem('pendingWishlistAdd');
            if (pendingWishlistAdd && window.WishlistManager && typeof window.WishlistManager.addToWishlist === 'function') {
                console.log('[DEBUG] main.js: Processing pending wishlist add for product:', pendingWishlistAdd);
                window.WishlistManager.addToWishlist(pendingWishlistAdd);
                localStorage.removeItem('pendingWishlistAdd');
            }
        });
    },

    // In main.js, modify the productTabs function:
    productTabs: function() {
        const tabs = document.querySelectorAll('.product-tab');
        const tabContents = document.querySelectorAll('.tab-content, .product-tab-content'); // Added product-tab-content

        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const tabId = this.getAttribute('data-tab');
                tabContents.forEach(content => {
                    // Make sure both class and display style are set
                    if (content.id === tabId) {
                        content.classList.add('active');
                        content.style.display = 'block';
                    } else {
                        content.classList.remove('active');
                        content.style.display = 'none';
                    }
                });

                // Special handling for reviews tab
                if (tabId === 'reviews') {
                    console.log('[DEBUG] main.js: Reviews tab selected, handled by ReviewManager');
                    
                    // Force the customer-reviews container to be visible
                    const customerReviews = document.querySelector('.customer-reviews');
                    if (customerReviews) {
                        customerReviews.style.display = 'block';
                    }
                    
                    // Refresh reviews if ReviewManager is available
                    if (window.ReviewManager && typeof window.ReviewManager.renderReviews === 'function') {
                        window.ReviewManager.renderReviews();
                    }
                    return; // Skip ProductRenderer for reviews
                }

                if (typeof window.ProductRenderer !== 'undefined' && typeof window.ProductRenderer.loadTabContent === 'function') {
                    console.log(`[DEBUG] main.js: Calling ProductRenderer.loadTabContent for tab: ${tabId}`);
                    try {
                        window.ProductRenderer.loadTabContent(tabId);
                    } catch (error) {
                        console.error(`[DEBUG] main.js: Error loading tab ${tabId}:`, error);
                    }
                } else {
                    console.error('[DEBUG] main.js: ProductRenderer.loadTabContent is not available.');
                    // Your original fallback from main.js if ProductRenderer isn't ready:
                    const tabContentElement = document.getElementById(tabId);
                    if (tabId !== 'trending' && tabContentElement && tabContentElement.children.length === 0) {
                        const trendingContentHTML = document.getElementById('trending')?.innerHTML || '';
                        if(trendingContentHTML) {
                            tabContentElement.innerHTML = trendingContentHTML;
                            // Basic text replacement, for proper functionality, ProductRenderer should handle this
                            tabContentElement.querySelectorAll('.product-title a').forEach(title => {
                                if (tabId === 'bestsellers') title.textContent = title.textContent.replace(/Collection|New Arrival/gi, 'Bestseller');
                                else if (tabId === 'newarrivals') title.textContent = title.textContent.replace(/Collection|Bestseller/gi, 'New Arrival');
                            });
                        }
                    }
                }
            });
        });
        
        // Ensure the default active tab's content is loaded if it's not 'trending' (which ProductRenderer.init handles)
        // Load initial active tab content with delay
        setTimeout(() => {
            const activeTab = document.querySelector('.product-tab.active');
            if (activeTab) {
                const activeTabId = activeTab.getAttribute('data-tab');
                if (activeTabId !== 'trending' && typeof window.ProductRenderer !== 'undefined' && typeof window.ProductRenderer.loadTabContent === 'function') {
                    console.log(`[DEBUG] main.js: Initial load for active tab: ${activeTabId}`);
                    try {
                        window.ProductRenderer.loadTabContent(activeTabId);
                    } catch (error) {
                        console.error(`[DEBUG] main.js: Error loading initial tab ${activeTabId}:`, error);
                    }
                }
            }
        }, 1000); // Give more time for API to be ready
    },

    // Enhanced tab switching with loading states
    setupProductTabs: function() {
        const tabButtons = document.querySelectorAll('.product-tab, .tab-btn');
        const tabContents = document.querySelectorAll('.tab-content, .product-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const targetTab = button.getAttribute('data-tab');
                if (!targetTab) return;
                
                // Update active states
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                button.classList.add('active');
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                    targetContent.style.display = 'block';
                    
                    // Load content if ProductRenderer is available
                    if (typeof window.ProductRenderer !== 'undefined' && window.ProductRenderer.loadTabContent) {
                        try {
                            await window.ProductRenderer.loadTabContent(targetTab);
                        } catch (error) {
                            console.error('Error loading tab content:', error);
                        }
                    }
                }
            });
        });
    },

    mobileMenu: function() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        const mobileMenuClose = document.querySelector('.mobile-menu-close');
        const submenuToggles = document.querySelectorAll('.mobile-nav .submenu-toggle'); //Scoped to mobile nav

        if (mobileMenuToggle && mobileMenuOverlay) {
            mobileMenuToggle.addEventListener('click', function() {
                this.classList.toggle('active');
                mobileMenuOverlay.classList.toggle('active');
                document.body.classList.toggle('menu-open');
            });
        }

        if (mobileMenuClose && mobileMenuOverlay) {
            mobileMenuClose.addEventListener('click', function() {
                if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        }

        // Click outside mobile menu content to close (if overlay is just a background)
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', function(e) {
                if (e.target === this) { // Click on the overlay itself, not its children
                    if (mobileMenuToggle) mobileMenuToggle.classList.remove('active');
                    this.classList.remove('active');
                    document.body.classList.remove('menu-open');
                }
            });
        }
        
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default if it's an <a> tag
                this.classList.toggle('active');
                const submenu = this.nextElementSibling; // Assuming submenu is the next sibling
                if (submenu && submenu.classList.contains('mobile-submenu')) {
                    submenu.classList.toggle('active');
                    // Simple slide toggle example (can be improved with max-height transition)
                    if (submenu.style.maxHeight && submenu.style.maxHeight !== '0px') {
                        submenu.style.maxHeight = '0px';
                    } else {
                        submenu.style.maxHeight = submenu.scrollHeight + "px";
                    }
                }
            });
        });
    },

    headerDropdowns: function() {
        // Desktop menu dropdowns (mega menu)
        const menuItemsWithDropdown = document.querySelectorAll('header nav .menu > li.dropdown');
        menuItemsWithDropdown.forEach(item => {
            item.addEventListener('mouseenter', () => item.classList.add('active'));
            item.addEventListener('mouseleave', () => item.classList.remove('active'));
             // For touch devices, a click might be needed
            item.querySelector('a').addEventListener('click', function(e) {
                if (window.innerWidth < 992 && this.parentElement.classList.contains('dropdown')) { // Example breakpoint
                    e.preventDefault(); // Prevent navigation, toggle active class
                    this.parentElement.classList.toggle('active');
                }
            });
        });

        // Search toggle
        const searchToggle = document.querySelector('.search-toggle');
        const searchContainer = document.querySelector('.search-container'); // Parent of toggle and dropdown
        if (searchToggle && searchContainer) {
            searchToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                searchContainer.classList.toggle('active');
            });
        }
        // Note: Click outside for search is handled by CartManager's generic outside click if structure is similar
    },

    quickView: function() {
        const quickViewModal = document.getElementById('quick-view-modal');
        if (!quickViewModal) return;

        const quickViewContent = quickViewModal.querySelector('.quick-view-content');
        const closeModalBtn = quickViewModal.querySelector('.modal-close');

        // Use event delegation for quick view buttons
        document.body.addEventListener('click', function(e) {
            if (e.target.closest('.quick-view-btn')) {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.closest('.quick-view-btn');
                const productCard = btn.closest('.product-card');
                if (!productCard) return;

                const productId = productCard.getAttribute('data-product-id');
                if (!productId || typeof window.PRODUCTS === 'undefined' || !window.PRODUCTS.getProductById) {
                    console.error('Product ID missing or PRODUCTS not available for quick view.');
                    if (window.CartManager && window.CartManager.showNotification) {
                        window.CartManager.showNotification("Quick view unavailable for this item.", "error");
                    }
                    return;
                }

                const product = window.PRODUCTS.getProductById(productId);
                if (!product) {
                    console.error('Product data not found for quick view:', productId);
                     if (window.CartManager && window.CartManager.showNotification) {
                        window.CartManager.showNotification("Product details not found for quick view.", "error");
                    }
                    return;
                }

                // Ensure quickViewContent exists
                if (!quickViewContent) {
                    console.error("Quick view modal content area (.quick-view-content) not found.");
                    return;
                }

                // Populate and show modal
                // IMPORTANT: Set data-product-id on a reliable element in the modal for CartManager
                quickViewModal.querySelector('.modal-content').setAttribute('data-product-id', product.id); // Or on quickViewContent itself

                let colorsHTML = '';
                if (product.colors && product.colors.length > 0) {
                    const colorOptionsHTML = product.colors.map((color, index) => `
                        <label class="color-option">
                            <input type="radio" name="color" value="${color.name.toLowerCase()}" ${index === 0 ? 'checked' : ''}>
                            <span class="color-swatch" style="background-color: ${color.code}; ${ (color.code.toLowerCase() === '#ffffff' || color.code.toLowerCase() === '#f5f5f5') ? 'border: 1px solid #ccc;' : ''}" data-color="${color.name}"></span>
                        </label>
                    `).join('');
                    colorsHTML = `
                        <div class="product-colors">
                            <h4>Color: <span class="selected-color">${product.colors[0].name}</span></h4>
                            <div class="color-options">${colorOptionsHTML}</div>
                        </div>`;
                }
                
                const priceHTML = product.oldPrice ?
                    `<span class="old-price">${window.PRODUCTS.formatPrice(product.oldPrice)}</span> <span class="current-price">${window.PRODUCTS.formatPrice(product.price)}</span>` :
                    `<span class="current-price">${window.PRODUCTS.formatPrice(product.price)}</span>`;

                const quickViewHTML = `
                    <div class="quick-view-grid">
                        <div class="quick-view-gallery">
                            <div class="main-image">
                                <img src="${product.images.primary}" alt="${product.name}">
                            </div>
                            <div class="thumbnail-images">
                                ${product.images.gallery.map(imgSrc => `<div class="thumbnail"><img src="${imgSrc}" alt="${product.name}"></div>`).join('')}
                            </div>
                        </div>
                        <div class="quick-view-details">
                            <div class="product-categories"><a href="category.html?id=${product.categories[0]}">${window.PRODUCTS.categories[product.categories[0]] ? window.PRODUCTS.categories[product.categories[0]].name : 'Category'}</a></div>
                            <h2 class="product-title">${product.name}</h2>
                            <div class="product-rating">
                                <div class="stars"> </div>
                                <a href="#reviews" class="review-link">(${product.reviewCount || 0} reviews)</a>
                            </div>
                            <div class="product-price">${priceHTML}</div>
                            <div class="product-description"><p>${product.description || 'No description available.'}</p></div>
                            ${colorsHTML}
                            <div class="product-quantity">
                                <h4>Quantity</h4>
                                <div class="quantity-selector">
                                    <button type="button" class="quantity-decrease">-</button>
                                    <input type="number" id="quantity" name="quantity" value="1" min="1" max="10">
                                    <button type="button" class="quantity-increase">+</button>
                                </div>
                            </div>
                            <div class="product-actions">
                                <button class="btn btn-dark btn-lg add-to-cart-btn" ${!product.inStock ? 'disabled' : ''}>${product.inStock ? 'Add to Cart' : 'Sold Out'}</button>
                                </div>
                        </div>
                    </div>`;
                quickViewContent.innerHTML = quickViewHTML;

                // Re-initialize stars, quantity selector, color selector, gallery for THIS modal instance
                app.initQuickViewStars(quickViewContent.querySelector('.product-rating .stars'), product.rating);
                app.initQuickViewQuantity(quickViewContent.querySelector('.quantity-selector'));
                app.initQuickViewColors(quickViewContent.querySelector('.product-colors'));
                app.initQuickViewGallery(quickViewContent.querySelector('.quick-view-gallery'));

                quickViewModal.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        });

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', function() {
                quickViewModal.classList.remove('show');
                document.body.style.overflow = '';
            });
        }
        quickViewModal.addEventListener('click', function(e) {
            if (e.target === this) {
                quickViewModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    },

    // Helper functions for quick view dynamic content
    initQuickViewStars: function(starsContainer, rating) {
        if (!starsContainer) return;
        let html = '';
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) html += '<i class="fas fa-star"></i>';
            else if (i === fullStars && halfStar) html += '<i class="fas fa-star-half-alt"></i>';
            else html += '<i class="far fa-star"></i>';
        }
        starsContainer.innerHTML = html;
    },
    initQuickViewQuantity: function(quantitySelector) {
        if (!quantitySelector) return;
        const decreaseBtn = quantitySelector.querySelector('.quantity-decrease');
        const increaseBtn = quantitySelector.querySelector('.quantity-increase');
        const input = quantitySelector.querySelector('input[type="number"]');
        if(!decreaseBtn || !increaseBtn || !input) return;

        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(input.value);
            if (val > input.min) input.value = val - 1;
        });
        increaseBtn.addEventListener('click', () => {
            let val = parseInt(input.value);
            if (val < input.max || !input.max) input.value = val + 1; // Handle if max is not set
        });
    },
    initQuickViewColors: function(colorsContainer) {
        if (!colorsContainer) return;
        const colorOptions = colorsContainer.querySelectorAll('.color-option input[type="radio"]');
        const selectedColorSpan = colorsContainer.querySelector('.selected-color');
        if(!selectedColorSpan) return;

        colorOptions.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    const swatch = this.nextElementSibling; // The span.color-swatch
                    selectedColorSpan.textContent = swatch.dataset.color || this.value;
                }
            });
        });
    },
    initQuickViewGallery: function(galleryContainer) {
        if (!galleryContainer) return;
        const mainImage = galleryContainer.querySelector('.main-image img');
        const thumbnails = galleryContainer.querySelectorAll('.thumbnail-images .thumbnail');
        if(!mainImage || thumbnails.length === 0) return;

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', function() {
                mainImage.src = this.querySelector('img').src;
                thumbnails.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    },

    productsSlider: function() {
        const sliderContainers = document.querySelectorAll('.products-slider'); // Allow multiple sliders
        if (sliderContainers.length === 0) return;

        sliderContainers.forEach(sliderContainer => {
            const wrapper = sliderContainer.querySelector('.products-slider-wrapper');
            const slides = wrapper ? wrapper.querySelectorAll('.product-slide') : [];
            const prevBtn = sliderContainer.parentElement.querySelector('.slider-controls .slider-prev'); // Assumes controls are outside .products-slider but in its parent
            const nextBtn = sliderContainer.parentElement.querySelector('.slider-controls .slider-next');
            
            if (!wrapper || slides.length <= 1) { // No slider needed for 0 or 1 item
                if (prevBtn) prevBtn.style.display = 'none';
                if (nextBtn) nextBtn.style.display = 'none';
                return;
            }

            let currentIndex = 0;
            let itemsPerPage = calculateItemsPerPage();
            
            function calculateItemsPerPage() {
                // This is a basic example. You'll need to adjust based on your CSS/layout.
                // For a more robust solution, check slide width against wrapper width.
                if (window.innerWidth < 768) return 1;
                if (window.innerWidth < 992) return 2;
                return 3; // Default for larger screens
            }

            function updateSliderPosition() {
                // Calculate max index based on itemsPerPage
                const maxIndex = Math.max(0, slides.length - itemsPerPage);
                if (currentIndex > maxIndex) currentIndex = maxIndex;
                if (currentIndex < 0) currentIndex = 0;

                const itemWidth = slides[0].offsetWidth + parseInt(getComputedStyle(slides[0]).marginRight); // Including margin
                wrapper.style.transform = `translateX(-${currentIndex * itemWidth}px)`;

                if(prevBtn) prevBtn.disabled = currentIndex === 0;
                if(nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
            }

            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (currentIndex < slides.length - itemsPerPage) {
                        currentIndex++;
                        updateSliderPosition();
                    }
                });
            }
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentIndex > 0) {
                        currentIndex--;
                        updateSliderPosition();
                    }
                });
            }
            
            window.addEventListener('resize', () => {
                itemsPerPage = calculateItemsPerPage();
                updateSliderPosition();
            });

            updateSliderPosition(); // Initial setup
        });
    },

    countdownTimer: function() {
        const countdownContainer = document.querySelector('.countdown-timer');
        if (!countdownContainer) return;
        
        const endDateAttr = countdownContainer.getAttribute('data-end');
        if (!endDateAttr) {
            console.error('[DEBUG] main.js - Countdown Timer ERROR: .countdown-timer missing data-end attribute.');
            return;
        }
        const endDate = new Date(endDateAttr).getTime();
        if (isNaN(endDate)) {
            console.error('[DEBUG] main.js - Countdown Timer ERROR: Failed to parse date from data-end: "' + endDateAttr + '". Use YYYY-MM-DDTHH:mm:ss format.');
            return;
        }

        const daysEl = countdownContainer.querySelector('.days');
        const hoursEl = countdownContainer.querySelector('.hours');
        const minutesEl = countdownContainer.querySelector('.minutes');
        const secondsEl = countdownContainer.querySelector('.seconds');

        if (!daysEl || !hoursEl || !minutesEl || !secondsEl) {
            console.error('[DEBUG] main.js - Countdown Timer ERROR: Missing one or more .days, .hours, .minutes, .seconds span elements inside .countdown-timer.');
            return;
        }

        const countdownInterval = setInterval(function() {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownContainer.innerHTML = `<div class="countdown-expired"><p>This offer has expired</p></div>`;
                return;
            }
            daysEl.textContent = Math.floor(distance / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
            hoursEl.textContent = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            minutesEl.textContent = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            secondsEl.textContent = Math.floor((distance % (1000 * 60)) / 1000).toString().padStart(2, '0');
        }, 1000);
    },

    wishlistToggle: function() {
        document.body.addEventListener('click', function(e) {
            const wishlistBtn = e.target.closest('.wishlist-btn');
            if (wishlistBtn) {
                // The setupAuthRequiredActions will handle authentication check
                // This function will only run if the user is authenticated or after auth
                
                if (!window.AuthManager || window.AuthManager.isAuthenticated()) {
                    wishlistBtn.classList.toggle('active');
                    const icon = wishlistBtn.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('far'); // empty heart
                        icon.classList.toggle('fas'); // filled heart
                    }
                    
                    // Update wishlist count (example, actual logic depends on storage)
                    const wishlistCountEl = document.querySelector('.header-actions .wishlist-count');
                    if (wishlistCountEl) {
                        let currentCount = parseInt(wishlistCountEl.textContent) || 0;
                        if (wishlistBtn.classList.contains('active')) {
                            wishlistCountEl.textContent = currentCount + 1;
                            if(window.CartManager && window.CartManager.showNotification) window.CartManager.showNotification("Added to wishlist!", "success");
                        } else {
                            wishlistCountEl.textContent = Math.max(0, currentCount - 1);
                            if(window.CartManager && window.CartManager.showNotification) window.CartManager.showNotification("Removed from wishlist.", "success"); // Or a different type
                        }
                    }
                }
            }
        });
    },

    backToTop: function() {
        const backToTopButton = document.getElementById('back-to-top');
        if (!backToTopButton) return;

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    animateOnScroll: function() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target); // Optional: unobserve after animation
                }
            });
        }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

        // Add more selectors for elements you want to animate
        document.querySelectorAll('.section-header, .category-card, .product-card, .brand-value, .feature-banner-text, .instagram-item, .newsletter-content, .footer-widget').forEach(el => {
            observer.observe(el);
        });
    }
};

// Initialize the main application logic after the DOM is ready
async function bootstrap() {
  console.log('[DEBUG] main.js: Bootstrap starting...');
  
  // First ensure PRODUCTS exists and initialize it
  // First ensure PRODUCTS and CATEGORIES exist and initialize them
if (window.PRODUCTS && typeof window.PRODUCTS.init === 'function') {
    console.log('[DEBUG] main.js: Initializing PRODUCTS API...');
    await window.PRODUCTS.init();
    console.log('[DEBUG] main.js: PRODUCTS API initialized successfully');
}

// Initialize CATEGORIES first (highest priority)
if (window.CATEGORIES && typeof window.CATEGORIES.init === 'function') {
    console.log('[DEBUG] main.js: Initializing CATEGORIES API...');
    try {
        const categoriesReady = await window.CATEGORIES.init();
        if (categoriesReady) {
            console.log('[DEBUG] main.js: CATEGORIES API initialized successfully');
        } else {
            throw new Error('CATEGORIES initialization returned false');
        }
    } catch (error) {
        console.error('[DEBUG] main.js: CATEGORIES initialization failed:', error);
        // Continue with other initialization but log the error
    }
} else {
    console.error('[DEBUG] main.js: CATEGORIES API not available!');
}

if (window.PRODUCTS && typeof window.PRODUCTS.init === 'function') {
    console.log('[DEBUG] main.js: Initializing PRODUCTS API...');
    await window.PRODUCTS.init();
    console.log('[DEBUG] main.js: PRODUCTS API initialized successfully');
  } else {
    console.error('[DEBUG] main.js: PRODUCTS API not available!');
  }
  
  // Then initialize the app
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}


console.log('[DEBUG] main.js: Script finished executing initial setup. app.init might be pending DOMContentLoaded.');