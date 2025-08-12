/**
 * This script checks and generates optimized image formats
 * It depends on the 'sharp' library - you'll need to install it:
 * npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const imageDir = path.join(__dirname, '..', 'images');
const supportedFormats = ['.jpg', '.jpeg', '.png'];
const targetFormats = ['webp', 'avif']; // Modern formats to generate

// Function to process all images in a directory
async function processImages(directory) {
  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively process subdirectories
        await processImages(filePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        
        // Check if this is a supported image format
        if (supportedFormats.includes(ext)) {
          const filename = path.basename(file, ext);
          
          // Create optimized versions in modern formats
          for (const format of targetFormats) {
            const outputPath = path.join(directory, `${filename}.${format}`);
            
            // Skip if the file already exists
            if (fs.existsSync(outputPath)) {
              console.log(`Skipping existing file: ${outputPath}`);
              continue;
            }
            
            try {
              // Process the image using sharp
              await sharp(filePath)
                .toFormat(format, { 
                  quality: 80, // Adjust quality as needed
                  effort: 6    // Higher effort = better compression but slower
                })
                .toFile(outputPath);
                
              console.log(`Created: ${outputPath}`);
            } catch (err) {
              console.error(`Error processing ${filePath} to ${format}:`, err);
            }
          }
          
          // Also create responsive sizes for large images
          try {
            const metadata = await sharp(filePath).metadata();
            
            // Only resize if the image is larger than threshold
            if (metadata.width > 1200) {
              const sizes = [1200, 800, 400]; // Common responsive sizes
              
              for (const width of sizes) {
                // Skip if smaller than original
                if (width >= metadata.width) continue;
                
                const outputName = `${filename}-${width}${ext}`;
                const outputPath = path.join(directory, outputName);
                
                // Skip if already exists
                if (fs.existsSync(outputPath)) continue;
                
                await sharp(filePath)
                  .resize(width)
                  .toFile(outputPath);
                  
                console.log(`Created responsive image: ${outputPath}`);
                
                // Also create WebP version of the responsive image
                const webpPath = path.join(directory, `${filename}-${width}.webp`);
                
                await sharp(filePath)
                  .resize(width)
                  .toFormat('webp', { quality: 80 })
                  .toFile(webpPath);
                  
                console.log(`Created responsive WebP: ${webpPath}`);
              }
            }
          } catch (err) {
            console.error(`Error creating responsive versions for ${filePath}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${directory}:`, err);
  }
}

// Start processing
console.log('Starting image optimization...');
processImages(imageDir)
  .then(() => {
    console.log('Image optimization complete!');
  })
  .catch(err => {
    console.error('Failed to optimize images:', err);
  });
