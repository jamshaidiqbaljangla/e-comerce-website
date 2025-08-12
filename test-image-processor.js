/**
 * Test script for image processor utility
 * 
 * Usage: node test-image-processor.js [path-to-image]
 */

const path = require('path');
const fs = require('fs');
const imageProcessor = require('./utils/image-processor');

// Get image path from command line or use default
const imagePath = process.argv[2] || 'images/product-1.jpg';
const absolutePath = path.resolve(__dirname, imagePath);

// Verify file exists
if (!fs.existsSync(absolutePath)) {
  console.error(`Error: File not found at ${absolutePath}`);
  console.log('Usage: node test-image-processor.js [path-to-image]');
  process.exit(1);
}

console.log(`\n🔍 Testing image processor with: ${imagePath}`);
console.log('---------------------------------------------');

// Process the image
async function testImageProcessor() {
  try {
    console.log('⏳ Processing image...');
    
    const result = await imageProcessor.processImage(absolutePath, {
      createWebP: true,
      createAVIF: true,
      createResponsive: true,
      responsiveSizes: [1200, 800, 400],
      quality: 80
    });
    
    console.log('\n✅ Image processing complete!');
    console.log('---------------------------------------------');
    
    // Show original image info
    const originalStats = fs.statSync(absolutePath);
    console.log(`📊 ORIGINAL: ${path.basename(absolutePath)}`);
    console.log(`   Size: ${formatBytes(originalStats.size)}`);
    
    // Show WebP info
    if (result.formats.webp) {
      const webpStats = fs.statSync(result.formats.webp);
      const savings = 100 - Math.round((webpStats.size / originalStats.size) * 100);
      console.log(`\n📊 WEBP: ${path.basename(result.formats.webp)}`);
      console.log(`   Size: ${formatBytes(webpStats.size)} (${savings}% smaller)`);
    }
    
    // Show AVIF info
    if (result.formats.avif) {
      const avifStats = fs.statSync(result.formats.avif);
      const savings = 100 - Math.round((avifStats.size / originalStats.size) * 100);
      console.log(`\n📊 AVIF: ${path.basename(result.formats.avif)}`);
      console.log(`   Size: ${formatBytes(avifStats.size)} (${savings}% smaller)`);
    }
    
    // Show responsive sizes
    if (result.responsive && result.responsive.sizes) {
      console.log('\n📊 RESPONSIVE SIZES:');
      Object.entries(result.responsive.sizes).forEach(([size, filepath]) => {
        const stats = fs.statSync(filepath);
        console.log(`   ${size}px: ${formatBytes(stats.size)} - ${path.basename(filepath)}`);
      });
    }
    
    console.log('\n🖼️ All image variants created successfully!');
    
    // Generate sample HTML
    const sampleHtml = imageProcessor.getResponsivePictureHtml(
      absolutePath,
      result,
      { alt: 'Sample optimized image', class: 'product-image' }
    );
    
    console.log('\n📝 SAMPLE HTML FOR RESPONSIVE IMAGE:');
    console.log('---------------------------------------------');
    console.log(sampleHtml);
    console.log('---------------------------------------------');
    
  } catch (error) {
    console.error('❌ Error processing image:', error);
  }
}

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Run the test
testImageProcessor();
