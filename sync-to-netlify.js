#!/usr/bin/env node

// Script to sync local PostgreSQL data to Netlify database
const { Client } = require('pg');
require('dotenv').config();

async function syncToNetlify() {
  const localClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'jamshaid',
    database: 'postgres',
    ssl: false
  });

  const netlifyClient = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to databases...');
    await localClient.connect();
    await netlifyClient.connect();

    // Get local data
    console.log('📥 Fetching local data...');
    const localCategories = await localClient.query('SELECT * FROM categories ORDER BY id');
    const localProducts = await localClient.query('SELECT * FROM products ORDER BY id');

    console.log(`Found ${localCategories.rows.length} categories and ${localProducts.rows.length} products locally`);

    // Clear Netlify data first
    console.log('🗑️  Clearing Netlify database...');
    await netlifyClient.query('DELETE FROM products');
    await netlifyClient.query('DELETE FROM categories');

    // Insert categories
    console.log('📤 Syncing categories...');
    for (const category of localCategories.rows) {
      await netlifyClient.query(
        'INSERT INTO categories (id, name, slug, description, image_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [category.id, category.name, category.slug, category.description, category.image_url, category.created_at, category.updated_at]
      );
    }

    // Insert products
    console.log('📤 Syncing products...');
    for (const product of localProducts.rows) {
      await netlifyClient.query(
        'INSERT INTO products (id, name, slug, description, price, compare_price, cost_price, sku, barcode, track_quantity, quantity, weight, image_url, images, category_id, is_featured, is_active, meta_title, meta_description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)',
        [product.id, product.name, product.slug, product.description, product.price, product.compare_price, product.cost_price, product.sku, product.barcode, product.track_quantity, product.quantity, product.weight, product.image_url, product.images, product.category_id, product.is_featured, product.is_active, product.meta_title, product.meta_description, product.created_at, product.updated_at]
      );
    }

    console.log('✅ Data sync completed successfully!');
    console.log(`   - Categories synced: ${localCategories.rows.length}`);
    console.log(`   - Products synced: ${localProducts.rows.length}`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  } finally {
    await localClient.end();
    await netlifyClient.end();
  }
}

syncToNetlify();
