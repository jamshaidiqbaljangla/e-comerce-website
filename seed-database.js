const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const fs = require('fs');

// Simple database seeding script
async function seedDatabase() {
  let pool;
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Use Netlify database URL or local PostgreSQL
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.log('❌ No database connection string found');
      return;
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    // Create tables if they don't exist
    console.log('📋 Creating tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(500),
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        cost_price DECIMAL(10,2),
        sku VARCHAR(100),
        barcode VARCHAR(100),
        track_quantity BOOLEAN DEFAULT TRUE,
        quantity INTEGER DEFAULT 0,
        weight DECIMAL(8,2),
        image_url VARCHAR(500),
        images TEXT,
        category_id INTEGER REFERENCES categories(id),
        is_featured BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        meta_title VARCHAR(255),
        meta_description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Check if we already have data
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    const categoriesCount = parseInt(categoriesResult.rows[0].count);
    
    if (categoriesCount === 0) {
      console.log('📦 Seeding categories...');
      await client.query(`
        INSERT INTO categories (name, slug, description) VALUES
        ('Electronics', 'electronics', 'Latest electronic gadgets and devices'),
        ('Clothing', 'clothing', 'Fashion and apparel for all seasons'),
        ('Home & Garden', 'home-garden', 'Home improvement and garden essentials'),
        ('Sports & Outdoors', 'sports-outdoors', 'Sports equipment and outdoor gear'),
        ('Books & Media', 'books-media', 'Books, movies, and educational content')
      `);
      
      console.log('📚 Seeding collections...');
      await client.query(`
        INSERT INTO collections (name, slug, description, is_featured) VALUES
        ('Summer Collection 2025', 'summer-2025', 'Hot trends for summer season', TRUE),
        ('Winter Collection 2025', 'winter-2025', 'Cozy essentials for winter', TRUE),
        ('New Arrivals', 'new-arrivals', 'Latest products just added', FALSE),
        ('Best Sellers', 'best-sellers', 'Most popular products', TRUE)
      `);
      
      console.log('🛍️ Seeding products...');
      await client.query(`
        INSERT INTO products (name, slug, description, price, compare_price, category_id, is_featured, quantity, sku, image_url) VALUES
        ('iPhone 15 Pro', 'iphone-15-pro', 'Latest iPhone with titanium design and A17 Pro chip', 999.99, 1099.99, 1, TRUE, 50, 'IPH15PRO-128', '/images/products/iphone-15-pro.jpg'),
        ('Premium Cotton T-Shirt', 'premium-cotton-tshirt', 'High-quality 100% organic cotton t-shirt', 29.99, 39.99, 2, FALSE, 100, 'TSHIRT-ORG-L', '/images/products/cotton-tshirt.jpg'),
        ('Smart Garden Kit', 'smart-garden-kit', 'Automated indoor garden with LED grow lights', 149.99, NULL, 3, TRUE, 25, 'GARDEN-SMART-01', '/images/products/smart-garden.jpg'),
        ('Wireless Bluetooth Headphones', 'wireless-bluetooth-headphones', 'Noise-cancelling over-ear headphones with 30h battery', 199.99, 249.99, 1, TRUE, 75, 'HEADPH-BT-001', '/images/products/bluetooth-headphones.jpg'),
        ('Running Shoes', 'running-shoes', 'Lightweight running shoes with cushioned sole', 89.99, 119.99, 4, FALSE, 60, 'SHOES-RUN-42', '/images/products/running-shoes.jpg')
      `);
      
      console.log('✅ Database seeded successfully!');
    } else {
      console.log('📊 Database already has data, skipping seeding');
    }
    
    // Verify data
    const categoriesResultFinal = await client.query('SELECT * FROM categories LIMIT 5');
    const productsResultFinal = await client.query('SELECT * FROM products LIMIT 5');
    
    console.log(`📈 Categories in database: ${categoriesResultFinal.rows.length}`);
    console.log(`📈 Products in database: ${productsResultFinal.rows.length}`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

seedDatabase();
