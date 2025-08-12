const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3002;
const IS_NETLIFY = process.env.NETLIFY === 'true';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in production environment.');
}

// Database connection - Try PostgreSQL first, fallback to static data
let db = null;
let dbConnected = false;

// Initialize database connection
async function initDatabase() {
  try {
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (connectionString) {
const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('./database/schema.ts');
      
      const pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NETLIFY_DATABASE_URL ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      db = drizzle(pool, { schema });
      dbConnected = true;
      console.log('✅ Connected to PostgreSQL database');
    } else {
      console.log('⚠️  No database URL found, using fallback data');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('📦 Using fallback data mode');
    dbConnected = false;
  }
}

// Initialize database
initDatabase();

// Fallback data for when database is not available
const fallbackData = {
  categories: [
    { id: 1, name: 'Electronics', slug: 'electronics', description: 'Latest electronic gadgets', created_at: new Date() },
    { id: 2, name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel', created_at: new Date() },
    { id: 3, name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement items', created_at: new Date() },
    { id: 4, name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear', created_at: new Date() }
  ],
  collections: [
    { id: 1, name: 'Summer Collection 2025', slug: 'summer-2025', description: 'Hot trends for summer season', is_featured: true, created_at: new Date() },
    { id: 2, name: 'Winter Collection 2025', slug: 'winter-2025', description: 'Cozy essentials for winter', is_featured: true, created_at: new Date() },
    { id: 3, name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest products just added', is_featured: false, created_at: new Date() }
  ],
  products: [
    { 
      id: 1, 
      name: 'iPhone 15 Pro', 
      slug: 'iphone-15-pro',
      price: '999.99', 
      compare_price: '1099.99',
      category_id: 1, 
      description: 'Latest iPhone with titanium design and A17 Pro chip', 
      image_url: '/images/products/iphone-15-pro.jpg',
      is_featured: true,
      quantity: 50,
      sku: 'IPH15PRO-128',
      created_at: new Date()
    },
    { 
      id: 2, 
      name: 'Premium Cotton T-Shirt', 
      slug: 'premium-cotton-tshirt',
      price: '29.99', 
      compare_price: '39.99',
      category_id: 2, 
      description: 'High-quality 100% organic cotton t-shirt', 
      image_url: '/images/products/cotton-tshirt.jpg',
      is_featured: false,
      quantity: 100,
      sku: 'TSHIRT-ORG-L',
      created_at: new Date()
    },
    { 
      id: 3, 
      name: 'Smart Garden Kit', 
      slug: 'smart-garden-kit',
      price: '149.99', 
      category_id: 3, 
      description: 'Automated indoor garden with LED grow lights', 
      image_url: '/images/products/smart-garden.jpg',
      is_featured: true,
      quantity: 25,
      sku: 'GARDEN-SMART-01',
      created_at: new Date()
    },
    { 
      id: 4, 
      name: 'Wireless Bluetooth Headphones', 
      slug: 'wireless-bluetooth-headphones',
      price: '199.99', 
      compare_price: '249.99',
      category_id: 1, 
      description: 'Noise-cancelling over-ear headphones with 30h battery', 
      image_url: '/images/products/bluetooth-headphones.jpg',
      is_featured: true,
      quantity: 75,
      sku: 'HEADPH-BT-001',
      created_at: new Date()
    }
  ]
};

// Middleware
if (IS_NETLIFY || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"]
    }
  }
}));

app.use(compression());

app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      'https://ubiquitous-meringue-b2611a.netlify.app',
      'https://68972cd53f756d7b6a713fd5--ubiquitous-meringue-b2611a.netlify.app',
      'https://6897282650d587b75fe1493e--ubiquitous-meringue-b2611a.netlify.app',
      'https://gopingo.store'
    ];
    // Allow any Netlify deploy URL
    if (!origin || allowedOrigins.includes(origin) || (origin && origin.includes('netlify.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Static file serving
app.use(express.static('.', {
  maxAge: IS_NETLIFY ? '1d' : '1h'
}));

// Handle preflight requests
app.options('*', cors());

// API Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working with Netlify PostgreSQL!',
    environment: IS_NETLIFY ? 'netlify' : 'local',
    database: dbConnected ? 'postgresql' : 'fallback',
    database_url: process.env.NETLIFY_DATABASE_URL ? 'configured' : 'not_found',
    timestamp: new Date().toISOString()
  });
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    let categories;
    if (dbConnected && db) {
      // Import schema here to avoid initial import issues
      const { categories: categoriesTable } = require('./database/schema');
      const result = await db.select().from(categoriesTable);
      categories = result;
    } else {
      categories = fallbackData.categories;
    }
    
    res.json({
      success: true,
      data: categories,
      source: dbConnected ? 'postgresql' : 'fallback'
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.json({
      success: true,
      data: fallbackData.categories,
      source: 'fallback',
      note: 'Using fallback data due to database error'
    });
  }
});

// Collections endpoint
app.get('/api/collections', async (req, res) => {
  try {
    let collections;
    if (dbConnected && db) {
      const { collections: collectionsTable } = require('./database/schema');
      const result = await db.select().from(collectionsTable);
      collections = result;
    } else {
      collections = fallbackData.collections;
    }
    
    res.json({
      success: true,
      data: collections,
      source: dbConnected ? 'postgresql' : 'fallback'
    });
  } catch (error) {
    console.error('Collections error:', error);
    res.json({
      success: true,
      data: fallbackData.collections,
      source: 'fallback',
      note: 'Using fallback data due to database error'
    });
  }
});

// Products endpoint
app.get('/api/products', async (req, res) => {
  try {
    const { category, featured, limit = 20 } = req.query;
    let products;
    
    if (dbConnected && db) {
      const { products: productsTable, categories: categoriesTable } = require('./database/schema');
      const { eq, and } = require('drizzle-orm');
      
      let query = db.select().from(productsTable);
      
      // Apply filters
      const filters = [];
      if (category) {
        filters.push(eq(productsTable.category_id, parseInt(category)));
      }
      if (featured === 'true') {
        filters.push(eq(productsTable.is_featured, true));
      }
      
      if (filters.length > 0) {
        query = query.where(and(...filters));
      }
      
      // Apply limit
      query = query.limit(parseInt(limit));
      
      products = await query;
    } else {
      products = fallbackData.products;
      
      // Apply filters to fallback data
      if (category) {
        products = products.filter(p => p.category_id === parseInt(category));
      }
      if (featured === 'true') {
        products = products.filter(p => p.is_featured);
      }
      
      // Apply limit
      products = products.slice(0, parseInt(limit));
    }
    
    res.json({
      success: true,
      data: products,
      source: dbConnected ? 'postgresql' : 'fallback',
      filters: { category, featured, limit }
    });
  } catch (error) {
    console.error('Products error:', error);
    res.json({
      success: true,
      data: fallbackData.products,
      source: 'fallback',
      note: 'Using fallback data due to database error'
    });
  }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let product;
    
    if (dbConnected && db) {
      const { products: productsTable } = require('./database/schema');
      const { eq } = require('drizzle-orm');
      
      const result = await db.select().from(productsTable).where(eq(productsTable.id, parseInt(id)));
      product = result[0];
    } else {
      product = fallbackData.products.find(p => p.id === parseInt(id));
    }
    
    if (product) {
      res.json({
        success: true,
        data: product,
        source: dbConnected ? 'postgresql' : 'fallback'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
  } catch (error) {
    console.error('Product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // For now, use hardcoded admin credentials
    // In future, this would check the database
    if (email === 'admin@bingo.com' && password === 'admin123') {
      const token = jwt.sign(
        { id: 1, email: 'admin@bingo.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ 
        success: true, 
        token, 
        user: { id: 1, email: 'admin@bingo.com', name: 'Bingo Admin', role: 'admin' } 
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Admin endpoints that would work with real database
// GET admin products
app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    if (dbConnected && db) {
      const { products: productsTable } = require('./database/schema');
      const result = await db.select().from(productsTable).orderBy(productsTable.created_at, 'desc');
      
      res.json({ 
        success: true, 
        data: result
      });
    } else {
      res.json({
        success: true,
        data: fallbackData.products,
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ success: false, message: 'Failed to load products', error: error.message });
  }
});

app.post('/api/admin/categories', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Generate slug from name
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    
    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }
    
    if (dbConnected && db) {
      const { categories: categoriesTable } = require('./database/schema');
      
      const result = await db.insert(categoriesTable).values({
        name,
        slug,
        description: description || '',
        image_url: null // Handle image upload later
      }).returning();
      
      res.json({ 
        success: true, 
        message: 'Category created successfully',
        data: result[0]
      });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available. Cannot create category.' 
      });
    }
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
});

app.post('/api/admin/products', authenticateAdmin, upload.array('images', 10), async (req, res) => {
  try {
    // Handle both FormData and JSON
    const productData = req.body;
    
    // Convert FormData fields to proper types
    const name = productData.name;
    const sku = productData.sku;
    const price = parseFloat(productData.price);
    const quantity = parseInt(productData.quantity) || 0;
    const oldPrice = productData.oldPrice ? parseFloat(productData.oldPrice) : null;
    const description = productData.description || '';
    const inStock = productData.inStock === 'true' || productData.inStock === true;
    
    // Generate slug from name
    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '';
    
    // Validate required fields
    if (!name || !sku || !price || !slug) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, SKU, and price are required fields' 
      });
    }
    
    if (dbConnected && db) {
      const { products: productsTable } = require('./database/schema');
      
      // Handle image uploads
      let imageUrl = null;
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        const filename = `${Date.now()}-${file.originalname}`;
        const uploadPath = path.join(__dirname, 'uploads', filename);
        
        // Ensure the uploads directory exists
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
        
        fs.writeFileSync(uploadPath, file.buffer);
        imageUrl = `/uploads/${filename}`;
      }

      const result = await db.insert(productsTable).values({
        name: name,
        slug: slug,
        description: description,
        price: price.toString(),
        compare_price: oldPrice ? oldPrice.toString() : null,
        sku: sku,
        quantity: quantity,
        is_featured: false,
        is_active: inStock,
        category_id: 1, // Default to first category for now
        image_url: imageUrl
      }).returning();
      
      res.json({ 
        success: true, 
        message: 'Product created successfully',
        data: result[0]
      });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available. Cannot create product.' 
      });
    }
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product', error: error.message });
  }
});

// Admin category management endpoints
app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, slug, description, image_url } = req.body;
    
    if (dbConnected && db) {
      const { categories: categoriesTable } = require('./database/schema');
      const { eq } = require('drizzle-orm');
      
      const result = await db.update(categoriesTable)
        .set({ 
          name, 
          slug, 
          description, 
          image_url, 
          updated_at: new Date() 
        })
        .where(eq(categoriesTable.id, parseInt(categoryId)))
        .returning();
        
      if (result.length > 0) {
        res.json({ 
          success: true, 
          message: 'Category updated successfully',
          data: result[0]
        });
      } else {
        res.status(404).json({ success: false, message: 'Category not found' });
      }
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available. Cannot update category.' 
      });
    }
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
});

app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
  try {
    const categoryId = req.params.id;
    
    if (dbConnected && db) {
      const { categories: categoriesTable } = require('./database/schema');
      const { eq } = require('drizzle-orm');
      
      const result = await db.delete(categoriesTable)
        .where(eq(categoriesTable.id, parseInt(categoryId)))
        .returning();

      if (result.length > 0) {
        res.json({ 
          success: true, 
          message: 'Category deleted successfully'
        });
      } else {
        res.status(404).json({ success: false, message: 'Category not found' });
      }
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available. Cannot delete category.' 
      });
    }
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const productData = req.body;

    if (dbConnected && db) {
      const { products: productsTable } = require('./database/schema');
      const { eq } = require('drizzle-orm');

      const updateData = {
        ...productData,
        updated_at: new Date(),
      };

      // Handle image uploads
      if (req.files && req.files.length > 0) {
        const file = req.files[0];
        const filename = `${Date.now()}-${file.originalname}`;
        const uploadPath = path.join(__dirname, 'uploads', filename);
        
        // Ensure the uploads directory exists
        fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
        
        fs.writeFileSync(uploadPath, file.buffer);
        updateData.image_url = `/uploads/${filename}`;
      }


      if (productData.price) {
        updateData.price = productData.price.toString();
      }
      if (productData.compare_price) {
        updateData.compare_price = productData.compare_price.toString();
      }

      const result = await db.update(productsTable)
        .set(updateData)
        .where(eq(productsTable.id, parseInt(productId)))
        .returning();

      if (result.length > 0) {
        res.json({
          success: true,
          message: 'Product updated successfully',
          data: result[0]
        });
      } else {
        res.status(404).json({ success: false, message: 'Product not found' });
      }
    } else {
      res.status(503).json({
        success: false,
        message: 'Database not available. Cannot update product.'
      });
    }
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product', error: error.message });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;

    if (dbConnected && db) {
      const { products: productsTable } = require('./database/schema');
      const { eq } = require('drizzle-orm');

      const result = await db.delete(productsTable)
        .where(eq(productsTable.id, parseInt(productId)))
        .returning();

      if (result.length > 0) {
        res.json({
          success: true,
          message: 'Product deleted successfully'
        });
      } else {
        res.status(404).json({ success: false, message: 'Product not found' });
      }
    } else {
      res.status(503).json({
        success: false,
        message: 'Database not available. Cannot delete product.'
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product', error: error.message });
  }
});



app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    let categories;
    if (dbConnected && db) {
      const { categories: categoriesTable } = require('./database/schema');
      categories = await db.select().from(categoriesTable);
    } else {
      categories = fallbackData.categories;
    }
    
    res.json({
      success: true,
      data: categories,
      source: dbConnected ? 'postgresql' : 'fallback'
    });
  } catch (error) {
    console.error('Admin categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
});

app.get('/api/admin/analytics/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const { period = 30 } = req.query;
    
    if (dbConnected && db) {
      const { products: productsTable, categories: categoriesTable } = require('./database/schema');
      const { count } = require('drizzle-orm');

      const totalProducts = await db.select({ value: count() }).from(productsTable);
      const totalCategories = await db.select({ value: count() }).from(categoriesTable);

      const analytics = {
        totalProducts: totalProducts[0].value,
        totalCategories: totalCategories[0].value,
        totalOrders: 0, // Placeholder
        totalRevenue: 0, // Placeholder
        recentOrders: [], // Placeholder
        topProducts: [], // Placeholder
        salesChart: [], // Placeholder
      };
      
      res.json({
        success: true,
        data: analytics,
        period,
        source: 'postgresql'
      });

    } else {
      // Mock analytics data
      const analytics = {
        totalProducts: fallbackData.products.length,
        totalCategories: fallbackData.categories.length,
        totalOrders: 0,
        totalRevenue: 0,
        recentOrders: [],
        topProducts: fallbackData.products.slice(0, 5),
        salesChart: Array.from({ length: parseInt(period) }, (_, i) => ({
          date: new Date(Date.now() - (parseInt(period) - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sales: Math.floor(Math.random() * 1000)
        }))
      };
      
      res.json({
        success: true,
        data: analytics,
        period,
        source: 'fallback'
      });
    }
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Catch all handler for frontend routes
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  
  if (path.extname(req.path)) {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server (for local development)
if (!IS_NETLIFY) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${dbConnected ? 'Netlify PostgreSQL connected' : 'Using fallback data'}`);
    console.log(`🔗 Database URL: ${process.env.NETLIFY_DATABASE_URL ? 'Configured' : 'Not found'}`);
  });
}

module.exports = app;
