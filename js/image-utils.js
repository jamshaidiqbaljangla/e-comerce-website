/**
 * Image Utilities for BINGO E-commerce
 * Handles image URL processing, validation, and fallbacks
 */

window.ImageUtils = {
  
  /**
   * Default placeholder images
   */
  PLACEHOLDER_IMAGES: {
    product: '/images/placeholder.jpg',
    category: '/images/placeholder.jpg',
    user: '/images/placeholder.jpg',
    fallback: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNGOEY5RkEiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjMwIiBmaWxsPSIjREVFMkU2Ii8+PHBhdGggZD0iTTEwMCAxODBMMjAwIDE4ME0xMDAgMjAwTDIwMCAyMDBNMTAwIDIyMEwyMDAgMjIwIiBzdHJva2U9IiNERUUyRTYiIHN0cm9rZS13aWR0aD0iNCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHRleHQgeD0iMTUwIiB5PSIyNjAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzZDNzU3RCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'
  },

  /**
   * Validate and clean image URL
   */
  processImageUrl(imageUrl, type = 'product') {
    // Handle null/undefined/empty
    if (!imageUrl || imageUrl === 'null' || imageUrl === '' || imageUrl === 'undefined') {
      return this.PLACEHOLDER_IMAGES[type] || this.PLACEHOLDER_IMAGES.product;
    }

    // Handle base64 images that are too long (potential performance issue)
    if (imageUrl.includes('data:image/') && imageUrl.length > 500) {
      console.warn('Large base64 image detected, using placeholder instead');
      return this.PLACEHOLDER_IMAGES[type] || this.PLACEHOLDER_IMAGES.product;
    }

    // Handle data URLs properly (short ones are OK)
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Handle absolute URLs
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Handle relative URLs - ensure they start with /
    if (!imageUrl.startsWith('/')) {
      imageUrl = '/' + imageUrl;
    }

    // Clean up double slashes
    imageUrl = imageUrl.replace(/\/+/g, '/');

    return imageUrl;
  },

  /**
   * Create image element with error handling
   */
  createImageElement(src, alt = '', className = '', options = {}) {
    const img = document.createElement('img');
    img.src = this.processImageUrl(src);
    img.alt = alt;
    if (className) img.className = className;
    
    // Add error handling
    img.onerror = () => {
      if (!img.dataset.fallbackAttempted) {
        img.dataset.fallbackAttempted = 'true';
        img.src = this.PLACEHOLDER_IMAGES.product;
      }
    };

    // Add loading attributes for performance
    if (options.lazy !== false) {
      img.loading = 'lazy';
    }

    return img;
  },

  /**
   * Update existing image src with proper error handling
   */
  setImageSrc(imgElement, src, fallbackType = 'product') {
    const processedSrc = this.processImageUrl(src, fallbackType);
    
    imgElement.onerror = () => {
      if (!imgElement.dataset.fallbackAttempted) {
        imgElement.dataset.fallbackAttempted = 'true';
        imgElement.src = this.PLACEHOLDER_IMAGES[fallbackType] || this.PLACEHOLDER_IMAGES.product;
      }
    };

    imgElement.src = processedSrc;
  },

  /**
   * Preload an image and return a promise
   */
  preloadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image: ' + src));
      img.src = this.processImageUrl(src);
    });
  },

  /**
   * Add global error handler for all images on the page
   */
  setupGlobalImageErrorHandling() {
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG' && !e.target.dataset.fallbackAttempted) {
        e.target.dataset.fallbackAttempted = 'true';
        e.target.src = this.PLACEHOLDER_IMAGES.product;
      }
    }, true);
  }
};

// Initialize global error handling when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.ImageUtils.setupGlobalImageErrorHandling();
});
