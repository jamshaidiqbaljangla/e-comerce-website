/**
 * BINGO E-commerce Search Manager
 * Handles search functionality, suggestions, and results
 */

window.SearchManager = {
    // Configuration
    config: {
        minSearchLength: 2,
        maxSuggestions: 6,
        maxRecentSearches: 5,
        searchDelay: 300, // milliseconds
        dropdownOpenClass: 'active'
    },
    
    // State variables
    state: {
        searchTerm: '',
        recentSearches: [],
        searchResults: [],
        resultCount: 0,
        searching: false,
        searchTimeout: null,
        sortOrder: 'relevance'
    },
    
    /**
     * Initialize the search manager
     */
    init: function() {
        console.log('[DEBUG] search-manager.js: Search Manager initializing...');
        
        this.loadRecentSearches();
        this.setupSearchListeners();
        this.initSortingControls();
        
        // If on search results page, handle URL params and show results
        if (window.location.pathname.includes('search.html')) {
            this.handleSearchResultsPage();
        }
        
        console.log('[DEBUG] search-manager.js: Search Manager initialized');
    },
    
    /**
     * Set up event listeners for search functionality
     */
    setupSearchListeners: function() {
        // Search form and input
        const searchForms = document.querySelectorAll('.search-form');
        searchForms.forEach(form => {
            // Prevent default submission and handle search manually
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input[type="text"]');
                if (input && input.value.trim().length >= this.config.minSearchLength) {
                    this.performSearch(input.value.trim());
                }
            });
            
            // Set up live search
            const searchInput = form.querySelector('input[type="text"]');
            if (searchInput) {
                // Add event listener for input changes (typing)
                searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.trim();
                    this.state.searchTerm = searchTerm;
                    
                    // Toggle clear button visibility
                    const clearBtn = form.querySelector('.clear-search');
                    if (clearBtn) {
                        clearBtn.style.display = searchTerm.length > 0 ? 'block' : 'none';
                    }
                    
                    // Clear previous timeout
                    if (this.state.searchTimeout) {
                        clearTimeout(this.state.searchTimeout);
                    }
                    
                    // Don't search for very short terms
                    if (searchTerm.length < this.config.minSearchLength) {
                        this.clearSearchSuggestions();
                        return;
                    }
                    
                    // Set timeout for search to avoid too many searches while typing
                    this.state.searchTimeout = setTimeout(() => {
                        this.showSearchSuggestions(searchTerm);
                    }, this.config.searchDelay);
                });
                
                // Focus listener to show recent searches
                searchInput.addEventListener('focus', () => {
                    if (searchInput.value.trim().length < this.config.minSearchLength) {
                        this.showRecentSearches();
                    }
                });
                
                // Escape key to clear and close suggestions
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.clearSearchSuggestions();
                        searchInput.blur();
                        this.closeSearchDropdown();
                    }
                });
            }
            
            // Clear search button
            const clearBtn = form.querySelector('.clear-search');
            if (clearBtn) {
                clearBtn.style.display = 'none'; // Hide initially
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const searchInput = form.querySelector('input[type="text"]');
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.focus();
                        clearBtn.style.display = 'none';
                        this.showRecentSearches();
                    }
                });
            }
        });
        
        // Search toggle button
        const searchToggles = document.querySelectorAll('.search-toggle');
        searchToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const searchContainer = toggle.closest('.search-container');
                if (searchContainer) {
                    // Toggle active class
                    const isActive = searchContainer.classList.contains(this.config.dropdownOpenClass);
                    
                    // Close all dropdowns first
                    document.querySelectorAll('.search-container').forEach(container => {
                        container.classList.remove(this.config.dropdownOpenClass);
                    });
                    
                    // If wasn't active, open it
                    if (!isActive) {
                        searchContainer.classList.add(this.config.dropdownOpenClass);
                        
                        // Focus search input when opened
                        const searchInput = searchContainer.querySelector('input[type="text"]');
                        if (searchInput) {
                            setTimeout(() => {
                                searchInput.focus();
                                
                                // Show recent searches if input is empty
                                if (searchInput.value.trim().length < this.config.minSearchLength) {
                                    this.showRecentSearches();
                                }
                            }, 100);
                        }
                    }
                }
            });
        });
        
        // Close search dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.closeSearchDropdown();
            }
        });
    },
    
    /**
     * Close all search dropdowns
     */
    closeSearchDropdown: function() {
        const searchContainers = document.querySelectorAll('.search-container');
        searchContainers.forEach(container => {
            container.classList.remove(this.config.dropdownOpenClass);
        });
    },
    
    /**
     * Initialize sorting controls for search results
     */
    initSortingControls: function() {
        const sortSelect = document.getElementById('search-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.state.sortOrder = sortSelect.value;
                
                // Reapply sorting to current results
                const searchTerm = new URLSearchParams(window.location.search).get('q');
                if (searchTerm && this.state.searchResults.length > 0) {
                    this.sortSearchResults();
                    this.displaySearchResults(searchTerm, false); // false = don't perform new search
                }
            });
        }
    },
    
    /**
     * Sort search results based on current sort order
     */
    sortSearchResults: function() {
        switch (this.state.sortOrder) {
            case 'price-low':
                this.state.searchResults.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                this.state.searchResults.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                this.state.searchResults.sort((a, b) => {
                    // Assuming products have a dateAdded property, or fallback to id
                    const dateA = a.dateAdded ? new Date(a.dateAdded) : a.id;
                    const dateB = b.dateAdded ? new Date(b.dateAdded) : b.id;
                    return dateB - dateA;
                });
                break;
            case 'relevance':
            default:
                // Already sorted by relevance from the search
                this.state.searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
                break;
        }
    },
    
    /**
     * Show search suggestions as the user types
     */
    showSearchSuggestions: function(searchTerm) {
        if (!searchTerm || searchTerm.length < this.config.minSearchLength) {
            return;
        }
        
        this.state.searching = true;
        
        // Get search results based on searchTerm
        const searchResults = this.searchProducts(searchTerm);
        
        // Get all suggestions containers
        const suggestionContainers = document.querySelectorAll('.search-suggestions');
        if (suggestionContainers.length === 0) return;
        
        // Update all search suggestion containers
        suggestionContainers.forEach(container => {
            // Show loading state
            container.innerHTML = '<div class="searching"><div class="spinner"></div><p>Searching...</p></div>';
            container.style.display = 'block';
            
            // Simulate search delay for better UX (can be removed in production)
            setTimeout(() => {
                // Abort if the search term has changed during the delay
                if (this.state.searchTerm !== searchTerm) return;
                
                if (searchResults.length > 0) {
                    // Limit number of suggestions
                    const limitedResults = searchResults.slice(0, this.config.maxSuggestions);
                    
                    // Build suggestions HTML
                    let suggestionsHtml = `
                        <div class="suggestions-header">
                            <h4>Suggestions</h4>
                            <a href="search.html?q=${encodeURIComponent(searchTerm)}" class="view-all">View all results</a>
                        </div>
                        <div class="suggestions-items">
                    `;
                    
                    limitedResults.forEach(product => {
                        suggestionsHtml += `
                            <a href="product.html?id=${product.id}" class="suggestion-item">
                                <div class="suggestion-image">
                                    <img src="${product.images.primary}" alt="${product.name}">
                                </div>
                                <div class="suggestion-content">
                                    <h4>${this.highlightSearchTerm(product.name, searchTerm)}</h4>
                                    <div class="suggestion-price">${this.formatPrice(product.price)}</div>
                                </div>
                            </a>
                        `;
                    });
                    
                    suggestionsHtml += `
                        </div>
                        <div class="suggestions-footer">
                            <a href="search.html?q=${encodeURIComponent(searchTerm)}" class="btn btn-dark btn-sm">View all ${searchResults.length} results</a>
                        </div>
                    `;
                    
                    // Update suggestions container
                    container.innerHTML = suggestionsHtml;
                } else {
                    // No results found
                    container.innerHTML = `
                        <div class="no-suggestions">
                            <p>No results found for "${searchTerm}"</p>
                            <a href="shop.html" class="btn btn-outline btn-sm">Browse all products</a>
                        </div>
                    `;
                }
                
                this.state.searching = false;
            }, 300); // Simulated delay for better UX
        });
    },
    
    /**
     * Show recent searches when the search input is focused
     */
    showRecentSearches: function() {
        // Get all suggestions containers
        const suggestionContainers = document.querySelectorAll('.search-suggestions');
        if (suggestionContainers.length === 0) return;
        
        // Get recent searches
        const recentSearches = this.state.recentSearches;
        
        // Update all search suggestion containers
        suggestionContainers.forEach(container => {
            if (recentSearches.length > 0) {
                // Build recent searches HTML
                let recentHtml = `
                    <div class="suggestions-header">
                        <h4>Recent Searches</h4>
                        <button class="clear-recent">Clear</button>
                    </div>
                    <div class="recent-searches">
                `;
                
                recentSearches.forEach(search => {
                    recentHtml += `
                        <a href="search.html?q=${encodeURIComponent(search)}" class="recent-search-item">
                            <i class="fas fa-history"></i>
                            <span>${search}</span>
                        </a>
                    `;
                });
                
                recentHtml += `
                    </div>
                    <div class="suggestions-footer">
                        <a href="shop.html" class="btn btn-outline btn-sm">Browse all products</a>
                    </div>
                `;
                
                // Update suggestions container
                container.innerHTML = recentHtml;
                container.style.display = 'block';
                
                // Add clear recent searches button event
                const clearBtn = container.querySelector('.clear-recent');
                if (clearBtn) {
                    clearBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.clearRecentSearches();
                        this.showRecentSearches(); // Refresh to show empty state
                    });
                }
            } else {
                // No recent searches
                container.innerHTML = `
                    <div class="no-suggestions">
                        <p>Start typing to search products</p>
                        <a href="shop.html" class="btn btn-outline btn-sm">Browse all products</a>
                    </div>
                `;
                container.style.display = 'block';
            }
        });
    },
    
    /**
     * Clear search suggestions
     */
    clearSearchSuggestions: function() {
        const suggestionContainers = document.querySelectorAll('.search-suggestions');
        suggestionContainers.forEach(container => {
            container.innerHTML = '';
            container.style.display = 'none';
        });
    },
    
    /**
     * Perform search action (redirects to search results page)
     */
    performSearch: function(searchTerm) {
        if (!searchTerm || searchTerm.length < this.config.minSearchLength) {
            return;
        }
        
        // Add to recent searches
        this.addToRecentSearches(searchTerm);
        
        // If already on search page, just update results and URL
        if (window.location.pathname.includes('search.html')) {
            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('q', searchTerm);
            window.history.pushState({}, '', url);
            
            // Update page title
            document.title = `Search: ${searchTerm} | BINGO`;
            
            // Update search heading
            const searchHeading = document.getElementById('search-heading');
            if (searchHeading) {
                searchHeading.textContent = `Search Results for "${searchTerm}"`;
            }
            
            // Display new search results
            this.displaySearchResults(searchTerm, true); // true = perform new search
            
            return;
        }
        
        // Redirect to search results page
        window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
    },
    
    /**
     * Handle search results page functionality
     */
    handleSearchResultsPage: function() {
        // Get search term from URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('q');
        
        if (!searchTerm || searchTerm.length < this.config.minSearchLength) {
            // No valid search term, redirect to shop page
            window.location.href = 'shop.html';
            return;
        }
        
        // Update search input with the current search term
        document.querySelectorAll('.search-form input[type="text"]').forEach(input => {
            input.value = searchTerm;
            
            // Show clear button if there's text
            const clearBtn = input.parentElement.querySelector('.clear-search');
            if (clearBtn) {
                clearBtn.style.display = 'block';
            }
        });
        
        // Set page title
        document.title = `Search: ${searchTerm} | BINGO`;
        
        // Update search heading
        const searchHeading = document.getElementById('search-heading');
        if (searchHeading) {
            searchHeading.textContent = `Search Results for "${searchTerm}"`;
        }
        
        // Add to recent searches
        this.addToRecentSearches(searchTerm);
        
        // Perform search and display results
        this.displaySearchResults(searchTerm, true); // true = perform new search
        
        // Check for sort order in URL
        const sortOrder = urlParams.get('sort');
        if (sortOrder) {
            this.state.sortOrder = sortOrder;
            const sortSelect = document.getElementById('search-sort');
            if (sortSelect) {
                sortSelect.value = sortOrder;
            }
        }
    },
    
    /**
     * Display search results on the search results page
     */
    displaySearchResults: function(searchTerm, performNewSearch = true) {
        // Get search results container
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;
        
        // Show loading state if performing new search
        if (performNewSearch) {
            resultsContainer.innerHTML = `
                <div class="searching">
                    <div class="spinner"></div>
                    <p>Searching for "${searchTerm}"...</p>
                </div>
            `;
            
            // Get search results
            this.state.searchResults = this.searchProducts(searchTerm);
        }
        
        // Sort results based on current sort order
        this.sortSearchResults();
        
        // Update result count
        this.state.resultCount = this.state.searchResults.length;
        const resultCount = document.getElementById('result-count');
        if (resultCount) {
            resultCount.textContent = this.state.resultCount;
        }
        
        // Simulate search delay for better UX (remove in production)
        setTimeout(() => {
            if (this.state.searchResults.length > 0) {
                let resultsHtml = '';
                
                // Generate results HTML
                this.state.searchResults.forEach(product => {
                    resultsHtml += `
                        <div class="search-result-item" data-product-id="${product.id}">
                            <div class="result-image">
                                <a href="product.html?id=${product.id}">
                                    <img src="${product.images.primary}" alt="${product.name}">
                                </a>
                            </div>
                            <div class="result-content">
                                <h3 class="result-title">
                                    <a href="product.html?id=${product.id}">${this.highlightSearchTerm(product.name, searchTerm)}</a>
                                </h3>
                                <div class="result-category">
                                    ${this.getCategoryLinks(product.categories)}
                                </div>
                                <div class="result-description">
                                    ${this.highlightSearchTerm(this.truncateText(product.description || '', 150), searchTerm)}
                                </div>
                                <div class="result-price">
                                    ${product.oldPrice ? `<span class="old-price">${this.formatPrice(product.oldPrice)}</span> ` : ''}
                                    <span class="current-price">${this.formatPrice(product.price)}</span>
                                </div>
                                <div class="result-actions">
                                    <button class="btn btn-dark add-to-cart-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                                        ${product.inStock ? 'Add to Cart' : 'Sold Out'}
                                    </button>
                                    <button class="btn btn-outline wishlist-btn" data-product-id="${product.id}">
                                        <i class="far fa-heart"></i> Wishlist
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                // Update results container
                resultsContainer.innerHTML = resultsHtml;
                
                // Generate related searches
                this.generateRelatedSearches(searchTerm);
                
                // Initialize cart and wishlist buttons if available
                if (window.CartManager && typeof window.CartManager.bindEvents === 'function') {
                    window.CartManager.bindEvents();
                }
                
                if (window.WishlistManager && typeof window.WishlistManager.updateWishlistDisplay === 'function') {
                    window.WishlistManager.updateWishlistDisplay();
                }
            } else {
                // No results found
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fas fa-search"></i>
                        <h3>No results found for "${searchTerm}"</h3>
                        <p>Try different keywords or browse all our products.</p>
                        <a href="shop.html" class="btn btn-dark">Browse All Products</a>
                    </div>
                `;
                
                // Hide related searches
                const relatedContainer = document.getElementById('related-searches');
                if (relatedContainer) {
                    relatedContainer.style.display = 'none';
                }
            }
        }, performNewSearch ? 500 : 0); // Only delay if it's a new search
    },
    
    /**
     * Generate related searches based on current search term
     */
    generateRelatedSearches: function(searchTerm) {
        const relatedContainer = document.getElementById('related-searches');
        if (!relatedContainer) return;
        
        // If no results or very short term, hide related searches
        if (this.state.searchResults.length === 0 || searchTerm.length < 3) {
            relatedContainer.style.display = 'none';
            return;
        }
        
        // Extract categories and keywords from search results
        const categories = new Set();
        const keywords = new Set();
        const termWords = searchTerm.toLowerCase().split(/\s+/);
        
        this.state.searchResults.forEach(product => {
            // Add categories
            if (product.categories && product.categories.length) {
                product.categories.forEach(catId => {
                    if (window.PRODUCTS && window.PRODUCTS.categories && window.PRODUCTS.categories[catId]) {
                        categories.add(window.PRODUCTS.categories[catId].name);
                    }
                });
            }
            
            // Extract keywords from product name
            if (product.name) {
                const nameWords = product.name.toLowerCase().split(/\s+/);
                nameWords.forEach(word => {
                    if (word.length > 3 && !termWords.includes(word)) {
                        keywords.add(word.charAt(0).toUpperCase() + word.slice(1));
                    }
                });
            }
        });
        
        // Create related search suggestions
        const relatedSearches = [];
        
        // Related by category
        categories.forEach(category => {
            relatedSearches.push(`${searchTerm} in ${category}`);
        });
        
        // Related by additional keywords
        keywords.forEach(keyword => {
            relatedSearches.push(`${searchTerm} ${keyword}`);
        });
        
        // Display related searches if we have any
        if (relatedSearches.length > 0) {
            // Limit number of related searches
            const limitedRelated = relatedSearches.slice(0, 8);
            
            // Generate HTML
            let relatedHtml = '';
            limitedRelated.forEach(related => {
                relatedHtml += `
                    <a href="search.html?q=${encodeURIComponent(related)}" class="related-search-tag">
                        ${related}
                    </a>
                `;
            });
            
            const relatedSearchesDiv = relatedContainer.querySelector('.related-searches');
            if (relatedSearchesDiv) {
                relatedSearchesDiv.innerHTML = relatedHtml;
                relatedContainer.style.display = 'block';
            }
        } else {
            relatedContainer.style.display = 'none';
        }
    },
    
    /**
     * Search products based on search term
     */
    searchProducts: function(searchTerm) {
        // Normalize search term (lowercase, remove extra spaces)
        const normalizedTerm = searchTerm.toLowerCase().trim();
        const searchTerms = normalizedTerm.split(/\s+/);
        
        // Ensure we have products data
        if (!window.PRODUCTS || !Array.isArray(window.PRODUCTS.items)) {
            console.error('[DEBUG] search-manager.js: PRODUCTS data not available for search.');
            return [];
        }
        
        // Search algorithm with multiple term support and relevance scoring
        return window.PRODUCTS.items
            .map(product => {
                // Prepare searchable fields
                const name = product.name.toLowerCase();
                const description = (product.description || '').toLowerCase();
                const categoryNames = (product.categories || []).map(cat => {
                    return window.PRODUCTS.categories && window.PRODUCTS.categories[cat] 
                        ? window.PRODUCTS.categories[cat].name.toLowerCase() 
                        : cat.toLowerCase();
                });
                
                // Calculate relevance score for each search term
                let relevanceScore = 0;
                let allTermsMatch = true;
                
                searchTerms.forEach(term => {
                    let termMatches = false;
                    
                    // Name match (highest relevance)
                    if (name.includes(term)) {
                        relevanceScore += 10;
                        termMatches = true;
                        
                        // Exact name match or starts with term (even higher relevance)
                        if (name === term || name.startsWith(term + ' ')) {
                            relevanceScore += 15;
                        }
                    }
                    
                    // Description match
                    if (description.includes(term)) {
                        relevanceScore += 5;
                        termMatches = true;
                    }
                    
                    // Category match
                    if (categoryNames.some(cat => cat.includes(term))) {
                        relevanceScore += 7;
                        termMatches = true;
                    }
                    
                    // Check if this term was found
                    if (!termMatches) {
                        allTermsMatch = false;
                    }
                });
                
                // If multi-term search and not all terms match, product doesn't qualify
                if (searchTerms.length > 1 && !allTermsMatch) {
                    relevanceScore = 0;
                }
                
                return {
                    ...product,
                    relevanceScore
                };
            })
            .filter(product => product.relevanceScore > 0) // Only include products with matches
            .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance
    },
    
    /**
     * Highlight search term in text
     */
    highlightSearchTerm: function(text, searchTerm) {
        if (!text || !searchTerm) return text;
        
        // Normalize search term and split into separate terms
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();
        const searchTerms = normalizedSearchTerm.split(/\s+/);
        
        // Create regular expression for highlighting
        const searchRegex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
        
        // Replace with highlighted version
        return text.replace(searchRegex, '<span class="highlight">$1</span>');
    },
    
    /**
     * Get category links HTML
     */
    getCategoryLinks: function(categories) {
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return '';
        }
        
        return categories.map(categoryId => {
            const categoryName = window.PRODUCTS && window.PRODUCTS.categories && window.PRODUCTS.categories[categoryId] 
                ? window.PRODUCTS.categories[categoryId].name 
                : this.formatCategoryName(categoryId);
                
            return `<a href="category.html?id=${categoryId}" class="result-category-link">${categoryName}</a>`;
        }).join(', ');
    },
    
    /**
     * Format category name (convert slug to title case)
     */
    formatCategoryName: function(category) {
        return category
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },
    
    /**
     * Format price with currency
     */
    formatPrice: function(price) {
        if (typeof price !== 'number') {
            return '$0.00';
        }
        
        return `$${price.toFixed(2)}`;
    },
    
    /**
     * Truncate text to a specific length and add ellipsis
     */
    truncateText: function(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        
        // Find a good break point (end of a word)
        const breakPoint = text.lastIndexOf(' ', maxLength);
        if (breakPoint === -1) {
            return text.substring(0, maxLength) + '...';
        }
        
        return text.substring(0, breakPoint) + '...';
    },
    
    /**
     * Add search term to recent searches
     */
    addToRecentSearches: function(searchTerm) {
        if (!searchTerm || searchTerm.length < this.config.minSearchLength) {
            return;
        }
        
        // Normalize search term
        const normalizedTerm = searchTerm.trim();
        
        // Remove if already exists (to move to top)
        const recentSearches = this.state.recentSearches.filter(term => term !== normalizedTerm);
        
        // Add to beginning of array
        recentSearches.unshift(normalizedTerm);
        
        // Limit to max number of recent searches
        this.state.recentSearches = recentSearches.slice(0, this.config.maxRecentSearches);
        
        // Save to localStorage
        this.saveRecentSearches();
    },
    
    /**
     * Clear recent searches
     */
    clearRecentSearches: function() {
        this.state.recentSearches = [];
        this.saveRecentSearches();
    },
    
    /**
     * Save recent searches to localStorage
     */
    saveRecentSearches: function() {
        try {
            localStorage.setItem('bingoRecentSearches', JSON.stringify(this.state.recentSearches));
        } catch (e) {
            console.error('[DEBUG] search-manager.js: Error saving recent searches:', e);
        }
    },
    
    /**
     * Load recent searches from localStorage
     */
    loadRecentSearches: function() {
        try {
            const savedSearches = localStorage.getItem('bingoRecentSearches');
            if (savedSearches) {
                this.state.recentSearches = JSON.parse(savedSearches);
            }
        } catch (e) {
            console.error('[DEBUG] search-manager.js: Error loading recent searches:', e);
            this.state.recentSearches = [];
        }
    }
};

// Initialize search manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.SearchManager) {
            window.SearchManager.init();
        }
    });
} else {
    if (window.SearchManager) {
        window.SearchManager.init();
    }
}

console.log('[DEBUG] search-manager.js: SearchManager object defined');