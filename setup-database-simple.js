/**
 * Simple SQLite Database Setup for BINGO E-commerce
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function setupDatabase() {
  console.log('🚀 Setting up BINGO SQLite Database...\n');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'customer',
      email_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      price REAL NOT NULL,
      old_price REAL,
      description TEXT,
      short_description TEXT,
      sku TEXT UNIQUE,
      quantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      featured BOOLEAN DEFAULT 0,
      trending BOOLEAN DEFAULT 0,
      best_seller BOOLEAN DEFAULT 0,
      new_arrival BOOLEAN DEFAULT 0,
      meta_title TEXT,
      meta_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Blog posts table
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      featured_image_url TEXT,
      author_id INTEGER,
      status TEXT DEFAULT 'draft',
      publish_date DATETIME,
      meta_title TEXT,
      meta_description TEXT,
      tags TEXT,
      category TEXT,
      view_count INTEGER DEFAULT 0,
      featured BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )`,

    // Admin settings table
    `CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Notifications table
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER,
      read BOOLEAN DEFAULT 0,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Site pages table
    `CREATE TABLE IF NOT EXISTS site_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      meta_title TEXT,
      meta_description TEXT,
      status TEXT DEFAULT 'draft',
      template TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Orders table
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL,
      shipping_address TEXT,
      billing_address TEXT,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // Coupons table
    `CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'percentage',
      value REAL NOT NULL,
      minimum_amount REAL DEFAULT 0,
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      expires_at DATETIME,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  // Create all tables
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(table, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  console.log('✅ All database tables created');

  // Create admin user
  const adminEmail = 'admin@bingo.com';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO users (email, password_hash, first_name, last_name, role, email_verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [adminEmail, hashedPassword, 'Admin', 'User', 'admin', 1], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('✅ Admin user created');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);

  // Insert initial settings
  const settings = [
    ['site_name', 'BINGO', 'string', 'Website name'],
    ['site_description', 'Premium shopping experience', 'string', 'Website description'],
    ['contact_email', 'contact@bingo.com', 'email', 'Contact email address'],
    ['currency_code', 'USD', 'string', 'Default currency'],
    ['currency_symbol', '$', 'string', 'Currency symbol'],
    ['shipping_rate', '9.99', 'number', 'Default shipping rate'],
    ['free_shipping_threshold', '100.00', 'number', 'Free shipping minimum']
  ];

  for (const [key, value, type, description] of settings) {
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO admin_settings (key, value, type, description)
        VALUES (?, ?, ?, ?)
      `, [key, value, type, description], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  console.log('✅ Initial settings created');

  // Insert sample blog post
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO blog_posts (title, slug, content, excerpt, status, publish_date, category, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'Welcome to BINGO - Premium Shopping Experience',
      'welcome-to-bingo',
      '<p>Welcome to BINGO, where exceptional quality meets timeless design.</p><p>Discover our curated collection of premium products!</p>',
      'Discover what makes BINGO special - premium quality and exceptional customer experience.',
      'published',
      new Date().toISOString(),
      'Company News',
      1
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('✅ Sample blog post created');

  // Insert sample page
  await new Promise((resolve, reject) => {
    db.run(`
      INSERT OR REPLACE INTO site_pages (title, slug, content, meta_title, meta_description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'About Us',
      'about-us',
      '<h1>About BINGO</h1><p>BINGO was founded with a mission to provide exceptional quality products.</p>',
      'About BINGO - Premium Quality Products',
      'Learn about BINGO\'s mission and values',
      'published'
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log('✅ Sample page created');

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('\n🎉 SQLite Database setup completed successfully!');
      console.log('\n📝 Database file created: database.sqlite');
      console.log('📝 Ready for development and deployment!');
      console.log('\n🚀 Next steps:');
      console.log('1. Run "npm start" to start the server');
      console.log('2. Open http://localhost:3001/admin.html');
      console.log('3. Login with: admin@bingo.com / admin123');
    }
  });
}

setupDatabase().catch(err => {
  console.error('❌ Error setting up database:', err);
  process.exit(1);
});
