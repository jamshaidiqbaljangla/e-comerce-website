const { Pool } = require('pg');

exports.handler = async (event, context) => {
  try {
    const connectionString = process.env.NETLIFY_DATABASE_URL;
    
    if (!connectionString) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No database connection string found' })
      };
    }

    const pool = new Pool({
      connectionString: connectionString,
      ssl: { rejectUnauthorized: false },
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
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Database migration completed successfully' 
      })
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
