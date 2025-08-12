// Migration function to add missing fields to categories table
const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
  if (!process.env.NETLIFY_DATABASE_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database URL not configured' })
    };
  }

  const sql = neon(process.env.NETLIFY_DATABASE_URL);
  
  try {
    console.log('Starting categories table migration...');
    
    // Add sort_order column if it doesn't exist
    try {
      await sql`ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;`;
      console.log('✅ Added sort_order column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ sort_order column already exists');
      } else {
        throw error;
      }
    }
    
    // Add is_active column if it doesn't exist
    try {
      await sql`ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT true;`;
      console.log('✅ Added is_active column');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ is_active column already exists');
      } else {
        throw error;
      }
    }
    
    // Update existing categories to have proper sort_order and is_active values
    const existingCategories = await sql`SELECT id, name FROM categories ORDER BY id;`;
    
    for (let i = 0; i < existingCategories.length; i++) {
      const category = existingCategories[i];
      await sql`
        UPDATE categories 
        SET sort_order = ${i + 1}, is_active = true 
        WHERE id = ${category.id};
      `;
      console.log(`✅ Updated category "${category.name}" with sort_order ${i + 1}`);
    }
    
    // Show current categories
    const updatedCategories = await sql`
      SELECT id, name, slug, sort_order, is_active 
      FROM categories 
      ORDER BY sort_order, name;
    `;
    
    console.log('🎉 Categories table migration completed successfully!');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Categories migration completed successfully',
        categories: updatedCategories
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
