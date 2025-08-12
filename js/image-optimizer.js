/**
 * Image Optimization Script
 * This script implements lazy loading and responsive image handling
 */
document.addEventListener('DOMContentLoaded', () => {
    // Implement lazy loading for images
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    // Create IntersectionObserver if supported
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    
                    // If there's a srcset attribute defined in data-srcset, set it too
                    if (img.dataset.srcset) {
                        img.srcset = img.dataset.srcset;
                    }
                    
                    // Once loaded, remove observer and data attributes
                    img.removeAttribute('data-src');
                    img.removeAttribute('data-srcset');
                    imageObserver.unobserve(img);
                }
            });
        });

        // Start observing all lazy images
        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        // Simple timeout to load images after page load
        setTimeout(() => {
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                }
            });
        }, 300);
    }
    
    // Convert any images that don't have explicit width/height
    const allImages = document.querySelectorAll('img:not([width]):not([height])');
    allImages.forEach(img => {
        // Add a load event listener to set dimensions based on natural size
        img.addEventListener('load', () => {
            if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
                img.setAttribute('width', img.naturalWidth);
                img.setAttribute('height', img.naturalHeight);
            }
        });
    });
});

// Add helper function to convert images to WebP format if supported
function supportsWebP() {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
}

// If browser supports WebP, add a class to the body element
if (supportsWebP()) {
    document.documentElement.classList.add('webp');
} else {
    document.documentElement.classList.add('no-webp');
}
