/**
 * BINGO E-commerce Review Manager
 * Handles all review functionality, display, submission, and interactions
 */

window.ReviewManager = {
    // Configuration settings
    config: {
        defaultPageSize: 5,
        mediaUploadLimit: 5, // Maximum number of media files per review
        maxReviewLength: 2000, // Maximum characters for review text
        minReviewLength: 10, // Minimum characters for review text
        sortOptions: ['newest', 'highest', 'lowest', 'most-helpful', 'with-media'],
        filterOptions: ['all', '5', '4', '3', '2', '1', 'with-media', 'verified']
    },
    
    // State variables
    state: {
        currentProductId: null,
        currentReviews: [],
        userReviews: {}, // User's own reviews by product ID
        reviewVotes: {}, // User's votes on reviews
        sortBy: 'newest',
        filterBy: 'all',
        currentPage: 1,
        reviewFormVisible: false,
        reviewDraft: {
            rating: 0,
            title: '',
            content: '',
            media: []
        },
        reviewStats: {
            averageRating: 0,
            totalCount: 0,
            distribution: {
                5: 0, 4: 0, 3: 0, 2: 0, 1: 0
            }
        }
    },
    
    /**
     * Initialize the review manager
     */
    init: function() {
        console.log('[DEBUG] review-manager.js: Review Manager initializing...');
        
        // Check if we're on a product page
        if (this.isProductPage()) {
            this.initProductPageReviews();
        }
        
        // Check if we're on a user account/reviews page
        if (window.location.pathname.includes('account') && window.location.hash === '#reviews') {
            this.initUserReviewsPage();
        }
        
        this.loadUserReviewData();
        this.bindGlobalEvents();
        
        console.log('[DEBUG] review-manager.js: Review Manager initialized');
    },
    
    /**
     * Initialize reviews on product page
     */
    initProductPageReviews: function() {
        console.log('[DEBUG] review-manager.js: Initializing product page reviews');
        
        // Get product ID from page
        const productDetailSection = document.querySelector('.product-detail');
        if (!productDetailSection) {
            console.warn('[DEBUG] review-manager.js: Product detail section not found');
            return;
        }
        
        const productId = productDetailSection.getAttribute('data-product-id');
        if (!productId) {
            console.warn('[DEBUG] review-manager.js: Product ID not found');
            return;
        }
        
        this.state.currentProductId = productId;
        
        // Set up review-specific event listeners
        this.setupReviewListeners();
        
        // Load reviews data
        this.loadProductReviews(productId);
        
        // Check if URL hash is #reviews and open reviews tab if so
        if (window.location.hash === '#reviews') {
            const reviewsTab = document.getElementById('reviews-tab');
            if (reviewsTab) {
                reviewsTab.click();
            }
        }
    },
    
    /**
     * Initialize user reviews page in account section
     */
    initUserReviewsPage: function() {
        console.log('[DEBUG] review-manager.js: Initializing user reviews page');
        
        // Load user's reviews from storage or API
        this.loadUserReviews();
        
        // Set up user reviews page event listeners
        this.setupUserReviewsPageListeners();
    },
    
    /**
     * Set up global event listeners
     */
    bindGlobalEvents: function() {
        // Listen for authentication events to update review capabilities
        document.addEventListener('userAuthenticated', () => {
            // Refresh review forms when user logs in
            this.updateReviewFormAccess();
            // Check for pending review drafts
            this.checkPendingReviewDrafts();
        });
        
        document.addEventListener('userLoggedOut', () => {
            // Update review forms when user logs out
            this.updateReviewFormAccess();
        });
    },
    
    /**
     * Set up review-specific event listeners on product page
     */
    setupReviewListeners: function() {
        // Write review button
        const writeReviewBtn = document.getElementById('write-review-btn');
        if (writeReviewBtn) {
            writeReviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Check authentication
                if (this.checkAuthForReview()) {
                    this.showReviewForm();
                }
            });
        }
        
        // Cancel review button
        const cancelReviewBtn = document.getElementById('cancel-review-btn');
        if (cancelReviewBtn) {
            cancelReviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideReviewForm();
            });
        }
        
        // Review form submission
        const reviewForm = document.querySelector('.review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleReviewSubmission();
            });
        }
        
        // Rating selection in review form
        const ratingStars = document.querySelectorAll('.rating-selector .stars i');
        if (ratingStars.length > 0) {
            ratingStars.forEach(star => {
                star.addEventListener('click', (e) => {
                    const rating = parseInt(e.target.getAttribute('data-rating'));
                    this.setReviewRating(rating);
                });
                
                star.addEventListener('mouseover', (e) => {
                    const rating = parseInt(e.target.getAttribute('data-rating'));
                    this.previewRating(rating);
                });
            });
            
            // Reset stars on mouse leave
            const starsContainer = document.querySelector('.rating-selector .stars');
            if (starsContainer) {
                starsContainer.addEventListener('mouseleave', () => {
                    this.resetRatingPreview();
                });
            }
        }
        
        // Review sort select
        const sortSelect = document.getElementById('review-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.state.sortBy = sortSelect.value;
                this.refreshReviews();
            });
        }
        
        // Review filter select
        const filterSelect = document.getElementById('review-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                this.state.filterBy = filterSelect.value;
                this.refreshReviews();
            });
        }
        
        // Review media upload (modern file input handling)
        const mediaUpload = document.getElementById('review-media');
        if (mediaUpload) {
            mediaUpload.addEventListener('change', (e) => {
                this.handleMediaUpload(e.target.files);
            });
            
            // Drag and drop zone
            const dropZone = document.querySelector('.media-dropzone');
            if (dropZone) {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    });
                });
                
                dropZone.addEventListener('dragenter', () => dropZone.classList.add('highlight'));
                dropZone.addEventListener('dragover', () => dropZone.classList.add('highlight'));
                dropZone.addEventListener('dragleave', () => dropZone.classList.remove('highlight'));
                dropZone.addEventListener('drop', (e) => {
                    dropZone.classList.remove('highlight');
                    this.handleMediaUpload(e.dataTransfer.files);
                });
            }
        }
        
        // Event delegation for review interactions (helpful votes, report, etc.)
        document.addEventListener('click', (e) => {
            // Helpful/unhelpful buttons
            const helpfulBtn = e.target.closest('.helpful-btn');
            if (helpfulBtn) {
                e.preventDefault();
                const reviewId = helpfulBtn.closest('.review-item').getAttribute('data-review-id');
                const isHelpful = helpfulBtn.classList.contains('helpful-yes');
                this.voteReview(reviewId, isHelpful);
                return;
            }
            
            // Report review button
            const reportBtn = e.target.closest('.report-review');
            if (reportBtn) {
                e.preventDefault();
                const reviewId = reportBtn.closest('.review-item').getAttribute('data-review-id');
                this.reportReview(reviewId);
                return;
            }
            
            // Review image click (open gallery)
            const reviewImage = e.target.closest('.review-media-item img');
            if (reviewImage) {
                e.preventDefault();
                const mediaUrl = reviewImage.getAttribute('src');
                const reviewId = reviewImage.closest('.review-item').getAttribute('data-review-id');
                this.openMediaGallery(reviewId, mediaUrl);
                return;
            }
        });
        
        // Pagination
        document.addEventListener('click', (e) => {
            const paginationItem = e.target.closest('.pagination-item');
            if (paginationItem) {
                e.preventDefault();
                
                // Check if it's next/prev
                if (paginationItem.classList.contains('next')) {
                    this.nextPage();
                } else if (paginationItem.classList.contains('prev')) {
                    this.prevPage();
                } else {
                    // Go to specific page
                    const page = parseInt(paginationItem.textContent);
                    if (!isNaN(page)) {
                        this.goToPage(page);
                    }
                }
            }
        });
    },
    
    /**
     * Check if user is authenticated for review actions
     */
    checkAuthForReview: function() {
        // Check if AuthManager exists and user is authenticated
        if (window.AuthManager && typeof window.AuthManager.isAuthenticated === 'function') {
            const isAuth = window.AuthManager.isAuthenticated();
            if (!isAuth) {
                console.log('[DEBUG] review-manager.js: User not authenticated for review action');
                
                // Store current product ID for after login
                localStorage.setItem('pendingReviewProduct', this.state.currentProductId);
                
                // Show auth modal
                if (window.AuthManager.showAuthModal) {
                    window.AuthManager.showAuthModal('login', 'Please log in to write a review');
                } else {
                    // Fallback if showAuthModal not available
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                }
                return false;
            }
            return true;
        }
        
        // If no AuthManager, assume authenticated
        return true;
    },
    
    /**
     * Check for pending review after authentication
     */
    checkPendingReviewDrafts: function() {
        const pendingProductId = localStorage.getItem('pendingReviewProduct');
        if (pendingProductId && pendingProductId === this.state.currentProductId) {
            // Clear pending product
            localStorage.removeItem('pendingReviewProduct');
            
            // Show review form
            this.showReviewForm();
            
            // Try to restore draft if exists
            const draftKey = `reviewDraft_${pendingProductId}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
                try {
                    const draft = JSON.parse(savedDraft);
                    this.restoreReviewDraft(draft);
                } catch (e) {
                    console.error('[DEBUG] review-manager.js: Error restoring review draft:', e);
                }
            }
        }
    },
    
    /**
     * Load reviews for current product
     */
    loadProductReviews: function(productId) {
        console.log('[DEBUG] review-manager.js: Loading reviews for product:', productId);
        
        // Show loading state in reviews section
        const reviewsContent = document.querySelector('#reviews .reviews-content');
        if (reviewsContent) {
            reviewsContent.innerHTML = `
                <div class="loading-reviews">
                    <div class="spinner"></div>
                    <p>Loading reviews...</p>
                </div>
            `;
        }
        
        // In a real implementation, this would be an API call
        // For now, we'll simulate an async operation with setTimeout
        setTimeout(() => {
            // Get reviews from window.REVIEWS or create empty array if not exists
            const allReviews = window.REVIEWS && window.REVIEWS.getReviewsByProductId ? 
                window.REVIEWS.getReviewsByProductId(productId) : [];
            
            // Store in state
            this.state.currentReviews = allReviews;
            
            // Calculate review stats
            this.calculateReviewStats();
            
            // Render reviews
            this.renderReviewSummary();
            this.renderReviews();
            
            // Update product renderer with new review data if available
            if (window.PRODUCTS && window.PRODUCTS.items) {
                const product = window.PRODUCTS.items.find(p => p.id === productId);
                if (product) {
                    product.rating = this.state.reviewStats.averageRating;
                    product.reviewCount = this.state.reviewStats.totalCount;
                }
            }
            
            console.log('[DEBUG] review-manager.js: Reviews loaded:', this.state.currentReviews.length);
        }, 500);
    },
    
    /**
     * Calculate review statistics
     */
    calculateReviewStats: function() {
        const reviews = this.state.currentReviews;
        const stats = {
            averageRating: 0,
            totalCount: reviews.length,
            distribution: {
                5: 0, 4: 0, 3: 0, 2: 0, 1: 0
            }
        };
        
        // Count reviews by rating
        reviews.forEach(review => {
            if (review.rating >= 1 && review.rating <= 5) {
                stats.distribution[review.rating]++;
            }
        });
        
        // Calculate average rating
        if (stats.totalCount > 0) {
            let sum = 0;
            for (let rating = 1; rating <= 5; rating++) {
                sum += rating * stats.distribution[rating];
            }
            stats.averageRating = sum / stats.totalCount;
        }
        
        this.state.reviewStats = stats;
    },
    
    /**
     * Render review summary (stats, rating distribution)
     */
    renderReviewSummary: function() {
        const summaryContainer = document.querySelector('.review-summary .rating-overview');
        if (!summaryContainer) return;
        
        const stats = this.state.reviewStats;
        
        // Update average rating
        const ratingNumber = summaryContainer.querySelector('.rating-number');
        if (ratingNumber) {
            ratingNumber.textContent = stats.averageRating.toFixed(1);
        }
        
        // Update stars
        const stars = summaryContainer.querySelector('.stars');
        if (stars) {
            stars.innerHTML = this.generateStarsHTML(stats.averageRating);
        }
        
        // Update total reviews count
        const totalReviews = summaryContainer.querySelector('.total-reviews');
        if (totalReviews) {
            totalReviews.textContent = `Based on ${stats.totalCount} review${stats.totalCount !== 1 ? 's' : ''}`;
        }
        
        // Update rating distribution
        for (let rating = 5; rating >= 1; rating--) {
            const ratingBar = summaryContainer.querySelector(`.rating-bar:nth-child(${6-rating})`);
            if (ratingBar) {
                const progress = ratingBar.querySelector('.progress');
                const count = ratingBar.querySelector('.count');
                
                if (progress && count) {
                    const percentage = stats.totalCount > 0 ? (stats.distribution[rating] / stats.totalCount) * 100 : 0;
                    progress.style.width = `${percentage}%`;
                    count.textContent = stats.distribution[rating];
                }
            }
        }
        
        // Check if user has already reviewed this product
        this.checkUserReviewStatus();
    },
    
    /**
     * Render reviews list
     */
    /**
 * Re-render reviews (for tab switching)
 */
renderReviews: function() {
    console.log('[DEBUG] review-manager.js: Re-rendering reviews');
    
    // Make sure customer reviews container exists
    let customerReviews = document.querySelector('.customer-reviews');
    if (!customerReviews) {
        console.warn('[DEBUG] review-manager.js: Customer reviews container missing - creating it');
        const reviewsContent = document.querySelector('.reviews-content');
        if (reviewsContent) {
            customerReviews = document.createElement('div');
            customerReviews.className = 'customer-reviews';
            reviewsContent.appendChild(customerReviews);
        }
    }
    
    if (customerReviews) {
        // Ensure it's visible
        customerReviews.style.display = 'block';
        
        // Display filtered and sorted reviews
        const displayReviews = this.getFilteredSortedReviews();
        
        if (displayReviews.length === 0) {
            // No reviews to display
            customerReviews.innerHTML = `
                <div class="no-reviews">
                    <p>No reviews match your current filters. Try a different filter or be the first to review this product!</p>
                </div>
            `;
            return;
        }
        
        // Generate HTML for reviews
        let reviewsHTML = '';
        displayReviews.forEach(review => {
            reviewsHTML += this.createReviewHTML(review);
        });
        
        // Update container
        customerReviews.innerHTML = reviewsHTML;
        
        // Initialize dynamic elements
        this.initReviewElements();
    }
},
    
    /**
     * Get filtered and sorted reviews
     */
    getFilteredSortedReviews: function() {
        let reviews = [...this.state.currentReviews];
        
        // Apply filters
        switch (this.state.filterBy) {
            case '5':
            case '4':
            case '3':
            case '2':
            case '1':
                const rating = parseInt(this.state.filterBy);
                reviews = reviews.filter(review => review.rating === rating);
                break;
            case 'with-media':
                reviews = reviews.filter(review => review.media && review.media.length > 0);
                break;
            case 'verified':
                reviews = reviews.filter(review => review.verifiedPurchase);
                break;
            // 'all' - no filtering
        }
        
        // Apply sorting
        switch (this.state.sortBy) {
            case 'newest':
                reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'highest':
                reviews.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                reviews.sort((a, b) => a.rating - b.rating);
                break;
            case 'most-helpful':
                reviews.sort((a, b) => {
                    const aHelpful = a.helpfulVotes ? a.helpfulVotes.yes - a.helpfulVotes.no : 0;
                    const bHelpful = b.helpfulVotes ? b.helpfulVotes.yes - b.helpfulVotes.no : 0;
                    return bHelpful - aHelpful;
                });
                break;
            case 'with-media':
                // First those with media, then sort by newest
                reviews.sort((a, b) => {
                    const aHasMedia = a.media && a.media.length > 0;
                    const bHasMedia = b.media && b.media.length > 0;
                    if (aHasMedia && !bHasMedia) return -1;
                    if (!aHasMedia && bHasMedia) return 1;
                    return new Date(b.date) - new Date(a.date);
                });
                break;
        }
        
        return reviews;
    },
    
    /**
     * Create HTML for a single review
     */
    createReviewHTML: function(review) {
        const reviewId = review.id;
        const initials = this.getNameInitials(review.authorName);
        const date = this.formatDate(review.date);
        const showVerifiedBadge = review.verifiedPurchase;
        const hasMedia = review.media && review.media.length > 0;
        
        // Determine if content is long and needs expansion
        const isLongContent = review.content.length > 300;
        const truncatedContent = isLongContent ? review.content.substring(0, 300) + '...' : review.content;
        
        // Determine helpfulness stats
        const helpfulCount = review.helpfulVotes ? review.helpfulVotes.yes : 0;
        const unhelpfulCount = review.helpfulVotes ? review.helpfulVotes.no : 0;
        
        // Check if user has voted on this review
        const userVote = this.getUserVoteForReview(reviewId);
        
        let html = `
            <div class="review-item" data-review-id="${reviewId}">
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">
                            <span>${initials}</span>
                        </div>
                        <div class="reviewer-details">
                            <h4 class="reviewer-name">${review.authorName}</h4>
                            <div class="review-meta">
                                <div class="stars">
                                    ${this.generateStarsHTML(review.rating)}
                                </div>
                                ${showVerifiedBadge ? '<span class="verified-purchase">Verified Purchase</span>' : ''}
                                <span class="review-date">${date}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="review-content">
                    <h4 class="review-title">${review.title}</h4>
                    <div class="review-text ${isLongContent ? 'expandable' : ''}">
                        <p class="review-text-truncated">${truncatedContent}</p>
                        ${isLongContent ? `
                            <p class="review-text-full" style="display: none;">${review.content}</p>
                            <button class="read-more-btn">Read more</button>
                        ` : ''}
                    </div>
                    ${hasMedia ? this.createReviewMediaHTML(review.media) : ''}
                </div>
                <div class="review-footer">
                    <div class="review-helpful">
                        <span>Was this review helpful?</span>
                        <button class="helpful-btn helpful-yes ${userVote === 'yes' ? 'voted' : ''}" aria-label="Yes, this review was helpful">
                            <i class="fas fa-thumbs-up"></i> Yes (${helpfulCount})
                        </button>
                        <button class="helpful-btn helpful-no ${userVote === 'no' ? 'voted' : ''}" aria-label="No, this review was not helpful">
                            <i class="fas fa-thumbs-down"></i> No (${unhelpfulCount})
                        </button>
                    </div>
                    <button class="report-review" aria-label="Report review">
                        <i class="fas fa-flag"></i> Report
                    </button>
                </div>
            </div>
        `;
        
        return html;
    },
    
    /**
     * Create HTML for review media gallery
     */
    createReviewMediaHTML: function(media) {
        if (!media || media.length === 0) return '';
        
        let thumbnailsHTML = '';
        media.forEach((item, index) => {
            thumbnailsHTML += `
                <div class="review-media-item">
                    <img src="${item.url}" alt="Review image ${index + 1}" loading="lazy">
                </div>
            `;
        });
        
        return `
            <div class="review-media">
                <h5>Customer Images (${media.length})</h5>
                <div class="review-media-gallery">
                    ${thumbnailsHTML}
                </div>
            </div>
        `;
    },
    
    /**
     * Create HTML for pagination
     */
    createPaginationHTML: function(totalPages) {
        const currentPage = this.state.currentPage;
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += '<a href="#" class="pagination-item prev"><i class="fas fa-chevron-left"></i></a>';
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            // Show first 3, last 3, and current page with neighbors
            if (
                i <= 3 || 
                i > totalPages - 3 || 
                (i >= currentPage - 1 && i <= currentPage + 1)
            ) {
                paginationHTML += `<a href="#" class="pagination-item ${i === currentPage ? 'active' : ''}">${i}</a>`;
            } else if (
                i === 4 && currentPage > 5 || 
                i === totalPages - 3 && currentPage < totalPages - 4
            ) {
                // Add ellipsis
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += '<a href="#" class="pagination-item next"><i class="fas fa-chevron-right"></i></a>';
        }
        
        paginationHTML += '</div>';
        return paginationHTML;
    },
    
    /**
     * Initialize dynamic elements in reviews
     */
    initReviewElements: function() {
        // Read more buttons for long reviews
        const readMoreButtons = document.querySelectorAll('.read-more-btn');
        readMoreButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const reviewText = button.closest('.review-text');
                if (reviewText) {
                    const truncated = reviewText.querySelector('.review-text-truncated');
                    const full = reviewText.querySelector('.review-text-full');
                    
                    if (truncated && full) {
                        // Toggle visibility
                        const isExpanded = truncated.style.display === 'none';
                        
                        truncated.style.display = isExpanded ? 'block' : 'none';
                        full.style.display = isExpanded ? 'none' : 'block';
                        
                        // Update button text
                        button.textContent = isExpanded ? 'Read more' : 'Read less';
                    }
                }
            });
        });
    },
    
    /**
     * Show review form
     */
    showReviewForm: function() {
        const writeReviewBtn = document.getElementById('write-review-btn');
        const reviewFormContainer = document.querySelector('.review-form-container');
        
        if (writeReviewBtn && reviewFormContainer) {
            writeReviewBtn.style.display = 'none';
            reviewFormContainer.style.display = 'block';
            
            // Scroll to the form
            reviewFormContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Set state
            this.state.reviewFormVisible = true;
        }
    },
    
    /**
     * Hide review form
     */
    hideReviewForm: function() {
        const writeReviewBtn = document.getElementById('write-review-btn');
        const reviewFormContainer = document.querySelector('.review-form-container');
        
        if (writeReviewBtn && reviewFormContainer) {
            writeReviewBtn.style.display = 'block';
            reviewFormContainer.style.display = 'none';
            
            // Set state
            this.state.reviewFormVisible = false;
        }
    },
    
    /**
     * Set review rating
     */
    setReviewRating: function(rating) {
        // Update state
        this.state.reviewDraft.rating = rating;
        
        // Update stars
        const stars = document.querySelectorAll('.rating-selector .stars i');
        stars.forEach((star, index) => {
            star.className = index < rating ? 'fas fa-star' : 'far fa-star';
        });
        
        // Update rating text
        const ratingText = document.querySelector('.rating-text');
        if (ratingText) {
            ratingText.textContent = `${rating} ${rating === 1 ? 'Star' : 'Stars'}`;
        }
        
        // Save draft
        this.saveReviewDraft();
    },
    
    /**
     * Preview rating on mouseover
     */
    previewRating: function(rating) {
        const stars = document.querySelectorAll('.rating-selector .stars i');
        stars.forEach((star, index) => {
            star.className = index < rating ? 'fas fa-star' : 'far fa-star';
        });
        
        // Update rating text
        const ratingText = document.querySelector('.rating-text');
        if (ratingText) {
            ratingText.textContent = `${rating} ${rating === 1 ? 'Star' : 'Stars'}`;
        }
    },
    
    /**
     * Reset rating preview to actual rating
     */
    resetRatingPreview: function() {
        const rating = this.state.reviewDraft.rating;
        const stars = document.querySelectorAll('.rating-selector .stars i');
        
        stars.forEach((star, index) => {
            star.className = index < rating ? 'fas fa-star' : 'far fa-star';
        });
        
        // Update rating text
        const ratingText = document.querySelector('.rating-text');
        if (ratingText) {
            ratingText.textContent = rating > 0 ? 
                `${rating} ${rating === 1 ? 'Star' : 'Stars'}` : 
                'Click to rate';
        }
    },
    
    /**
     * Handle review form submission
     */
    handleReviewSubmission: function() {
        console.log('[DEBUG] review-manager.js: Handling review submission');
        
        // Get form values
        const reviewTitle = document.getElementById('review-title').value.trim();
        const reviewText = document.getElementById('review-text').value.trim();
        const rating = this.state.reviewDraft.rating;
        const media = this.state.reviewDraft.media;
        
        // Validate form
        if (!rating) {
            this.showNotification('Please select a rating', 'error');
            return;
        }
        
        if (!reviewTitle) {
            this.showNotification('Please enter a review title', 'error');
            return;
        }
        
        if (!reviewText || reviewText.length < this.config.minReviewLength) {
            this.showNotification(`Review must be at least ${this.config.minReviewLength} characters`, 'error');
            return;
        }
        
        if (reviewText.length > this.config.maxReviewLength) {
            this.showNotification(`Review cannot exceed ${this.config.maxReviewLength} characters`, 'error');
            return;
        }
        
        // Show loading state
        const submitButton = document.querySelector('.review-form button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        }
        
        // Prepare review data
        const reviewData = {
            productId: this.state.currentProductId,
            title: reviewTitle,
            content: reviewText,
            rating: rating,
            media: media,
            date: new Date().toISOString()
        };
        
        // In a real implementation, this would be an API call
        // For now, simulate async with setTimeout
        setTimeout(() => {
            // Simulate successful submission
            this.handleReviewSubmissionSuccess(reviewData);
            
            // Reset form
            const reviewForm = document.querySelector('.review-form');
            if (reviewForm) {
                reviewForm.reset();
            }
            
            // Reset state
            this.state.reviewDraft = {
                rating: 0,
                title: '',
                content: '',
                media: []
            };
            
            // Reset stars
            const stars = document.querySelectorAll('.rating-selector .stars i');
            stars.forEach(star => {
                star.className = 'far fa-star';
            });
            
            // Reset rating text
            const ratingText = document.querySelector('.rating-text');
            if (ratingText) {
                ratingText.textContent = 'Click to rate';
            }
            
            // Reset media preview
            const mediaPreview = document.querySelector('.media-preview');
            if (mediaPreview) {
                mediaPreview.innerHTML = '';
                mediaPreview.style.display = 'none';
            }
            
            // Reset submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Submit Review';
            }
            
            // Hide form
            this.hideReviewForm();
            
            // Remove draft from storage
            this.clearReviewDraft();
            
            // Show success notification
            this.showNotification('Your review has been submitted successfully!', 'success');
            
            // Reload reviews to include the new one
            this.loadProductReviews(this.state.currentProductId);
        }, 1000);
    },
    
    /**
     * Handle successful review submission
     */
    handleReviewSubmissionSuccess: function(reviewData) {
        console.log('[DEBUG] review-manager.js: Review submitted successfully:', reviewData);
        
        // Add to user's reviews (in local storage for now)
        this.addUserReview(reviewData);
    },
    
    /**
     * Handle media upload for reviews
     */
    handleMediaUpload: function(files) {
        if (!files || files.length === 0) return;
        
        // Check if we've hit the limit
        const currentCount = this.state.reviewDraft.media.length;
        const remainingSlots = this.config.mediaUploadLimit - currentCount;
        
        if (remainingSlots <= 0) {
            this.showNotification(`Maximum ${this.config.mediaUploadLimit} media files allowed`, 'error');
            return;
        }
        
        // Process only the allowed number of files
        const filesToProcess = Array.from(files).slice(0, remainingSlots);
        
        // Show loading state
        const mediaPreview = document.querySelector('.media-preview');
        if (mediaPreview) {
            if (currentCount === 0) {
                mediaPreview.innerHTML = '<div class="media-loading"><i class="fas fa-spinner fa-spin"></i> Processing media...</div>';
                mediaPreview.style.display = 'block';
            }
        }
        
        // Process each file (in a real implementation, this would upload to a server)
        const mediaPromises = filesToProcess.map(file => {
            return new Promise((resolve, reject) => {
                // Validate file type
                if (!file.type.startsWith('image/')) {
                    reject(new Error('Only image files are supported'));
                    return;
                }
                
                // Validate file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    reject(new Error('File size must be less than 5MB'));
                    return;
                }
                
                // Create a FileReader to get a data URL for preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    // In a real implementation, this would be a URL from the server
                    resolve({
                        url: e.target.result,
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                };
                reader.onerror = () => {
                    reject(new Error('Error reading file'));
                };
                reader.readAsDataURL(file);
            });
        });
        
        // Handle all file processing
        Promise.allSettled(mediaPromises)
            .then(results => {
                // Filter successful uploads
                const successfulUploads = results
                    .filter(result => result.status === 'fulfilled')
                    .map(result => result.value);
                
                // Add to media array
                this.state.reviewDraft.media = [
                    ...this.state.reviewDraft.media,
                    ...successfulUploads
                ];
                
                // Show error for failed uploads
                const failedUploads = results.filter(result => result.status === 'rejected');
                if (failedUploads.length > 0) {
                    const errorMessage = failedUploads[0].reason.message;
                    this.showNotification(errorMessage, 'error');
                }
                
                // Update preview
                this.updateMediaPreview();
                
                // Save draft
                this.saveReviewDraft();
            });
    },
    
    /**
     * Update media preview
     */
    updateMediaPreview: function() {
        const mediaPreview = document.querySelector('.media-preview');
        if (!mediaPreview) return;
        
        const media = this.state.reviewDraft.media;
        
        if (media.length === 0) {
            mediaPreview.innerHTML = '';
            mediaPreview.style.display = 'none';
            return;
        }
        
        let previewHTML = '<div class="media-preview-items">';
        
        media.forEach((item, index) => {
            previewHTML += `
                <div class="media-preview-item">
                    <img src="${item.url}" alt="Preview ${index + 1}">
                    <button class="remove-media" data-index="${index}" aria-label="Remove image">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        previewHTML += '</div>';
        previewHTML += `<div class="media-info">${media.length} of ${this.config.mediaUploadLimit} images added</div>`;
        
        mediaPreview.innerHTML = previewHTML;
        mediaPreview.style.display = 'block';
        
        // Add event listeners for removing media
        const removeButtons = mediaPreview.querySelectorAll('.remove-media');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const index = parseInt(button.getAttribute('data-index'));
                if (!isNaN(index)) {
                    this.removeMedia(index);
                }
            });
        });
    },
    
    /**
     * Remove media item
     */
    removeMedia: function(index) {
        if (index < 0 || index >= this.state.reviewDraft.media.length) return;
        
        // Remove from array
        this.state.reviewDraft.media.splice(index, 1);
        
        // Update preview
        this.updateMediaPreview();
        
        // Save draft
        this.saveReviewDraft();
    },
    
    /**
     * Vote on a review (helpful/unhelpful)
     */
    voteReview: function(reviewId, isHelpful) {
        console.log(`[DEBUG] review-manager.js: Voting ${isHelpful ? 'helpful' : 'unhelpful'} for review:`, reviewId);
        
        // Check if user is authenticated
        if (!this.checkAuthForReview()) {
            return;
        }
        
        // Check if user has already voted on this review
        const existingVote = this.getUserVoteForReview(reviewId);
        
        // If user is trying to vote the same way, treat as removing the vote
        if ((existingVote === 'yes' && isHelpful) || (existingVote === 'no' && !isHelpful)) {
            this.removeReviewVote(reviewId);
            return;
        }
        
        // Remove any existing vote first
        if (existingVote) {
            this.removeReviewVote(reviewId, false); // Don't refresh UI yet
        }
        
        // Find the review
        const review = this.state.currentReviews.find(r => r.id === reviewId);
        if (!review) {
            console.warn('[DEBUG] review-manager.js: Review not found for voting:', reviewId);
            return;
        }
        
        // Initialize helpfulVotes if doesn't exist
        if (!review.helpfulVotes) {
            review.helpfulVotes = { yes: 0, no: 0 };
        }
        
        // Update vote count
        if (isHelpful) {
            review.helpfulVotes.yes++;
        } else {
            review.helpfulVotes.no++;
        }
        
        // Save user's vote
        this.saveUserVote(reviewId, isHelpful ? 'yes' : 'no');
        
        // Update UI
        this.updateReviewVotes(reviewId);
        
        // In a real implementation, this would make an API call to update the vote on the server
    },
    
    /**
     * Remove a user's vote from a review
     */
    removeReviewVote: function(reviewId, updateUI = true) {
        // Get existing vote
        const existingVote = this.getUserVoteForReview(reviewId);
        if (!existingVote) return;
        
        // Find the review
        const review = this.state.currentReviews.find(r => r.id === reviewId);
        if (!review || !review.helpfulVotes) return;
        
        // Decrement the appropriate counter
        if (existingVote === 'yes') {
            review.helpfulVotes.yes = Math.max(0, review.helpfulVotes.yes - 1);
        } else {
            review.helpfulVotes.no = Math.max(0, review.helpfulVotes.no - 1);
        }
        
        // Remove user's vote
        this.removeUserVoteRecord(reviewId);
        
        // Update UI if requested
        if (updateUI) {
            this.updateReviewVotes(reviewId);
        }
    },
    
    /**
     * Update review votes display
     */
    updateReviewVotes: function(reviewId) {
        const reviewElement = document.querySelector(`.review-item[data-review-id="${reviewId}"]`);
        if (!reviewElement) return;
        
        // Find the review
        const review = this.state.currentReviews.find(r => r.id === reviewId);
        if (!review || !review.helpfulVotes) return;
        
        // Update vote counts
        const helpfulBtn = reviewElement.querySelector('.helpful-yes');
        const unhelpfulBtn = reviewElement.querySelector('.helpful-no');
        
        if (helpfulBtn) {
            helpfulBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> Yes (${review.helpfulVotes.yes})`;
        }
        
        if (unhelpfulBtn) {
            unhelpfulBtn.innerHTML = `<i class="fas fa-thumbs-down"></i> No (${review.helpfulVotes.no})`;
        }
        
        // Update button states
        const userVote = this.getUserVoteForReview(reviewId);
        
        if (helpfulBtn) {
            helpfulBtn.classList.toggle('voted', userVote === 'yes');
        }
        
        if (unhelpfulBtn) {
            unhelpfulBtn.classList.toggle('voted', userVote === 'no');
        }
    },
    
    /**
     * Report a review
     */
    reportReview: function(reviewId) {
        console.log('[DEBUG] review-manager.js: Reporting review:', reviewId);
        
        // Check if user is authenticated
        if (!this.checkAuthForReview()) {
            return;
        }
        
        // Show report modal
        this.openReportModal(reviewId);
    },
    
    /**
     * Open report review modal
     */
    openReportModal: function(reviewId) {
        // Check if modal already exists
        let reportModal = document.getElementById('report-review-modal');
        
        if (!reportModal) {
            // Create modal if it doesn't exist
            reportModal = document.createElement('div');
            reportModal.id = 'report-review-modal';
            reportModal.className = 'modal';
            reportModal.innerHTML = `
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
                    <div class="report-content">
                        <h3>Report Review</h3>
                        <p>Please select a reason for reporting this review:</p>
                        <form id="report-form">
                            <div class="form-group">
                                <label class="radio-container">
                                    <input type="radio" name="report-reason" value="inappropriate" checked>
                                    <span class="checkmark"></span>
                                    <span>Inappropriate content</span>
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="radio-container">
                                    <input type="radio" name="report-reason" value="spam">
                                    <span class="checkmark"></span>
                                    <span>Spam or misleading</span>
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="radio-container">
                                    <input type="radio" name="report-reason" value="not-relevant">
                                    <span class="checkmark"></span>
                                    <span>Not relevant to product</span>
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="radio-container">
                                    <input type="radio" name="report-reason" value="other">
                                    <span class="checkmark"></span>
                                    <span>Other</span>
                                </label>
                            </div>
                            <div class="form-group" id="other-reason-group" style="display: none;">
                                <label for="other-reason">Please explain:</label>
                                <textarea id="other-reason" class="form-control" rows="3"></textarea>
                            </div>
                            <div class="form-buttons">
                                <button type="button" class="btn btn-outline" id="cancel-report-btn">Cancel</button>
                                <button type="submit" class="btn btn-dark">Submit Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.appendChild(reportModal);
            
            // Set up event listeners
            const closeBtn = reportModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    reportModal.classList.remove('show');
                    document.body.style.overflow = '';
                });
            }
            
            const cancelBtn = reportModal.querySelector('#cancel-report-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    reportModal.classList.remove('show');
                    document.body.style.overflow = '';
                });
            }
            
            // Toggle "other" reason textarea
            const reasonRadios = reportModal.querySelectorAll('input[name="report-reason"]');
            const otherReasonGroup = reportModal.querySelector('#other-reason-group');
            
            reasonRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    otherReasonGroup.style.display = radio.value === 'other' ? 'block' : 'none';
                });
            });
            
            // Handle form submission
            const reportForm = reportModal.querySelector('#report-form');
            if (reportForm) {
                reportForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    // Get selected reason
                    const selectedReason = reportModal.querySelector('input[name="report-reason"]:checked');
                    let reason = selectedReason ? selectedReason.value : 'inappropriate';
                    
                    // Get "other" reason if selected
                    if (reason === 'other') {
                        const otherReasonText = reportModal.querySelector('#other-reason').value.trim();
                        if (!otherReasonText) {
                            this.showNotification('Please explain your reason for reporting', 'error');
                            return;
                        }
                        reason = otherReasonText;
                    }
                    
                    // Submit report
                    this.submitReviewReport(reviewId, reason);
                    
                    // Close modal
                    reportModal.classList.remove('show');
                    document.body.style.overflow = '';
                });
            }
        }
        
        // Set data attribute for review ID
        reportModal.setAttribute('data-review-id', reviewId);
        
        // Show modal
        reportModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Submit review report
     */
    submitReviewReport: function(reviewId, reason) {
        console.log('[DEBUG] review-manager.js: Submitting report for review:', reviewId, 'Reason:', reason);
        
        // In a real implementation, this would make an API call to submit the report
        
        // Show confirmation
        this.showNotification('Your report has been submitted. Thank you for helping us maintain quality content!', 'success');
    },
    
    /**
     * Open media gallery for review images
     */
    openMediaGallery: function(reviewId, initialImage) {
        console.log('[DEBUG] review-manager.js: Opening media gallery for review:', reviewId);
        
        // Find the review
        const review = this.state.currentReviews.find(r => r.id === reviewId);
        if (!review || !review.media || review.media.length === 0) return;
        
        // Check if gallery already exists
        let galleryModal = document.getElementById('review-media-gallery-modal');
        
        if (!galleryModal) {
            // Create gallery modal
            galleryModal = document.createElement('div');
            galleryModal.id = 'review-media-gallery-modal';
            galleryModal.className = 'modal gallery-modal';
            galleryModal.innerHTML = `
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal"><i class="fas fa-times"></i></button>
                    <div class="gallery-content">
                        <div class="gallery-main-image">
                            <img src="" alt="Review image">
                        </div>
                        <div class="gallery-controls">
                            <button class="gallery-prev" aria-label="Previous image"><i class="fas fa-chevron-left"></i></button>
                            <div class="gallery-counter">Image <span class="current-index">1</span> of <span class="total-images">1</span></div>
                            <button class="gallery-next" aria-label="Next image"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="gallery-thumbnails"></div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(galleryModal);
            
            // Set up event listeners
            const closeBtn = galleryModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    galleryModal.classList.remove('show');
                    document.body.style.overflow = '';
                });
            }
            
            // Gallery navigation
            const prevBtn = galleryModal.querySelector('.gallery-prev');
            const nextBtn = galleryModal.querySelector('.gallery-next');
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    const currentIndex = parseInt(galleryModal.getAttribute('data-current-index') || '0');
                    const totalImages = parseInt(galleryModal.getAttribute('data-total-images') || '0');
                    
                    const newIndex = (currentIndex - 1 + totalImages) % totalImages;
                    this.updateGalleryImage(newIndex);
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    const currentIndex = parseInt(galleryModal.getAttribute('data-current-index') || '0');
                    const totalImages = parseInt(galleryModal.getAttribute('data-total-images') || '0');
                    
                    const newIndex = (currentIndex + 1) % totalImages;
                    this.updateGalleryImage(newIndex);
                });
            }
            
            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (!galleryModal.classList.contains('show')) return;
                
                if (e.key === 'Escape') {
                    galleryModal.classList.remove('show');
                    document.body.style.overflow = '';
                } else if (e.key === 'ArrowLeft') {
                    prevBtn.click();
                } else if (e.key === 'ArrowRight') {
                    nextBtn.click();
                }
            });
        }
        
        // Store media in modal
        galleryModal.setAttribute('data-review-id', reviewId);
        galleryModal.setAttribute('data-media', JSON.stringify(review.media));
        
        // Set up thumbnails
        const thumbnailsContainer = galleryModal.querySelector('.gallery-thumbnails');
        if (thumbnailsContainer) {
            let thumbnailsHTML = '';
            
            review.media.forEach((item, index) => {
                thumbnailsHTML += `
                    <div class="gallery-thumbnail" data-index="${index}">
                        <img src="${item.url}" alt="Thumbnail ${index + 1}">
                    </div>
                `;
            });
            
            thumbnailsContainer.innerHTML = thumbnailsHTML;
            
            // Add click events for thumbnails
            const thumbnails = thumbnailsContainer.querySelectorAll('.gallery-thumbnail');
            thumbnails.forEach(thumbnail => {
                thumbnail.addEventListener('click', () => {
                    const index = parseInt(thumbnail.getAttribute('data-index') || '0');
                    this.updateGalleryImage(index);
                });
            });
        }
        
        // Set total images
        const totalImagesEl = galleryModal.querySelector('.total-images');
        if (totalImagesEl) {
            totalImagesEl.textContent = review.media.length;
        }
        
        // Set initial image
        let initialIndex = 0;
        if (initialImage) {
            const index = review.media.findIndex(item => item.url === initialImage);
            if (index !== -1) {
                initialIndex = index;
            }
        }
        
        galleryModal.setAttribute('data-total-images', review.media.length.toString());
        galleryModal.setAttribute('data-current-index', initialIndex.toString());
        
        this.updateGalleryImage(initialIndex);
        
        // Show modal
        galleryModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    },
    
    /**
     * Update gallery image
     */
    updateGalleryImage: function(index) {
        const galleryModal = document.getElementById('review-media-gallery-modal');
        if (!galleryModal) return;
        
        // Get media from data attribute
        const mediaJSON = galleryModal.getAttribute('data-media');
        if (!mediaJSON) return;
        
        try {
            const media = JSON.parse(mediaJSON);
            if (!media || !Array.isArray(media) || index >= media.length) return;
            
            // Update main image
            const mainImage = galleryModal.querySelector('.gallery-main-image img');
            if (mainImage) {
                mainImage.src = media[index].url;
            }
            
            // Update current index
            galleryModal.setAttribute('data-current-index', index.toString());
            
            // Update counter
            const currentIndexEl = galleryModal.querySelector('.current-index');
            if (currentIndexEl) {
                currentIndexEl.textContent = (index + 1).toString();
            }
            
            // Update thumbnails
            const thumbnails = galleryModal.querySelectorAll('.gallery-thumbnail');
            thumbnails.forEach((thumbnail, i) => {
                thumbnail.classList.toggle('active', i === index);
            });
        } catch (e) {
            console.error('[DEBUG] review-manager.js: Error parsing media JSON:', e);
        }
    },
    
    /**
     * Check user's review status for current product
     */
    checkUserReviewStatus: function() {
        if (!this.state.currentProductId) return;
        
        // Check if user has already reviewed this product
        const hasReviewed = this.hasUserReviewedProduct(this.state.currentProductId);
        
        // Update write review button
        const writeReviewBtn = document.getElementById('write-review-btn');
        if (writeReviewBtn) {
            if (hasReviewed) {
                writeReviewBtn.textContent = 'Edit Your Review';
                writeReviewBtn.setAttribute('data-action', 'edit');
            } else {
                writeReviewBtn.textContent = 'Write a Review';
                writeReviewBtn.setAttribute('data-action', 'create');
            }
        }
    },
    
    /**
     * Pagination: Go to next page
     */
    nextPage: function() {
        const displayReviews = this.getFilteredSortedReviews();
        const totalPages = Math.ceil(displayReviews.length / this.config.defaultPageSize);
        
        if (this.state.currentPage < totalPages) {
            this.state.currentPage++;
            this.renderReviews();
            
            // Scroll to reviews container
            const reviewsContainer = document.querySelector('.customer-reviews');
            if (reviewsContainer) {
                reviewsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },
    
    /**
     * Pagination: Go to previous page
     */
    prevPage: function() {
        if (this.state.currentPage > 1) {
            this.state.currentPage--;
            this.renderReviews();
            
            // Scroll to reviews container
            const reviewsContainer = document.querySelector('.customer-reviews');
            if (reviewsContainer) {
                reviewsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },
    
    /**
     * Pagination: Go to specific page
     */
    goToPage: function(page) {
        const displayReviews = this.getFilteredSortedReviews();
        const totalPages = Math.ceil(displayReviews.length / this.config.defaultPageSize);
        
        if (page >= 1 && page <= totalPages) {
            this.state.currentPage = page;
            this.renderReviews();
            
            // Scroll to reviews container
            const reviewsContainer = document.querySelector('.customer-reviews');
            if (reviewsContainer) {
                reviewsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    },
    
    /**
     * Refresh reviews (after sorting/filtering change)
     */
    refreshReviews: function() {
        this.state.currentPage = 1; // Reset to first page
        this.renderReviews();
    },
    
    /**
     * Save user's review draft
     */
    saveReviewDraft: function() {
        if (!this.state.currentProductId) return;
        
        const draftKey = `reviewDraft_${this.state.currentProductId}`;
        try {
            localStorage.setItem(draftKey, JSON.stringify(this.state.reviewDraft));
        } catch (e) {
            console.error('[DEBUG] review-manager.js: Error saving review draft:', e);
        }
    },
    
    /**
     * Clear user's review draft
     */
    clearReviewDraft: function() {
        if (!this.state.currentProductId) return;
        
        const draftKey = `reviewDraft_${this.state.currentProductId}`;
        try {
            localStorage.removeItem(draftKey);
        } catch (e) {
            console.error('[DEBUG] review-manager.js: Error clearing review draft:', e);
        }
    },
    
    /**
     * Restore user's review draft
     */
    restoreReviewDraft: function(draft) {
        // Update state
        this.state.reviewDraft = draft;
        
        // Update form elements
        const reviewTitle = document.getElementById('review-title');
        const reviewText = document.getElementById('review-text');
        
        if (reviewTitle && draft.title) {
            reviewTitle.value = draft.title;
        }
        
        if (reviewText && draft.content) {
            reviewText.value = draft.content;
        }
        
        // Update rating stars
        if (draft.rating) {
            this.setReviewRating(draft.rating);
        }
        
        // Update media preview
        if (draft.media && draft.media.length > 0) {
            this.updateMediaPreview();
        }
    },
    
    /**
     * Add review to user's reviews
     */
    addUserReview: function(reviewData) {
        if (!reviewData.productId) return;
        
        const reviewId = `review_${Date.now()}`;
        
        // Add user information
        const userInfo = this.getUserInfo();
        
        const review = {
            id: reviewId,
            ...reviewData,
            authorId: userInfo.id,
            authorName: userInfo.name,
            verifiedPurchase: true, // In a real implementation, this would be checked against order history
            helpfulVotes: { yes: 0, no: 0 }
        };
        
        // Add to user reviews in state
        this.state.userReviews[reviewData.productId] = review;
        
        // Save to storage
        this.saveUserReviewData();
        
        // In a real implementation, this would make an API call to save the review on the server
    },
    
    /**
     * Check if user has reviewed a product
     */
    hasUserReviewedProduct: function(productId) {
        return !!this.state.userReviews[productId];
    },
    
    /**
     * Save user's vote on a review
     */
    saveUserVote: function(reviewId, vote) {
        if (!reviewId || !vote) return;
        
        // Add to votes in state
        this.state.reviewVotes[reviewId] = vote;
        
        // Save to storage
        this.saveUserReviewData();
        
        // In a real implementation, this would make an API call to save the vote on the server
    },
    
    /**
     * Remove user's vote record for a review
     */
    removeUserVoteRecord: function(reviewId) {
        if (!reviewId || !this.state.reviewVotes[reviewId]) return;
        
        // Remove from votes in state
        delete this.state.reviewVotes[reviewId];
        
        // Save to storage
        this.saveUserReviewData();
        
        // In a real implementation, this would make an API call to remove the vote on the server
    },
    
    /**
     * Get user's vote for a review
     */
    getUserVoteForReview: function(reviewId) {
        return this.state.reviewVotes[reviewId] || null;
    },
    
    /**
     * Save user review data to storage
     */
    saveUserReviewData: function() {
        try {
            localStorage.setItem('bingoUserReviews', JSON.stringify(this.state.userReviews));
            localStorage.setItem('bingoUserReviewVotes', JSON.stringify(this.state.reviewVotes));
        } catch (e) {
            console.error('[DEBUG] review-manager.js: Error saving user review data:', e);
        }
    },
    
    /**
     * Load user review data from storage
     */
    loadUserReviewData: function() {
        try {
            const savedReviews = localStorage.getItem('bingoUserReviews');
            const savedVotes = localStorage.getItem('bingoUserReviewVotes');
            
            if (savedReviews) {
                this.state.userReviews = JSON.parse(savedReviews);
            }
            
            if (savedVotes) {
                this.state.reviewVotes = JSON.parse(savedVotes);
            }
        } catch (e) {
            console.error('[DEBUG] review-manager.js: Error loading user review data:', e);
            this.state.userReviews = {};
            this.state.reviewVotes = {};
        }
    },
    refreshReviews: function() {
        console.log('[DEBUG] review-manager.js: Refreshing reviews');
        if (this.state.currentProductId) {
            // Get current filters and sorting
            const currentSort = this.state.sortBy;
            const currentFilter = this.state.filterBy;
            
            // Reload reviews and apply current filters
            this.loadProductReviews(this.state.currentProductId);
        }
    },
    
    /**
     * Get user information (in a real implementation, this would come from AuthManager)
     */
    getUserInfo: function() {
        // Default user info
        const defaultInfo = {
            id: 'user_123',
            name: 'John Doe'
        };
        
        // Try to get from AuthManager if available
        if (window.AuthManager && typeof window.AuthManager.getUserInfo === 'function') {
            const authUserInfo = window.AuthManager.getUserInfo();
            if (authUserInfo) {
                return authUserInfo;
            }
        }
        
        return defaultInfo;
    },
    
    /**
     * Get initials from a name
     */
    getNameInitials: function(name) {
        if (!name) return '??';
        
        const nameParts = name.split(' ');
        if (nameParts.length === 1) {
            return name.substring(0, 2).toUpperCase();
        }
        
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    },
    
    /**
     * Format date
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
        // Format options
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },
    
    /**
     * Generate HTML for star rating
     */
    generateStarsHTML: function(rating) {
        if (typeof rating !== 'number' || isNaN(rating)) {
            return '<i class="far fa-star"></i>'.repeat(5);
        }
        
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        let html = '';
        
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                html += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                html += '<i class="fas fa-star-half-alt"></i>';
            } else {
                html += '<i class="far fa-star"></i>';
            }
        }
        
        return html;
    },
    
    /**
     * Check if current page is a product page
     */
    isProductPage: function() {
        return (
            window.location.pathname.includes('product.html') || 
            document.querySelector('.product-detail') !== null
        );
    },
    
    /**
     * Show notification
     */
    showNotification: function(message, type = 'success') {
        console.log(`[DEBUG] review-manager.js: Showing notification - Type: ${type}, Message: ${message}`);
        
        // Use CartManager's notification system if available
        if (window.CartManager && typeof window.CartManager.showNotification === 'function') {
            window.CartManager.showNotification(message, type);
            return;
        }
        
        // Fallback notification system
        const notificationContainer = document.getElementById('notification-container') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}"></i>
                <p>${message}</p>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        const closeBtn = notification.querySelector('.notification-close');
        let autoCloseTimeoutId = setTimeout(() => closeNotification(notification), 3000);
        
        closeBtn.addEventListener('click', () => closeNotification(notification, autoCloseTimeoutId), { once: true });
        
        function closeNotification(notif, timeoutIdToClear = null) {
            if (timeoutIdToClear) clearTimeout(timeoutIdToClear);
            if (!notif || !notif.parentNode) return; // Already removed or never properly attached
            
            notif.classList.remove('show');
            notif.classList.add('hide');
            
            notif.addEventListener('transitionend', () => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            }, { once: true });
        }
    },
    
    /**
     * Create notification container
     */
    createNotificationContainer: function() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
            console.log('[DEBUG] review-manager.js: Notification container created.');
        }
        return container;
    }
};

// Initialize review manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.ReviewManager) {
            window.ReviewManager.init();
        }
    });
} else {
    if (window.ReviewManager) {
        window.ReviewManager.init();
    }
}

console.log('[DEBUG] review-manager.js: ReviewManager object defined');