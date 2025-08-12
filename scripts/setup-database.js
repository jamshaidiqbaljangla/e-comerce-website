/**
 * Database Setup Script
 * Run this to create the database and initial admin user
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function setupDatabase() {
  console.log('🚀 Setting up BINGO E-commerce Database...\n');

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Create tables
    console.log('📋 Creating database tables...');
    
    // Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        sort_order INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created');

    // Products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        old_price DECIMAL(10,2),
        cost_price DECIMAL(10,2),
        description TEXT,
        short_description TEXT,
        in_stock BOOLEAN DEFAULT true,
        rating DECIMAL(2,1) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        trending BOOLEAN DEFAULT false,
        new_arrival BOOLEAN DEFAULT false,
        best_seller BOOLEAN DEFAULT false,
        featured BOOLEAN DEFAULT false,
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 5,
        track_inventory BOOLEAN DEFAULT true,
        allow_backorder BOOLEAN DEFAULT false,
        weight DECIMAL(8,2),
        dimensions VARCHAR(100),
        meta_title VARCHAR(255),
        meta_description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');

    // Product categories junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        category_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      )
    `);
    console.log('✅ Product categories junction table created');

    // Product images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        image_type VARCHAR(20) DEFAULT 'gallery',
        alt_text VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Product images table created');

    // Product colors/variants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_colors (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        color_name VARCHAR(50) NOT NULL,
        color_code VARCHAR(7) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Product colors table created');

    // Product variants table (for size, material, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        variant_name VARCHAR(100) NOT NULL,
        variant_value VARCHAR(100) NOT NULL,
        price_modifier DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        sku VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Product variants table created');

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        date_of_birth DATE,
        role VARCHAR(20) DEFAULT 'customer',
        email_verified BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created');

    // User addresses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'shipping',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(100),
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ User addresses table created');

    // Cart items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, variant_id)
      )
    `);
    console.log('✅ Cart items table created');

    // Wishlist items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      )
    `);
    console.log('✅ Wishlist items table created');

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        shipping_address JSONB,
        billing_address JSONB,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Orders table created');

    // Order items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Order items table created');

    // Reviews table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        review_text TEXT,
        verified_purchase BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Product reviews table created');

    // Coupons table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL, -- 'percentage' or 'fixed'
        value DECIMAL(10,2) NOT NULL,
        minimum_amount DECIMAL(10,2),
        maximum_discount DECIMAL(10,2),
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Coupons table created');

    // Blog posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        featured_image_url VARCHAR(500),
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'draft',
        publish_date TIMESTAMP,
        meta_title VARCHAR(255),
        meta_description TEXT,
        tags TEXT[],
        category VARCHAR(100),
        view_count INTEGER DEFAULT 0,
        featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Blog posts table created');

    // Blog comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        author_name VARCHAR(100) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Blog comments table created');

    // Admin settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Admin settings table created');

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        read BOOLEAN DEFAULT false,
        data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table created');

    // Site pages table  
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_pages (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        meta_title VARCHAR(255),
        meta_description TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        template VARCHAR(100) DEFAULT 'default',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Site pages table created');

    console.log('\n📦 Inserting initial data...');

    // Insert categories
    const categories = [
      { id: 'premium', name: 'Premium', description: 'High-end premium products' },
      { id: 'lifestyle', name: 'Lifestyle', description: 'Modern lifestyle products' },
      { id: 'limited', name: 'Limited Edition', description: 'Exclusive limited edition items' },
      { id: 'collection', name: 'Signature Collection', description: 'Our signature collection items' },
      { id: 'new-season', name: 'New Season', description: 'Latest seasonal arrivals' },
      { id: 'essentials', name: 'Essentials', description: 'Everyday essential items' },
      { id: 'trending', name: 'Trending', description: 'Currently trending products' }
    ];

    for (const category of categories) {
      await pool.query(
        'INSERT INTO categories (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3',
        [category.id, category.name, category.description]
      );
    }
    console.log('✅ Categories inserted');

    // Insert sample products
    const products = [
      {
        id: 'product-1',
        name: 'Signature Collection Item',
        slug: 'signature-collection-item',
        price: 199.00,
        old_price: 249.00,
        description: 'Our flagship product from the signature collection, featuring premium materials and exceptional craftsmanship. This item represents the pinnacle of our design philosophy and attention to detail.',
        short_description: 'Premium flagship product with exceptional craftsmanship',
        categories: ['premium', 'collection'],
        in_stock: true,
        rating: 4.5,
        review_count: 42,
        trending: true,
        best_seller: true,
        sku: 'BINGO-001',
        quantity: 24,
        images: [
          { url: 'images/product-1.jpg', type: 'primary', sort: 0 },
          { url: 'images/product-1-hover.jpg', type: 'hover', sort: 1 },
          { url: 'images/product-1-alt-1.jpg', type: 'gallery', sort: 2 },
          { url: 'images/product-1-alt-2.jpg', type: 'gallery', sort: 3 }
        ],
        colors: [
          { name: 'Black', code: '#222222' },
          { name: 'Navy Blue', code: '#6e8cd5' },
          { name: 'Crimson Red', code: '#f56060' }
        ]
      },
      {
        id: 'product-2',
        name: 'Modern Minimalist Piece',
        slug: 'modern-minimalist-piece',
        price: 179.00,
        description: 'Clean lines and minimalist design make this a perfect addition to any modern space. Crafted with sustainability in mind using eco-friendly materials.',
        short_description: 'Clean, minimalist design for modern spaces',
        categories: ['lifestyle', 'essentials'],
        in_stock: true,
        rating: 5.0,
        review_count: 28,
        trending: true,
        best_seller: true,
        sku: 'BINGO-002',
        quantity: 18,
        images: [
          { url: 'images/product-2.jpg', type: 'primary', sort: 0 },
          { url: 'images/product-2-hover.jpg', type: 'hover', sort: 1 },
          { url: 'images/product-2-alt-1.jpg', type: 'gallery', sort: 2 }
        ],
        colors: [
          { name: 'Midnight Black', code: '#222222' },
          { name: 'Pure White', code: '#f5f5f5' }
        ]
      },
      {
        id: 'product-3',
        name: 'Exclusive Designer Item',
        slug: 'exclusive-designer-item',
        price: 299.00,
        description: 'A limited edition piece created by our award-winning design team. Each item is numbered and comes with a certificate of authenticity.',
        short_description: 'Limited edition designer piece with authentication',
        categories: ['limited', 'premium'],
        in_stock: false,
        rating: 4.0,
        review_count: 16,
        trending: true,
        sku: 'BINGO-003',
        quantity: 0,
        images: [
          { url: 'images/product-3.jpg', type: 'primary', sort: 0 },
          { url: 'images/product-3-hover.jpg', type: 'hover', sort: 1 },
          { url: 'images/product-3-alt-1.jpg', type: 'gallery', sort: 2 }
        ],
        colors: [
          { name: 'Antique Gold', code: '#d4af37' },
          { name: 'Ocean Blue', code: '#6e8cd5' }
        ]
      },
      {
        id: 'product-4',
        name: 'Premium Collector\'s Edition',
        slug: 'premium-collectors-edition',
        price: 349.00,
        description: 'A highly sought-after collector\'s item, featuring rare materials and unique design elements. Perfect for collectors and enthusiasts.',
        short_description: 'Rare collector\'s item with unique design',
        categories: ['collection', 'limited'],
        in_stock: true,
        rating: 4.5,
        review_count: 23,
        trending: true,
        sku: 'BINGO-004',
        quantity: 5,
        images: [
          { url: 'images/product-4.jpg', type: 'primary', sort: 0 },
          { url: 'images/product-4-hover.jpg', type: 'hover', sort: 1 },
          { url: 'images/product-4-alt-1.jpg', type: 'gallery', sort: 2 }
        ],
        colors: [
          { name: 'Matte Black', code: '#222222' }
        ]
      }
    ];

    for (const product of products) {
      // Insert product
      await pool.query(`
        INSERT INTO products (
          id, name, slug, price, old_price, description, short_description, in_stock, 
          rating, review_count, trending, new_arrival, best_seller, sku, quantity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = $2, slug = $3, price = $4, old_price = $5, description = $6,
          short_description = $7, in_stock = $8, rating = $9, review_count = $10,
          trending = $11, new_arrival = $12, best_seller = $13, sku = $14, quantity = $15
      `, [
        product.id, product.name, product.slug, product.price, product.old_price,
        product.description, product.short_description, product.in_stock, product.rating,
        product.review_count, product.trending, product.new_arrival || false,
        product.best_seller || false, product.sku, product.quantity
      ]);

      // Insert product categories
      await pool.query('DELETE FROM product_categories WHERE product_id = $1', [product.id]);
      for (const categoryId of product.categories) {
        await pool.query(
          'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
          [product.id, categoryId]
        );
      }

      // Insert product images
      await pool.query('DELETE FROM product_images WHERE product_id = $1', [product.id]);
      for (const image of product.images) {
        await pool.query(
          'INSERT INTO product_images (product_id, image_url, image_type, sort_order) VALUES ($1, $2, $3, $4)',
          [product.id, image.url, image.type, image.sort]
        );
      }

      // Insert product colors
      await pool.query('DELETE FROM product_colors WHERE product_id = $1', [product.id]);
      for (const color of product.colors) {
        await pool.query(
          'INSERT INTO product_colors (product_id, color_name, color_code) VALUES ($1, $2, $3)',
          [product.id, color.name, color.code]
        );
      }
    }
    console.log('✅ Sample products inserted');

    // Insert initial blog posts
    const blogPosts = [
      {
        title: 'Welcome to BINGO - A New Era of Premium Shopping',
        slug: 'welcome-to-bingo-premium-shopping',
        content: `<p>Welcome to BINGO, where exceptional quality meets timeless design. We're thrilled to introduce you to our carefully curated collection of premium products.</p>
        
<p>At BINGO, we believe that every purchase should be an experience. Our team travels the world to source the finest materials and work with skilled artisans to bring you products that combine functionality with elegance.</p>

<h3>What Makes BINGO Special?</h3>
<ul>
<li><strong>Quality First:</strong> Every product undergoes rigorous quality checks</li>
<li><strong>Sustainable Practices:</strong> We're committed to environmentally responsible sourcing</li>
<li><strong>Customer Experience:</strong> Your satisfaction is our top priority</li>
<li><strong>Innovation:</strong> Constantly evolving to meet your needs</li>
</ul>

<p>Explore our collections and discover what makes BINGO the choice for discerning customers worldwide.</p>`,
        excerpt: 'Discover what makes BINGO special - premium quality, sustainable practices, and exceptional customer experience.',
        featured_image_url: 'images/blog/welcome-bingo.jpg',
        status: 'published',
        publish_date: new Date(),
        category: 'Company News',
        featured: true,
        tags: ['welcome', 'premium', 'quality', 'sustainability']
      },
      {
        title: 'Spring Collection 2025: Fresh Designs for a New Season',
        slug: 'spring-collection-2025-fresh-designs',
        content: `<p>Spring is here, and with it comes our exciting new collection featuring fresh designs, vibrant colors, and innovative materials.</p>
        
<p>This season's collection draws inspiration from nature's renewal, incorporating organic shapes, sustainable materials, and colors that reflect the beauty of spring.</p>

<h3>Highlights of the Spring 2025 Collection:</h3>
<ul>
<li>New eco-friendly materials</li>
<li>Vibrant spring color palette</li>
<li>Limited edition designer pieces</li>
<li>Exclusive collaborations</li>
</ul>

<p>Don't miss out on these exclusive pieces - shop the Spring 2025 collection now!</p>`,
        excerpt: 'Explore our Spring 2025 collection featuring fresh designs, eco-friendly materials, and vibrant colors.',
        featured_image_url: 'images/blog/spring-collection-2025.jpg',
        status: 'published',
        publish_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        category: 'Collections',
        featured: false,
        tags: ['spring', '2025', 'collection', 'eco-friendly', 'design']
      }
    ];

    for (const post of blogPosts) {
      await pool.query(`
        INSERT INTO blog_posts (title, slug, content, excerpt, featured_image_url, status, publish_date, category, featured, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        post.title,
        post.slug,
        post.content,
        post.excerpt,
        post.featured_image_url,
        post.status,
        post.publish_date,
        post.category,
        post.featured,
        post.tags
      ]);
    }
    console.log('✅ Sample blog posts inserted');

    // Insert initial admin settings
    const adminSettings = [
      { key: 'site_name', value: 'BINGO', type: 'string', description: 'Website name' },
      { key: 'site_description', value: 'Premium shopping experience', type: 'string', description: 'Website description' },
      { key: 'contact_email', value: 'contact@bingo.com', type: 'email', description: 'Contact email address' },
      { key: 'contact_phone', value: '+1 (555) 123-4567', type: 'string', description: 'Contact phone number' },
      { key: 'currency_code', value: 'USD', type: 'string', description: 'Default currency' },
      { key: 'currency_symbol', value: '$', type: 'string', description: 'Currency symbol' },
      { key: 'tax_rate', value: '8.5', type: 'number', description: 'Default tax rate percentage' },
      { key: 'shipping_rate', value: '9.99', type: 'number', description: 'Default shipping rate' },
      { key: 'free_shipping_threshold', value: '100.00', type: 'number', description: 'Free shipping minimum order amount' },
      { key: 'order_notification_email', value: 'orders@bingo.com', type: 'email', description: 'Email for order notifications' },
      { key: 'blog_posts_per_page', value: '10', type: 'number', description: 'Number of blog posts per page' },
      { key: 'enable_blog_comments', value: 'true', type: 'boolean', description: 'Enable blog comments' },
      { key: 'google_analytics_id', value: '', type: 'string', description: 'Google Analytics tracking ID' },
      { key: 'facebook_url', value: '', type: 'string', description: 'Facebook page URL' },
      { key: 'instagram_url', value: '', type: 'string', description: 'Instagram profile URL' },
      { key: 'twitter_url', value: '', type: 'string', description: 'Twitter profile URL' }
    ];

    for (const setting of adminSettings) {
      await pool.query(`
        INSERT INTO admin_settings (key, value, type, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO UPDATE SET
          value = $2, type = $3, description = $4, updated_at = CURRENT_TIMESTAMP
      `, [setting.key, setting.value, setting.type, setting.description]);
    }
    console.log('✅ Admin settings inserted');

    // Insert sample site pages
    const sitePages = [
      {
        title: 'About Us',
        slug: 'about-us',
        content: `<h1>About BINGO</h1>
<p>BINGO was founded with a simple mission: to provide exceptional quality products with unmatched customer service.</p>
<p>Our journey began in 2020 when our founders recognized a gap in the market for truly premium products that combine style, functionality, and sustainability.</p>
<h2>Our Values</h2>
<ul>
<li>Quality craftsmanship</li>
<li>Sustainable practices</li>
<li>Customer satisfaction</li>
<li>Innovation</li>
</ul>`,
        meta_title: 'About BINGO - Premium Quality Products',
        meta_description: 'Learn about BINGO\'s mission to provide exceptional quality products with sustainable practices and unmatched customer service.',
        status: 'published'
      },
      {
        title: 'Privacy Policy',
        slug: 'privacy-policy',
        content: `<h1>Privacy Policy</h1>
<p>Last updated: ${new Date().toLocaleDateString()}</p>
<p>This Privacy Policy describes how BINGO collects, uses, and protects your information when you use our website.</p>
<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us.</p>
<h2>How We Use Your Information</h2>
<p>We use the information we collect to provide, maintain, and improve our services.</p>`,
        meta_title: 'Privacy Policy - BINGO',
        meta_description: 'Read BINGO\'s privacy policy to understand how we collect, use, and protect your personal information.',
        status: 'published'
      }
    ];

    for (const page of sitePages) {
      await pool.query(`
        INSERT INTO site_pages (title, slug, content, meta_title, meta_description, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (slug) DO UPDATE SET
          title = $1, content = $3, meta_title = $4, meta_description = $5, status = $6, updated_at = CURRENT_TIMESTAMP
      `, [page.title, page.slug, page.content, page.meta_title, page.meta_description, page.status]);
    }
    console.log('✅ Sample site pages inserted');

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bingo.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = $2, role = $5, email_verified = $6
    `, [adminEmail, hashedPassword, 'Admin', 'User', 'admin', true]);

    console.log('✅ Admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);

    // Create indexes for better performance
    console.log('\n🚀 Creating database indexes...');
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_trending ON products(trending)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_bestseller ON products(best_seller)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector(\'english\', name))');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    
    console.log('✅ Database indexes created');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Update your .env file with the correct database credentials');
    console.log('2. Run "npm start" to start the server');
    console.log('3. Open http://localhost:3000 in your browser');
    console.log('4. Login to admin panel with the credentials above');
    console.log('\n🛠️  Your BINGO e-commerce platform is ready to use!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase();