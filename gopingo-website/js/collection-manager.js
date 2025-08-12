/**
 * BINGO E-commerce Collection Manager
 * Handles collection navigation and filtering
 */

window.CollectionManager = {
    // Configuration
    COLLECTION_PARAM: 'collection',
    
    /**
     * Initialize the collection manager
     */
    init: function() {
        console.log('[DEBUG] collection-manager.js: Collection Manager initializing...');
        
        // Set up collection links throughout the site
        this.setupCollectionLinks();
        
        // If we're on the shop page, handle collection filtering
        if (window.location.pathname.includes('shop.html')) {
            this.handleCollectionFilter();
        }
        
        console.log('[DEBUG] collection-manager.js: Collection Manager initialized');
    },
    
    /**
     * Set up collection links to point to shop with appropriate parameters
     */
    setupCollectionLinks: function() {
        // Get all collection links
        const collectionLinks = document.querySelectorAll('a[href*="collection.html"]');
        
        collectionLinks.forEach(link => {
            // Get collection name from link text or data attribute
            const collectionName = link.getAttribute('data-collection') || 
                                  link.textContent.trim().replace(/\s+/g, '-').toLowerCase();
            
            // Update href to point to shop with collection parameter
            link.setAttribute('href', `shop.html?${this.COLLECTION_PARAM}=${encodeURIComponent(collectionName)}`);
            
            console.log(`[DEBUG] collection-manager.js: Updated collection link: ${collectionName}`);
        });
    },
    
    /**
     * Handle collection filtering on shop page
     */
    handleCollectionFilter: function() {
        // Get collection parameter from URL
        const urlParams = new URLSearchParams(window.location.search);
        const collection = urlParams.get(this.COLLECTION_PARAM);
        
        if (!collection) return;
        
        console.log(`[DEBUG] collection-manager.js: Filtering shop for collection: ${collection}`);
        
        // Update page title to show collection
        const shopTitle = document.querySelector('.shop-header .section-title');
        if (shopTitle) {
            const formattedCollectionName = collection
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
                
            shopTitle.textContent = formattedCollectionName + ' Collection';
        }
        
        // If ShopManager exists, trigger filtering
        if (window.ShopManager && typeof window.ShopManager.filterByCollection === 'function') {
            window.ShopManager.filterByCollection(collection);
        } else {
            // Fallback: Basic filtering using data attributes
            this.basicCollectionFiltering(collection);
        }
    },
    
    /**
     * Basic collection filtering if ShopManager is not available
     */
    basicCollectionFiltering: function(collection) {
        // Get all product cards
        const productCards = document.querySelectorAll('.product-card');
        
        // Simple filtering based on product card data attributes
        productCards.forEach(card => {
            const cardCollection = card.getAttribute('data-collection') || '';
            
            if (cardCollection.toLowerCase() === collection.toLowerCase()) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }
};

// Initialize collection manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.CollectionManager) {
            window.CollectionManager.init();
        }
    });
} else {
    if (window.CollectionManager) {
        window.CollectionManager.init();
    }
}