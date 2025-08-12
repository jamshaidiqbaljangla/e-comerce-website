/**
 * Image Processor Utility
 * Automatically optimizes and creates multiple formats of uploaded images
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/**
 * Process an image to optimize it and create different format versions (WebP, AVIF)
 * 
 * @param {string} filePath - The absolute path to the image file
 * @param {Object} options - Processing options
 * @param {boolean} options.createWebP - Whether to create WebP version (default: true)
 * @param {boolean} options.createAVIF - Whether to create AVIF version (default: true)
 * @param {boolean} options.createResponsive - Whether to create responsive sizes (default: true)
 * @param {Array<number>} options.responsiveSizes - Sizes to create for responsive images (default: [1200, 800, 400])
 * @returns {Promise<Object>} - Information about processed images
 */
async function processImage(filePath, options = {}) {
  const defaults = {
    createWebP: true,
    createAVIF: true,
    createResponsive: true,
    responsiveSizes: [1200, 800, 400],
    quality: 80
  };
  
  const config = { ...defaults, ...options };
  const result = {
    original: filePath,
    formats: {},
    responsive: {}
  };
  
  try {
    // Get image info
    const directory = path.dirname(filePath);
    const filename = path.basename(filePath);
    const extname = path.extname(filename);
    const basename = path.basename(filename, extname);
    
    // Get image metadata to check dimensions
    const metadata = await sharp(filePath).metadata();
    
    // Create WebP version
    if (config.createWebP) {
      const webpPath = path.join(directory, `${basename}.webp`);
      await sharp(filePath)
        .webp({ quality: config.quality })
        .toFile(webpPath);
      result.formats.webp = webpPath;
    }
    
    // Create AVIF version (if supported)
    if (config.createAVIF) {
      try {
        const avifPath = path.join(directory, `${basename}.avif`);
        await sharp(filePath)
          .avif({ quality: config.quality })
          .toFile(avifPath);
        result.formats.avif = avifPath;
      } catch (err) {
        console.log('AVIF format not supported, skipping');
      }
    }
    
    // Create responsive sizes if image is large enough
    if (config.createResponsive) {
      result.responsive.sizes = {};
      
      for (const width of config.responsiveSizes) {
        // Only create smaller sizes, not larger than original
        if (width >= metadata.width) continue;
        
        const responsivePath = path.join(directory, `${basename}-${width}${extname}`);
        await sharp(filePath)
          .resize(width)
          .toFile(responsivePath);
        result.responsive.sizes[width] = responsivePath;
        
        // Also create WebP version of responsive image
        const responsiveWebP = path.join(directory, `${basename}-${width}.webp`);
        await sharp(filePath)
          .resize(width)
          .webp({ quality: config.quality })
          .toFile(responsiveWebP);
        
        if (!result.responsive.webp) result.responsive.webp = {};
        result.responsive.webp[width] = responsiveWebP;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Get HTML markup for a responsive picture element with multiple formats
 * 
 * @param {string} src - Original image source path
 * @param {Object} processedImage - Result from processImage function
 * @param {Object} attributes - Additional attributes for img tag
 * @returns {string} - HTML markup for responsive picture
 */
function getResponsivePictureHtml(src, processedImage, attributes = {}) {
  const defaultAttributes = {
    alt: '',
    class: '',
    loading: 'lazy',
    width: '',
    height: ''
  };
  
  const attrs = { ...defaultAttributes, ...attributes };
  const attrString = Object.entries(attrs)
    .filter(([_, value]) => value !== '')
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  
  let html = '<picture>\n';
  
  // Add AVIF sources if available
  if (processedImage.formats.avif) {
    html += `  <source type="image/avif" srcset="${processedImage.formats.avif}">\n`;
  }
  
  // Add WebP sources if available
  if (processedImage.formats.webp) {
    html += `  <source type="image/webp" srcset="${processedImage.formats.webp}">\n`;
  }
  
  // Add responsive sources if available
  if (processedImage.responsive && processedImage.responsive.sizes) {
    const srcsetEntries = Object.entries(processedImage.responsive.sizes)
      .map(([size, path]) => `${path} ${size}w`);
    
    if (srcsetEntries.length > 0) {
      const srcset = srcsetEntries.join(', ');
      html += `  <source srcset="${srcset}">\n`;
    }
  }
  
  // Add the original image as fallback
  html += `  <img src="${src}" ${attrString}>\n`;
  html += '</picture>';
  
  return html;
}

/**
 * Generate srcset string for responsive images
 * 
 * @param {Object} processedImage - Result from processImage function
 * @param {string} format - Image format (original, webp, avif)
 * @returns {string} - srcset attribute value
 */
function generateSrcset(processedImage, format = 'original') {
  const srcsetEntries = [];
  
  if (format === 'original' && processedImage.responsive.sizes) {
    Object.entries(processedImage.responsive.sizes).forEach(([size, path]) => {
      srcsetEntries.push(`${path} ${size}w`);
    });
    
    // Add original as well
    srcsetEntries.push(`${processedImage.original} ${processedImage.originalWidth || 'original'}w`);
  } else if (format === 'webp' && processedImage.responsive.webp) {
    Object.entries(processedImage.responsive.webp).forEach(([size, path]) => {
      srcsetEntries.push(`${path} ${size}w`);
    });
    
    // Add original webp
    if (processedImage.formats.webp) {
      srcsetEntries.push(`${processedImage.formats.webp} ${processedImage.originalWidth || 'original'}w`);
    }
  }
  
  return srcsetEntries.join(', ');
}

/**
 * Clean up image name to create a safe filename
 * 
 * @param {string} filename - Original filename
 * @returns {string} - Safe filename
 */
function getSafeImageName(filename) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, '-')
    .replace(/-+/g, '-');
}

module.exports = {
  processImage,
  getResponsivePictureHtml,
  generateSrcset,
  getSafeImageName
};
