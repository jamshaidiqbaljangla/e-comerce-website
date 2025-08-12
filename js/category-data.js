/**
 * BINGO E-commerce Category Data
 * Fetches category information from API
 */

window.CATEGORIES_API = {
  _cache: null,
  _cacheTimestamp: null,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

  _isCacheValid() {
    return this._cacheTimestamp && (Date.now() - this._cacheTimestamp) < this.CACHE_DURATION;
  },

  // Default fallback categories in case API fails
  _defaultCategories: {
    "cat1": { id: "cat1", name: "New Arrivals", slug: "new-arrivals", active: true },
    "cat2": { id: "cat2", name: "Best Sellers", slug: "best-sellers", active: true },
    "cat3": { id: "cat3", name: "Limited Edition", slug: "limited-edition", active: true },
    "cat4": { id: "cat4", name: "Sale Items", slug: "sale-items", active: true },
    
    // Helper methods that would normally be provided by the API
    getActiveCategories() {
      return Object.values(this).filter(item => typeof item === 'object' && item.active);
    }
  },

  async loadCategories() {
    if (this._cache && this._isCacheValid()) {
      return this._cache;
    }

    try {
      // Try to fetch from API
      const categories = await apiRequest('/api/categories');
      if (categories && Object.keys(categories).length > 0) {
        this._cache = categories;
        this._cacheTimestamp = Date.now();
        return categories;
      } else {
        throw new Error('Empty categories response');
      }
    } catch (error) {
      console.warn('Error loading categories from API, using fallback data:', error);
      // Use fallback data if API fails
      this._cache = this._defaultCategories;
      this._cacheTimestamp = Date.now();
      return this._defaultCategories;
    }
  }
};
