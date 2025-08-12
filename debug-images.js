// Simple test script to check image URLs in the database
// Run this in the browser console to see what's happening with images

async function debugProductImages() {
  console.log('=== DEBUGGING PRODUCT IMAGES ===');
  
  try {
    // Load products from API
    const response = await fetch('/api/products');
    const products = await response.json();
    
    console.log(`Found ${products.length} products`);
    
    products.forEach((product, index) => {
      console.log(`\n--- Product ${index + 1}: ${product.name} ---`);
      console.log('Raw image_url:', product.image_url);
      console.log('Product images array:', product.product_images);
      
      if (product.product_images && product.product_images.length > 0) {
        product.product_images.forEach((img, imgIndex) => {
          console.log(`  Image ${imgIndex + 1}:`, {
            type: img.image_type,
            url: img.image_url,
            urlLength: img.image_url ? img.image_url.length : 0,
            isBase64: img.image_url ? img.image_url.includes('data:image/') : false
          });
        });
      }
      
      // Test if image is accessible
      if (product.image_url) {
        const testImg = new Image();
        testImg.onload = () => console.log(`✅ Image loaded: ${product.name}`);
        testImg.onerror = () => console.log(`❌ Image failed: ${product.name} - ${product.image_url.substring(0, 100)}...`);
        testImg.src = product.image_url;
      }
    });
    
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Run the debug function
debugProductImages();
