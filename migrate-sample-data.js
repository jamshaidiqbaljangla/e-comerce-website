/**
 * Database Migration: Add Sample Categories and Products
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function addSampleData() {
  console.log('🔄 Adding sample categories and products...\n');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  return new Promise((resolve, reject) => {
    // Sample categories
    const sampleCategories = [
      {
        id: 'cat1',
        name: 'Electronics',
        description: 'Latest electronic gadgets and devices',
        sort_order: 1
      },
      {
        id: 'cat2',
        name: 'Fashion',
        description: 'Trendy clothing and accessories',
        sort_order: 2
      },
      {
        id: 'cat3',
        name: 'Home & Garden',
        description: 'Everything for your home and garden',
        sort_order: 3
      },
      {
        id: 'cat4',
        name: 'Sports & Outdoors',
        description: 'Sports equipment and outdoor gear',
        sort_order: 4
      }
    ];

    // Sample products
    const sampleProducts = [
      {
        id: 'prod1',
        name: 'Smartphone Pro',
        description: 'Latest flagship smartphone with amazing features',
        price: 999.99,
        sale_price: 799.99,
        sku: 'SPH-001',
        category_id: 'cat1',
        in_stock: true,
        stock_quantity: 50
      },
      {
        id: 'prod2',
        name: 'Designer T-Shirt',
        description: 'Premium cotton t-shirt with unique design',
        price: 49.99,
        sale_price: 39.99,
        sku: 'TSH-001',
        category_id: 'cat2',
        in_stock: true,
        stock_quantity: 100
      },
      {
        id: 'prod3',
        name: 'Coffee Maker',
        description: 'Automatic coffee maker for perfect coffee every time',
        price: 149.99,
        sku: 'CFM-001',
        category_id: 'cat3',
        in_stock: true,
        stock_quantity: 25
      },
      {
        id: 'prod4',
        name: 'Running Shoes',
        description: 'Professional running shoes for athletes',
        price: 129.99,
        sale_price: 99.99,
        sku: 'RNS-001',
        category_id: 'cat4',
        in_stock: true,
        stock_quantity: 75
      }
    ];

    const insertCategory = `
      INSERT OR IGNORE INTO categories (id, name, description, sort_order, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `;

    const insertProduct = `
      INSERT OR IGNORE INTO products (
        id, name, description, price, old_price, sku, 
        quantity, status, featured, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, datetime('now'), datetime('now'))
    `;

    let completed = 0;
    const totalOperations = sampleCategories.length + sampleProducts.length;

    // Insert categories
    sampleCategories.forEach((category) => {
      db.run(insertCategory, [
        category.id,
        category.name,
        category.description,
        category.sort_order
      ], (err) => {
        if (err) {
          console.error(`❌ Error inserting category ${category.name}:`, err);
        } else {
          console.log(`✅ Inserted category: ${category.name}`);
        }
        
        completed++;
        if (completed === totalOperations) {
          finish();
        }
      });
    });

    // Insert products
    sampleProducts.forEach((product) => {
      db.run(insertProduct, [
        product.id,
        product.name,
        product.description,
        product.price,
        product.sale_price || null,
        product.sku,
        product.stock_quantity
      ], (err) => {
        if (err) {
          console.error(`❌ Error inserting product ${product.name}:`, err);
        } else {
          console.log(`✅ Inserted product: ${product.name}`);
        }
        
        completed++;
        if (completed === totalOperations) {
          finish();
        }
      });
    });

    function finish() {
      console.log('\n🎉 Sample data migration completed!');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          resolve();
        }
      });
    }
  });
}

// Run the migration
addSampleData().catch(console.error);
