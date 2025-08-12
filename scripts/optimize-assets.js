const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Function to minify JavaScript by removing comments and extra whitespace
function minifyJS(code) {
  return code
    // Remove comments (simple implementation - not for production)
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')
    // Remove extra whitespace
    .replace(/\s{2,}/g, ' ')
    // Remove whitespace around operators
    .replace(/\s*([=+\-*/%&|^<>!?:;,(){}[\]])\s*/g, '$1')
    // Trim whitespace
    .trim();
}

// Function to minify CSS by removing comments and extra whitespace
function minifyCSS(code) {
  return code
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove extra whitespace
    .replace(/\s{2,}/g, ' ')
    // Remove whitespace around selectors and declarations
    .replace(/\s*([\{\},;:])\s*/g, '$1')
    // Remove whitespace at start and end
    .trim();
}

// Function to process and minify files in a directory
function processFiles(dir, extension, minifyFn) {
  // Check if directory exists before trying to read it
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping.`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      processFiles(filePath, extension, minifyFn);
    } else if (path.extname(file) === extension) {
      // Skip if file is already minified
      if (file.includes('.min')) return;
      
      console.log(`Processing ${filePath}...`);
      
      try {
        // Read the file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Minify content
        const minified = minifyFn(content);
        
        // Create minified file path
        const minFilePath = filePath.replace(extension, `.min${extension}`);
        
        // Write the minified file
        fs.writeFileSync(minFilePath, minified);
        
        // Create gzipped version for pre-compression
        const gzipped = zlib.gzipSync(minified);
        fs.writeFileSync(`${minFilePath}.gz`, gzipped);
        
        console.log(`Created ${minFilePath} (${minified.length} bytes) and ${minFilePath}.gz (${gzipped.length} bytes)`);
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
      }
    }
  });
}

// Main function to optimize the website assets
function optimizeWebsite() {
  // Use parent directory since we're in the scripts folder
  const baseDir = path.join(__dirname, '..');
  
  // Process JS files
  processFiles(path.join(baseDir, 'js'), '.js', minifyJS);
  
  // Process CSS files
  processFiles(path.join(baseDir, 'css'), '.css', minifyCSS);
  
  console.log('Optimization complete!');
}

// Run the optimization
optimizeWebsite();
