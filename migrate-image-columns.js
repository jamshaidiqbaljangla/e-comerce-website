const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');

async function migrateImageUrls() {
  try {
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('No database connection string found');
      return;
    }

    const pool = new Pool({
      connectionString: connectionString,
      ssl: process.env.NETLIFY_DATABASE_URL ? { rejectUnauthorized: false } : false,
    });

    console.log('🔄 Running database migration to update image_url columns...');

    // Update image_url columns to TEXT type
    await pool.query('ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT;');
    console.log('✅ Updated categories.image_url to TEXT');

    await pool.query('ALTER TABLE collections ALTER COLUMN image_url TYPE TEXT;');
    console.log('✅ Updated collections.image_url to TEXT');

    await pool.query('ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;');
    console.log('✅ Updated products.image_url to TEXT');

    console.log('🎉 Migration completed successfully!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateImageUrls();
}

module.exports = { migrateImageUrls };
