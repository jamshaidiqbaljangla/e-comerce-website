/**
 * Product Page JavaScript - BINGO E-Commerce
 * Handles all product page interactions and functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] product-page.js: Initializing product page...');
    
    // Initialize product page functionality
    ProductPage.init();
});

const ProductPage = {
    init: function() {
        // Get product ID from the data attribute
        const productDetailSection = document.querySelector('.product-detail');
        if (!productDetailSection) {
            console.error('[DEBUG] product-page.js: Product detail section not found');
            return;
        }
        
        const productId = productDetailSection.getAttribute('data-product-id');
        if (!productId) {
            console.error('[DEBUG] product-page.js: Product ID not found');
            return;
        }
        
        console.log(`[DEBUG] product-page.js: Loading product data for ${productId}`);
        
        // If this is a direct page load (not SPA), load product data
        if (typeof window.PRODUCTS !== 'undefined' && window.PRODUCTS.getProductById) {
            this.loadProductData(productId);
        } else {
            console.log('[DEBUG] product-page.js: PRODUCTS object not available, using static data');
            // The page is using static HTML content, still initialize interactive elements
            this.initializeProductGallery();
            this.initializeColorOptions();
            this.initializeSizeOptions();
            this.initializeQuantitySelector();
            this.initializeProductTabs();
            this.initializeReviewsTab();
            this.initializeShippingAccordion();
        }
        
        // Add to cart button event listener
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function() {
                ProductPage.addToCart(productId);
            });
        }
        
        // Buy now button event listener
        const buyNowBtn = document.querySelector('.buy-now-btn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', function() {
                ProductPage.buyNow(productId);
            });
        }
        
        // Wishlist button event listener
        const wishlistBtn = document.querySelector('.product-actions .wishlist-btn');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', function() {
                ProductPage.toggleWishlist(productId, this);
            });
        }

        // Initialize slider for related/recent products
        this.initializeProductSliders();
    },
    
    loadProductData: function(productId) {
        console.log(`[DEBUG] product-page.js: Fetching product data for ID: ${productId}`);
        
        // Get product data from the PRODUCTS object
        const product = window.PRODUCTS.getProductById(productId);
        if (!product) {
            console.error(`[DEBUG] product-page.js: Product with ID ${productId} not found`);
            return;
        }
        
        // Update page with product data
        this.updateProductDetails(product);
        
        // Initialize interactive elements
        this.initializeProductGallery();
        this.initializeColorOptions();
        this.initializeSizeOptions();
        this.initializeQuantitySelector();
        this.initializeProductTabs();
        this.initializeReviewsTab();
        this.initializeShippingAccordion();
        
        // Load related products
        this.loadRelatedProducts(product);
        
        // Load recently viewed products
        this.loadRecentlyViewedProducts(productId);
        
        // Add to recently viewed in localStorage
        this.addToRecentlyViewed(productId);
    },
    
    updateProductDetails: function(product) {
        console.log('[DEBUG] product-page.js: Updating product details on page');
        
        // Update product title
        const titleElement = document.querySelector('.product-title');
        if (titleElement) titleElement.textContent = product.name;
        
        // Update page title
        document.title = `${product.name} | BINGO`;
        
        // Update breadcrumb
        const breadcrumbProductName = document.querySelector('.breadcrumb li:last-child');
        if (breadcrumbProductName) breadcrumbProductName.textContent = product.name;
        
        // Update price
        const currentPrice = document.querySelector('.product-price .current-price');
        if (currentPrice) currentPrice.textContent = window.PRODUCTS.formatPrice(product.price);
        
        const oldPrice = document.querySelector('.product-price .old-price');
        if (oldPrice && product.oldPrice) {
            oldPrice.textContent = window.PRODUCTS.formatPrice(product.oldPrice);
            oldPrice.style.display = 'inline-block';
            
            // Calculate and update discount percentage
            const discountBadge = document.querySelector('.discount-badge');
            if (discountBadge) {
                const discountPercentage = Math.round((1 - product.price / product.oldPrice) * 100);
                discountBadge.textContent = `Save ${discountPercentage}%`;
            }
        } else if (oldPrice) {
            oldPrice.style.display = 'none';
            const discountBadge = document.querySelector('.discount-badge');
            if (discountBadge) discountBadge.style.display = 'none';
        }
        
        // Update description
        const description = document.querySelector('.product-description p');
        if (description) description.textContent = product.description || 'No description available.';
        
        // Update main image
        const mainImage = document.getElementById('main-product-image');
        if (mainImage) {
  mainImage.src = (product.images && product.images.primary)
    ? product.images.primary
    : (product.image_url || mainImage.src);
}

        
        // Update gallery images
        const mainImageSlides = document.querySelectorAll('.main-image-slide img');
        const thumbnails = document.querySelectorAll('.thumbnail img');
        
        if (mainImageSlides.length > 0 && product.images.gallery && product.images.gallery.length > 0) {
            mainImageSlides[0].src = product.images.primary;
            thumbnails[0].src = product.images.primary;
            
            for (let i = 0; i < Math.min(mainImageSlides.length - 1, product.images.gallery.length); i++) {
                if (mainImageSlides[i + 1]) mainImageSlides[i + 1].src = product.images.gallery[i];
                if (thumbnails[i + 1]) thumbnails[i + 1].src = product.images.gallery[i];
            }
        }
        
        // Update category
        const categoryLinks = document.querySelectorAll('.product-categories a');
        if (categoryLinks.length > 0 && product.categories && product.categories.length > 0) {
            const categoryName = window.PRODUCTS.categories[product.categories[0]] ? 
                window.PRODUCTS.categories[product.categories[0]].name : 'Category';
                
            categoryLinks.forEach(link => {
                link.textContent = categoryName;
                link.href = `category.html?id=${product.categories[0]}`;
            });
        }
        
        // Update colors if available
        if (product.colors && product.colors.length > 0) {
            const colorOptions = document.querySelector('.color-options');
            if (colorOptions) {
                colorOptions.innerHTML = '';
                product.colors.forEach((color, index) => {
                    const label = document.createElement('label');
                    label.className = 'color-option';
                    
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = 'color';
                    input.value = color.name.toLowerCase();
                    if (index === 0) input.checked = true;
                    
                    const span = document.createElement('span');
                    span.className = 'color-swatch';
                    span.style.backgroundColor = color.code;
                    span.setAttribute('data-color', color.name);
                    
                    if (color.code.toLowerCase() === '#ffffff' || color.code.toLowerCase() === '#f5f5f5') {
                        span.style.border = '1px solid #ccc';
                    }
                    
                    label.appendChild(input);
                    label.appendChild(span);
                    colorOptions.appendChild(label);
                });
                
                // Update selected color text
                const selectedColorText = document.querySelector('.selected-color');
                if (selectedColorText) selectedColorText.textContent = product.colors[0].name;
            }
        }
        
        // Update stock status
        const stockStatus = document.querySelector('.stock-status');
        if (stockStatus) {
            if (product.inStock) {
                stockStatus.textContent = 'In Stock';
                stockStatus.className = 'stock-status in-stock';
            } else {
                stockStatus.textContent = 'Out of Stock';
                stockStatus.className = 'stock-status out-of-stock';
            }
        }
        
        // Update add to cart button
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        if (addToCartBtn) {
            if (product.inStock) {
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'Add to Cart';
            } else {
                addToCartBtn.disabled = true;
                addToCartBtn.textContent = 'Sold Out';
            }
        }
        
        // Update SKU
        const skuValue = document.querySelector('.meta-value:first-child');
        if (skuValue) skuValue.textContent = product.sku || `BINGO-${productId}`;
    },
    
    initializeProductGallery: function() {
        console.log('[DEBUG] product-page.js: Initializing product gallery');
        
        // Thumbnail click event
        const thumbnails = document.querySelectorAll('.thumbnail');
        thumbnails.forEach((thumbnail, index) => {
            thumbnail.addEventListener('click', function() {
                // Update active thumbnail
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                this.classList.add('active');
                
                // Update main image slide
                const slides = document.querySelectorAll('.main-image-slide');
                slides.forEach(slide => slide.classList.remove('active'));
                if (slides[index]) slides[index].classList.add('active');
            });
        });
        
        // Gallery navigation
        const prevButton = document.querySelector('.gallery-prev');
        const nextButton = document.querySelector('.gallery-next');
        
        if (prevButton && nextButton) {
            prevButton.addEventListener('click', function() {
                const activeSlide = document.querySelector('.main-image-slide.active');
                const slides = document.querySelectorAll('.main-image-slide');
                const activeThumbnail = document.querySelector('.thumbnail.active');
                const thumbnails = document.querySelectorAll('.thumbnail');
                
                let index = Array.from(slides).indexOf(activeSlide);
                index = (index - 1 + slides.length) % slides.length;
                
                // Update slides
                slides.forEach(slide => slide.classList.remove('active'));
                slides[index].classList.add('active');
                
                // Update thumbnails
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                thumbnails[index].classList.add('active');
            });
            
            nextButton.addEventListener('click', function() {
                const activeSlide = document.querySelector('.main-image-slide.active');
                const slides = document.querySelectorAll('.main-image-slide');
                const activeThumbnail = document.querySelector('.thumbnail.active');
                const thumbnails = document.querySelectorAll('.thumbnail');
                
                let index = Array.from(slides).indexOf(activeSlide);
                index = (index + 1) % slides.length;
                
                // Update slides
                slides.forEach(slide => slide.classList.remove('active'));
                slides[index].classList.add('active');
                
                // Update thumbnails
                thumbnails.forEach(thumb => thumb.classList.remove('active'));
                thumbnails[index].classList.add('active');
            });
        }
    },
    
    initializeColorOptions: function() {
        console.log('[DEBUG] product-page.js: Initializing color options');
        
        const colorOptions = document.querySelectorAll('.color-option input[type="radio"]');
        const selectedColorText = document.querySelector('.selected-color');
        
        if (colorOptions.length > 0 && selectedColorText) {
            colorOptions.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        const colorSwatch = this.nextElementSibling;
                        selectedColorText.textContent = colorSwatch.getAttribute('data-color') || this.value;
                    }
                });
            });
        }
    },
    
    initializeSizeOptions: function() {
        console.log('[DEBUG] product-page.js: Initializing size options');
        
        const sizeOptions = document.querySelectorAll('.size-option input[type="radio"]');
        const selectedSizeText = document.querySelector('.selected-size');
        
        if (sizeOptions.length > 0 && selectedSizeText) {
            sizeOptions.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        selectedSizeText.textContent = this.value.toUpperCase();
                    }
                });
            });
        }
    },
    
    initializeQuantitySelector: function() {
        console.log('[DEBUG] product-page.js: Initializing quantity selector');
        
        const decreaseBtn = document.querySelector('.quantity-decrease');
        const increaseBtn = document.querySelector('.quantity-increase');
        const quantityInput = document.querySelector('.quantity-selector input');
        
        if (decreaseBtn && increaseBtn && quantityInput) {
            decreaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue > parseInt(quantityInput.min || '1')) {
                    quantityInput.value = currentValue - 1;
                }
            });
            
            increaseBtn.addEventListener('click', function() {
                let currentValue = parseInt(quantityInput.value);
                const max = parseInt(quantityInput.max || '99');
                if (currentValue < max) {
                    quantityInput.value = currentValue + 1;
                }
            });
            
            quantityInput.addEventListener('change', function() {
                let value = parseInt(this.value);
                const min = parseInt(this.min || '1');
                const max = parseInt(this.max || '99');
                
                if (isNaN(value) || value < min) {
                    this.value = min;
                } else if (value > max) {
                    this.value = max;
                }
            });
        }
    },
    
    initializeProductTabs: function() {
        console.log('[DEBUG] product-page.js: Initializing product tabs');
        
        const tabs = document.querySelectorAll('.product-tab');
        const tabContents = document.querySelectorAll('.product-tab-content');
        
        if (tabs.length > 0 && tabContents.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    // Remove active class from all tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Add active class to clicked tab
                    this.classList.add('active');
                    
                    // Show corresponding tab content
                    const tabId = this.getAttribute('data-tab');
                    tabContents.forEach(content => {
                        content.classList.toggle('active', content.id === tabId);
                    });
                });
            });
            
            // Handle direct navigation to reviews
            if (window.location.hash === '#reviews') {
                const reviewsTab = document.getElementById('reviews-tab');
                if (reviewsTab) {
                    reviewsTab.click();
                }
            }
        }
    },
    
    initializeReviewsTab: function() {
        console.log('[DEBUG] product-page.js: Initializing reviews tab');
        
        // Write review button
        const writeReviewBtn = document.getElementById('write-review-btn');
        const reviewFormContainer = document.querySelector('.review-form-container');
        const cancelReviewBtn = document.getElementById('cancel-review-btn');
        
        if (writeReviewBtn && reviewFormContainer && cancelReviewBtn) {
            writeReviewBtn.addEventListener('click', function() {
                reviewFormContainer.style.display = 'block';
                writeReviewBtn.style.display = 'none';
                
                // Scroll to the form
                reviewFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            
            cancelReviewBtn.addEventListener('click', function() {
                reviewFormContainer.style.display = 'none';
                writeReviewBtn.style.display = 'block';
            });
        }
        
        // Rating selection
        const ratingStars = document.querySelectorAll('.rating-selector .stars i');
        const ratingText = document.querySelector('.rating-text');
        
        if (ratingStars.length > 0 && ratingText) {
            ratingStars.forEach(star => {
                star.addEventListener('mouseover', function() {
                    const rating = parseInt(this.getAttribute('data-rating'));
                    
                    // Update stars appearance
                    ratingStars.forEach((s, index) => {
                        if (index < rating) {
                            s.className = 'fas fa-star';
                        } else {
                            s.className = 'far fa-star';
                        }
                    });
                    
                    // Update rating text
                    ratingText.textContent = `${rating} ${rating === 1 ? 'Star' : 'Stars'}`;
                });
            });
            
            ratingStars.forEach(star => {
                star.addEventListener('click', function() {
                    const rating = parseInt(this.getAttribute('data-rating'));
                    
                    // Set the selected rating
                    ratingStars.forEach((s, index) => {
                        if (index < rating) {
                            s.className = 'fas fa-star';
                        } else {
                            s.className = 'far fa-star';
                        }
                    });
                    
                    // Update hidden input value (if exists)
                    const ratingInput = document.querySelector('input[name="rating"]');
                    if (ratingInput) {
                        ratingInput.value = rating;
                    }
                });
            });
            
            // Reset stars on mouse leave
            const starsContainer = document.querySelector('.rating-selector .stars');
            if (starsContainer) {
                starsContainer.addEventListener('mouseleave', function() {
                    // Find the selected rating
                    const ratingInput = document.querySelector('input[name="rating"]');
                    const selectedRating = ratingInput ? parseInt(ratingInput.value) : 0;
                    
                    if (selectedRating > 0) {
                        // If a rating is selected, show the selected stars
                        ratingStars.forEach((s, index) => {
                            if (index < selectedRating) {
                                s.className = 'fas fa-star';
                            } else {
                                s.className = 'far fa-star';
                            }
                        });
                        ratingText.textContent = `${selectedRating} ${selectedRating === 1 ? 'Star' : 'Stars'}`;
                    } else {
                        // If no rating is selected, reset to empty stars
                        ratingStars.forEach(s => {
                            s.className = 'far fa-star';
                        });
                        ratingText.textContent = 'Click to rate';
                    }
                });
            }
        }
        
        // Review form submission
        const reviewForm = document.querySelector('.review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validate form
                const title = document.getElementById('review-title').value;
                const text = document.getElementById('review-text').value;
                const name = document.getElementById('reviewer-name').value;
                const email = document.getElementById('reviewer-email').value;
                
                // Get selected rating
                const ratingInput = document.querySelector('input[name="rating"]');
                const rating = ratingInput ? parseInt(ratingInput.value) : 0;
                
                if (!rating) {
                    alert('Please select a rating');
                    return;
                }
                
                if (!title || !text || !name || !email) {
                    alert('Please fill in all fields');
                    return;
                }
                
                // In a real implementation, you would send this data to your server
                console.log('[DEBUG] product-page.js: Review submitted', {
                    rating,
                    title,
                    text,
                    name,
                    email
                });
                
                // Show success message and reset form
                alert('Thank you for your review! It will be published after moderation.');
                
                reviewForm.reset();
                reviewFormContainer.style.display = 'none';
                writeReviewBtn.style.display = 'block';
                
                // Reset stars
                ratingStars.forEach(s => {
                    s.className = 'far fa-star';
                });
                ratingText.textContent = 'Click to rate';
            });
        }
        
        // Helpful buttons
        const helpfulButtons = document.querySelectorAll('.helpful-btn');
        helpfulButtons.forEach(button => {
            button.addEventListener('click', function() {
                // In a real implementation, you would send this data to your server
                alert('Thank you for your feedback!');
                
                // Disable the button to prevent multiple clicks
                this.disabled = true;
            });
        });
    },
    
    initializeShippingAccordion: function() {
        console.log('[DEBUG] product-page.js: Initializing shipping accordion');
        
        const accordionHeaders = document.querySelectorAll('.info-tab-header');
        
        if (accordionHeaders.length > 0) {
            accordionHeaders.forEach(header => {
                header.addEventListener('click', function() {
                    const content = this.nextElementSibling;
                    const isActive = content.classList.contains('active');
                    
                    // Close all tabs
                    document.querySelectorAll('.info-tab-content').forEach(tab => {
                        tab.classList.remove('active');
                        tab.style.display = 'none';
                    });
                    
                    document.querySelectorAll('.info-tab-header i.fas').forEach(icon => {
                        icon.className = 'fas fa-plus';
                    });
                    
                    // Open clicked tab if it was not already open
                    if (!isActive) {
                        content.classList.add('active');
                        content.style.display = 'block';
                        this.querySelector('i.fas').className = 'fas fa-minus';
                    }
                });
            });
            
            // Open first tab by default
            if (accordionHeaders[0]) {
                accordionHeaders[0].click();
            }
        }
    },
    
    initializeProductSliders: function() {
        console.log('[DEBUG] product-page.js: Initializing product sliders');
        
        const sliderContainers = document.querySelectorAll('.products-slider');
        
        sliderContainers.forEach(container => {
            const wrapper = container.querySelector('.products-slider-wrapper');
            const prevBtn = container.parentElement.querySelector('.slider-prev');
            const nextBtn = container.parentElement.querySelector('.slider-next');
            
            if (!wrapper || !prevBtn || !nextBtn) return;
            
            let currentPosition = 0;
            let itemsPerPage = this.calculateItemsPerPage();
            
            function updateSliderPosition() {
                if (!wrapper.children.length) return;
                
                const itemWidth = wrapper.children[0].offsetWidth;
                wrapper.style.transform = `translateX(-${currentPosition * itemWidth}px)`;
                
                // Disable/enable buttons
                if (prevBtn) prevBtn.disabled = currentPosition === 0;
                if (nextBtn) nextBtn.disabled = currentPosition >= wrapper.children.length - itemsPerPage;
            }
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentPosition > 0) {
                        currentPosition--;
                        updateSliderPosition();
                    }
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (currentPosition < wrapper.children.length - itemsPerPage) {
                        currentPosition++;
                        updateSliderPosition();
                    }
                });
            }
            
            // Initial setup
            updateSliderPosition();
            
            // Update on window resize
            window.addEventListener('resize', () => {
                itemsPerPage = this.calculateItemsPerPage();
                currentPosition = Math.min(currentPosition, wrapper.children.length - itemsPerPage);
                updateSliderPosition();
            });
        });
    },
    
    calculateItemsPerPage: function() {
        if (window.innerWidth < 576) return 1;
        if (window.innerWidth < 992) return 2;
        if (window.innerWidth < 1200) return 3;
        return 4;
    },
    
    loadRelatedProducts: function(product) {
        console.log('[DEBUG] product-page.js: Loading related products');
        
        // In a real implementation, you would fetch related products based on the current product
        // For now, we'll just display some random products from the same category
        
        if (!product.categories || !product.categories.length) return;
        
        const productId = product.id;
        const categoryId = product.categories[0];
        
        // Get products from the same category
        const relatedProducts = window.PRODUCTS.items.filter(p => 
            p.id !== productId && 
            p.categories && 
            p.categories.includes(categoryId)
        );
        
        // Shuffle and take first 4
        const shuffled = this.shuffleArray(relatedProducts).slice(0, 4);
        
        // Render related products
        const container = document.querySelector('.you-may-also-like .products-slider-wrapper');
        if (container) {
            container.innerHTML = '';
            
            shuffled.forEach(product => {
                container.appendChild(this.createProductSlide(product));
            });
        }
    },
    
    loadRecentlyViewedProducts: function(currentProductId) {
        console.log('[DEBUG] product-page.js: Loading recently viewed products');
        
        // Get recently viewed products from localStorage
        const recentlyViewed = this.getRecentlyViewed().filter(id => id !== currentProductId);
        
        // Get product data for each ID
        const recentProducts = recentlyViewed
            .map(id => window.PRODUCTS.getProductById(id))
            .filter(product => product !== null);
        
        // Render recently viewed products
        const container = document.querySelector('.recently-viewed .products-slider-wrapper');
        if (container) {
            if (recentProducts.length === 0) {
                // Hide the section if there are no recently viewed products
                const section = document.querySelector('.recently-viewed');
                if (section) section.style.display = 'none';
                return;
            }
            
            container.innerHTML = '';
            
            recentProducts.forEach(product => {
                container.appendChild(this.createProductSlide(product));
            });
        }
    },
    
    createProductSlide: function(product) {
        const slide = document.createElement('div');
        slide.className = 'product-slide';
        
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);
        
        // Create card HTML
        const priceHTML = product.oldPrice ?
            `<span class="old-price">${window.PRODUCTS.formatPrice(product.oldPrice)}</span> <span class="current-price">${window.PRODUCTS.formatPrice(product.price)}</span>` :
            `<span class="current-price">${window.PRODUCTS.formatPrice(product.price)}</span>`;
            
        const badgeHTML = product.isNew ? '<div class="product-badges"><span class="badge new">New</span></div>' : 
                         product.oldPrice ? '<div class="product-badges"><span class="badge sale">Sale</span></div>' : '';
        
        card.innerHTML = `
            <div class="product-image">
                ${badgeHTML}
                <a href="product.html?id=${product.id}">
                    <img src="${product.images.primary}" alt="${product.name}" class="primary-image">
                    <img src="${product.images.gallery[0] || product.images.primary}" alt="${product.name} Hover" class="hover-image">
                </a>
                <div class="product-actions">
                    <button class="action-btn quick-view-btn" aria-label="Quick view">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn wishlist-btn" aria-label="Add to wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn compare-btn" aria-label="Compare">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="add-to-cart-wrapper">
                    <button class="btn btn-dark add-to-cart-btn" ${!product.inStock ? 'disabled' : ''}>
                        ${product.inStock ? 'Add to Cart' : 'Sold Out'}
                    </button>
                </div>
            </div>
            <div class="product-content">
                <div class="product-categories">
                    <a href="category.html?id=${product.categories[0]}">${window.PRODUCTS.categories[product.categories[0]] ? window.PRODUCTS.categories[product.categories[0]].name : 'Category'}</a>
                </div>
                <h3 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <div class="product-price">${priceHTML}</div>
            </div>
        `;
        
        slide.appendChild(card);
        return slide;
    },
    
    addToCart: function(productId) {
        console.log(`[DEBUG] product-page.js: Adding product ${productId} to cart`);
        
        // Check if the user is authenticated
        if (window.AuthManager && !window.AuthManager.isAuthenticated()) {
            console.log('[DEBUG] product-page.js: User not authenticated, showing auth modal');
            
            // Store the product ID to add to cart after login
            localStorage.setItem('pendingCartAdd', productId);
            
            // Show auth modal
            if (window.AuthManager.showAuthModal) {
                window.AuthManager.showAuthModal('login');
            } else {
                // Fallback if showAuthModal not available
                window.location.href = 'login.html';
            }
            return;
        }
        
        // Get quantity
        const quantityInput = document.querySelector('.quantity-selector input');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        // Get selected options
        const selectedColor = document.querySelector('.color-option input:checked');
        const selectedSize = document.querySelector('.size-option input:checked');
        
        const options = {
            color: selectedColor ? selectedColor.value : null,
            size: selectedSize ? selectedSize.value : null
        };
        
        // Add to cart
        if (window.CartManager && window.CartManager.addToCart) {
            window.CartManager.addToCart(productId, quantity, options);
        } else {
            console.error('[DEBUG] product-page.js: CartManager not available');
            alert('Item added to cart!');
        }
    },
    
    buyNow: function(productId) {
        console.log(`[DEBUG] product-page.js: Buy now for product ${productId}`);
        
        // Add to cart first
        this.addToCart(productId);
        
        // Then redirect to checkout
        window.location.href = 'checkout.html';
    },
    
    toggleWishlist: function(productId, button) {
        console.log(`[DEBUG] product-page.js: Toggling wishlist for product ${productId}`);
        
        // Check if the user is authenticated
        if (window.AuthManager && !window.AuthManager.isAuthenticated()) {
            console.log('[DEBUG] product-page.js: User not authenticated, showing auth modal');
            
            // Store the product ID to add to wishlist after login
            localStorage.setItem('pendingWishlistAdd', productId);
            
            // Show auth modal
            if (window.AuthManager.showAuthModal) {
                window.AuthManager.showAuthModal('login');
            } else {
                // Fallback if showAuthModal not available
                window.location.href = 'login.html';
            }
            return;
        }
        
        // Toggle button state
        button.classList.toggle('active');
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
        }
        
        // Update wishlist
        if (window.WishlistManager && window.WishlistManager.toggleWishlist) {
            window.WishlistManager.toggleWishlist(productId);
        } else {
            console.log('[DEBUG] product-page.js: WishlistManager not available');
            
            if (button.classList.contains('active')) {
                alert('Added to wishlist!');
            } else {
                alert('Removed from wishlist!');
            }
        }
    },
    
    addToRecentlyViewed: function(productId) {
        console.log(`[DEBUG] product-page.js: Adding product ${productId} to recently viewed`);
        
        const recentlyViewed = this.getRecentlyViewed();
        
        // Remove if already exists
        const index = recentlyViewed.indexOf(productId);
        if (index !== -1) {
            recentlyViewed.splice(index, 1);
        }
        
        // Add to the beginning
        recentlyViewed.unshift(productId);
        
        // Keep only the last 10
        if (recentlyViewed.length > 10) {
            recentlyViewed.pop();
        }
        
        // Save to localStorage
        localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
    },
    
    getRecentlyViewed: function() {
        const recentlyViewed = localStorage.getItem('recentlyViewed');
        return recentlyViewed ? JSON.parse(recentlyViewed) : [];
    },
    
    shuffleArray: function(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
};