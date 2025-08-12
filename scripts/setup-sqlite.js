/**
 * SQLite Database Setup Script - No PostgreSQL Required
 * This creates a local SQLite database perfect for development and deployment
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function setupDatabase() {
  console.log('🚀 Setting up BINGO E-commerce SQLite Database...\n');

  return new Promise((resolve, reject) => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    db.serialize(() => {
      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          sort_order INTEGER DEFAULT 0,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
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
        )
      `);

      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'customer',
          email_verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Blog posts table
      db.run(`
        CREATE TABLE IF NOT EXISTS blog_posts (
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
        )
      `);

      // Admin settings table
      db.run(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT,
          type TEXT DEFAULT 'string',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          user_id INTEGER,
          read BOOLEAN DEFAULT 0,
          data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Site pages table
      db.run(`
        CREATE TABLE IF NOT EXISTS site_pages (
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
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
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
        )
      `);

      // Coupons table
      db.run(`
        CREATE TABLE IF NOT EXISTS coupons (
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
        )
      `);

      console.log('✅ Database tables created');

      // Wait a moment for tables to be created, then insert admin user
      setTimeout(() => {
        const adminEmail = 'admin@bingo.com';
        const adminPassword = 'admin123';
        
        bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
          if (err) {
            console.error('Error hashing password:', err);
            return reject(err);
          }

          db.run(`
            INSERT OR REPLACE INTO users (email, password_hash, first_name, last_name, role, email_verified)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [adminEmail, hashedPassword, 'Admin', 'User', 'admin', 1], function(err) {
            if (err) {
              console.error('Error creating admin user:', err);
              return reject(err);
            }

            console.log('✅ Admin user created');
            console.log(`   Email: ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);

          // Insert initial settings
          const settings = [
            ['site_name', 'BINGO', 'string', 'Website name'],
            ['site_description', 'Premium shopping experience', 'string', 'Website description'],
            ['contact_email', 'contact@bingo.com', 'email', 'Contact email address'],
            ['currency_code', 'USD', 'string', 'Default currency'],
            ['currency_symbol', '$', 'string', 'Currency symbol']
          ];

          let completed = 0;
          settings.forEach(([key, value, type, description]) => {
            db.run(`
              INSERT OR REPLACE INTO admin_settings (key, value, type, description)
              VALUES (?, ?, ?, ?)
            `, [key, value, type, description], () => {
              completed++;
              if (completed === settings.length) {
                console.log('✅ Initial settings created');
                
                // Insert sample blog post
                db.run(`
                  INSERT OR REPLACE INTO blog_posts (title, slug, content, excerpt, status, publish_date, category, featured)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  'Welcome to BINGO',
                  'welcome-to-bingo',
                  '<p>Welcome to BINGO, your premium shopping destination!</p>',
                  'Discover what makes BINGO special.',
                  'published',
                  new Date().toISOString(),
                  'Company News',
                  1
                ], () => {
                  console.log('✅ Sample blog post created');
                  
                  console.log('\n🎉 SQLite Database setup completed successfully!');
                  console.log('\n📝 Next steps:');
                  console.log('1. Your database is ready at: database.sqlite');
                  console.log('2. Run "npm start" to start the server');
                  console.log('3. Access admin panel at: http://localhost:3001/admin.html');
                  console.log('4. Login with: admin@bingo.com / admin123');
                  
                  db.close(() => {
                    resolve();
                  });
                });
              }
            });
          });
        });
      }, 100); // Wait 100ms for tables to be created
    });
  });
}

// Run setup
setupDatabase().catch(err => {
  console.error('❌ Error setting up database:', err);
  process.exit(1);
});
