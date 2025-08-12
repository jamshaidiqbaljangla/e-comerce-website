/**
 * Database Image Cleanup Script
 * This script will help identify and fix base64 image data in the database
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bingo_ecommerce',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

async function cleanupImageData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for base64 image data...');
    
    // Check product_images table for base64 data
    const base64Images = await client.query(`
      SELECT id, product_id, image_url, image_type 
      FROM product_images 
      WHERE image_url LIKE 'data:image/%'
    `);
    
    console.log(`Found ${base64Images.rows.length} base64 images in database`);
    
    if (base64Images.rows.length > 0) {
      console.log('\n📋 Base64 images found:');
      base64Images.rows.forEach((row, index) => {
        console.log(`${index + 1}. Product ID: ${row.product_id}, Type: ${row.image_type}, URL Length: ${row.image_url.length} chars`);
      });
      
      console.log('\n🔧 Replacing base64 images with placeholder...');
      
      // Replace base64 images with placeholder
      await client.query(`
        UPDATE product_images 
        SET image_url = '/images/placeholder.jpg'
        WHERE image_url LIKE 'data:image/%'
      `);
      
      console.log('✅ Base64 images replaced with placeholder');
    }
    
    // Check for other problematic image URLs
    const problematicImages = await client.query(`
      SELECT id, product_id, image_url, image_type 
      FROM product_images 
      WHERE 
        image_url IS NULL OR 
        image_url = '' OR 
        image_url = 'null' OR 
        image_url = 'undefined' OR
        LENGTH(image_url) > 1000
    `);
    
    console.log(`\nFound ${problematicImages.rows.length} other problematic images`);
    
    if (problematicImages.rows.length > 0) {
      console.log('\n🔧 Fixing problematic image URLs...');
      
      await client.query(`
        UPDATE product_images 
        SET image_url = '/images/placeholder.jpg'
        WHERE 
          image_url IS NULL OR 
          image_url = '' OR 
          image_url = 'null' OR 
          image_url = 'undefined' OR
          LENGTH(image_url) > 1000
      `);
      
      console.log('✅ Problematic image URLs fixed');
    }
    
    // Show final summary
    const finalCount = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN image_url = '/images/placeholder.jpg' THEN 1 END) as placeholders,
             COUNT(CASE WHEN image_url LIKE '/images/%' AND image_url != '/images/placeholder.jpg' THEN 1 END) as valid_images,
             COUNT(CASE WHEN image_url LIKE '/uploads/%' THEN 1 END) as uploaded_images
      FROM product_images
    `);
    
    console.log('\n📊 Final image summary:');
    console.log(`Total images: ${finalCount.rows[0].total}`);
    console.log(`Placeholder images: ${finalCount.rows[0].placeholders}`);
    console.log(`Valid static images: ${finalCount.rows[0].valid_images}`);
    console.log(`Uploaded images: ${finalCount.rows[0].uploaded_images}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupImageData().then(() => {
  console.log('\n🎉 Database image cleanup completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});
