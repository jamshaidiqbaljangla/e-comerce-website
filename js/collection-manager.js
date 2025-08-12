// js/collection-manager.js

async function getCollections() {
    try {
        const response = await fetch(`${window.location.origin}/api/collections`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching collections:", error);
        return [];
    }
}

const COLLECTIONS_API = {
    collections: [],
    
    async loadCollections() {
        debugLog.log('collections', 'Loading collections...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/collections`);
            if (!response.ok) {
                throw new Error(`Failed to fetch collections: ${response.statusText}`);
            }
            this.collections = await response.json();
            debugLog.log('collections', 'Collections loaded successfully', this.collections);
            return this.collections;
        } catch (error) {
            debugLog.warn('collections', 'API unavailable, using fallback collections:', error.message);
            // Use fallback collections when API is unavailable
            this.collections = window.PRODUCTS ? window.PRODUCTS.getFallbackCollections() : [
                { id: 1, name: "Summer 2025", slug: "summer-2025", description: "Summer essentials" },
                { id: 2, name: "Best Sellers", slug: "bestsellers", description: "Most popular items" },
                { id: 3, name: "New Arrivals", slug: "new-arrivals", description: "Latest products" }
            ];
            console.log('[DEBUG] collection-manager.js: Fallback collections loaded', this.collections);
            return this.collections;
        }
    },

    getCollectionById(id) {
        return this.collections.find(collection => collection.id === id);
    },

    getAllCollections() {
        return this.collections;
    }
};

// Expose the API to the global window object
window.COLLECTIONS_API = COLLECTIONS_API;
