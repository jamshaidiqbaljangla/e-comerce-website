const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflict
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static('uploads'));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const section = req.params.section || req.body.section;
    let uploadDir = 'images'; // Default upload directory
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const section = req.params.section || req.body.section;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${section ? section + '-' : ''}${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only images
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Define single instance of the asyncHandler middleware
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database connection with better error handling
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bingo_ecommerce',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.stack);
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Media management endpoints
app.get('/api/admin/media/:section', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { section } = req.params;
  // Removed console.log for production
  
  try {
    // Ensure the images directory exists
    if (!fs.existsSync('images')) {
      // Removed console.log for production
      fs.mkdirSync('images', { recursive: true });
      res.json({ images: [] });
      return;
    }
    
    // Return all image files in the images directory matching the section pattern
    const files = fs.readdirSync('images')
      .filter(file => {
        // Skip directories and non-image files
        const fullPath = path.join('images', file);
        if (fs.statSync(fullPath).isDirectory()) return false;
        
        // Check file extension
        const ext = path.extname(file).toLowerCase();
        const validExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        if (!validExt) return false;
        
        // Filter by section
        if (section === 'hero-banner') return file.startsWith('hero-');
        if (section === 'category') return file.startsWith('category-');
        if (section === 'featured-products') return file.startsWith('product-');
        if (section === 'instagram') return file.startsWith('instagram-');
        return true;
      });
    
    console.log(`📄 Found ${files.length} files for section ${section}`);
    
    // Map files to response format
    const images = files.map(filename => {
      const fileExt = path.extname(filename);
      const potentialHoverPath = filename.includes('product-') 
        ? `/images/${filename.replace(fileExt, '-hover' + fileExt)}` 
        : null;
        
      // Check if hover image exists
      const hasHover = potentialHoverPath && fs.existsSync(path.join(__dirname, potentialHoverPath));
      
      return {
        id: filename,
        src: `/images/${filename}`,
        alt: filename,
        title: filename,
        hover: hasHover ? potentialHoverPath : null
      };
    });

    res.json({ 
      images,
      section,
      count: images.length
    });
  } catch (error) {
    console.error('💥 Error fetching media:', error);
    res.status(500).json({ error: 'Failed to fetch media', details: error.message });
  }
}));

app.post('/api/admin/media/:section', authenticateToken, requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error('No file uploaded');
  }

  const { section } = req.params;
  const { alt, title } = req.body;
  console.log(`📤 Uploading media for section: ${section}`, req.file);
  
  try {
    // Create backup of existing file if replacing
    if (req.body.replacing) {
      const oldFile = path.join('images', req.body.replacing);
      console.log(`🔄 Replacing existing file: ${req.body.replacing}`);
      
      if (fs.existsSync(oldFile)) {
        const backupDir = path.join('images', 'backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `${Date.now()}-${req.body.replacing}`);
        fs.copyFileSync(oldFile, backupFile);
        console.log(`✅ Created backup at ${backupFile}`);
      } else {
        console.log(`⚠️ Old file not found: ${oldFile}`);
      }
    }

    // Generate a unique ID
    const mediaId = `${section}-${Date.now()}`;
    
    // Rename the file to include the section name if needed
    let finalFilename = req.file.filename;
    if (!finalFilename.startsWith(section + '-')) {
      const newPath = path.join(path.dirname(req.file.path), section + '-' + path.basename(req.file.filename));
      fs.renameSync(req.file.path, newPath);
      finalFilename = section + '-' + path.basename(req.file.filename);
      console.log(`🔄 Renamed file to: ${finalFilename}`);
    }

    console.log(`✅ Media upload successful: ${finalFilename}`);
    
    res.json({
      success: true,
      image: {
        id: finalFilename,
        src: `/images/${finalFilename}`,
        alt: alt || finalFilename,
        title: title || finalFilename
      }
    });
  } catch (error) {
    // Cleanup uploaded file if operation fails
    console.error('💥 Error uploading media:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log(`🗑️ Cleaned up temporary file: ${req.file.path}`);
    }
    throw error;
  }
}));

app.delete('/api/admin/media/:section/:filename', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { section, filename } = req.params;
  const filepath = path.join('images', filename);
  
  console.log(`🗑️ Deleting media: ${filename} from section: ${section}`);
  
  try {
    // Create backup before deletion
    const backupDir = path.join('images', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (fs.existsSync(filepath)) {
      // Backup the file
      const backupFile = path.join(backupDir, `${Date.now()}-${filename}`);
      fs.copyFileSync(filepath, backupFile);
      console.log(`✅ Created backup at ${backupFile}`);

      // If it's a product image, also backup and delete the hover image
      if (filename.startsWith('product-')) {
        const fileExt = path.extname(filename);
        const hoverFilename = filename.replace(fileExt, '-hover' + fileExt);
        const hoverPath = path.join('images', hoverFilename);
        
        if (fs.existsSync(hoverPath)) {
          const hoverBackupFile = path.join(backupDir, `${Date.now()}-${hoverFilename}`);
          fs.copyFileSync(hoverPath, hoverBackupFile);
          console.log(`✅ Created hover image backup at ${hoverBackupFile}`);
          
          fs.unlinkSync(hoverPath);
          console.log(`✅ Deleted hover image: ${hoverPath}`);
        }
      }
      
      // Delete the file
      fs.unlinkSync(filepath);
      console.log(`✅ Deleted file: ${filepath}`);
      
      res.json({ 
        success: true,
        message: `File ${filename} deleted successfully`,
        section: section
      });
    } else {
      console.log(`⚠️ File not found: ${filepath}`);
      res.json({ 
        success: true, 
        warning: `File ${filename} not found`,
        section: section
      });
    }
  } catch (error) {
    console.error('💥 Error deleting media:', error);
    throw new Error(`Failed to delete media: ${error.message}`);
  }
}));

// Multer storage is already configured above

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, req.query || '');
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, req.query || '');
  next();
});

// Error handling middleware is already defined above

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

// AUTH ENDPOINTS
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  console.log('🔐 Login endpoint hit!', req.body);
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user in database
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (result.rows.length === 0) {
    console.log('❌ User not found:', email);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = result.rows[0];
  console.log('👤 Found user:', user.email, 'Role:', user.role);

  // Check password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    console.log('❌ Invalid password for:', email);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Create JWT token
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role }, 
    JWT_SECRET, 
    { expiresIn: '30d' }
  );

  console.log('✅ Login successful for:', user.email);

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    },
    token
  });
}));

// Define authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Admin middleware - use the previously defined asyncHandler
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// PUBLIC PRODUCTS ENDPOINTS
app.get('/api/products', asyncHandler(async (req, res) => {
  console.log('📦 Public products endpoint hit with query:', req.query);
  
  const { 
    search, 
    category, 
    trending, 
    best_seller, 
    new_arrival, 
    limit = 20, 
    offset = 0 
  } = req.query;

  // Build the main query
  let query = 'SELECT * FROM products WHERE in_stock = true';
  const params = [];
  let paramCount = 0;

  if (search) {
    paramCount++;
    query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  if (trending === 'true') {
    query += ` AND trending = true`;
  }

  if (best_seller === 'true') {
    query += ` AND best_seller = true`;
  }

  if (new_arrival === 'true') {
    query += ` AND new_arrival = true`;
  }

  query += ` ORDER BY created_at DESC`;
  
  // Add pagination
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(parseInt(limit));
  
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(parseInt(offset));

  console.log('Executing query:', query, 'with params:', params);

  // Execute main query
  const result = await pool.query(query, params);
  
  // Get images and categories for each product
  const products = await Promise.all(result.rows.map(async (product) => {
    // Get categories
    let categories = [];
    try {
      const categoriesResult = await pool.query(
        'SELECT category_id FROM product_categories WHERE product_id = $1',
        [product.id]
      );
      categories = categoriesResult.rows.map(row => row.category_id);
    } catch (err) {
      console.error('Error fetching categories for product:', product.id, err);
    }
    
    // Get images
    let product_images = [];
    try {
      const imagesResult = await pool.query(
        'SELECT image_url, image_type, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order',
        [product.id]
      );
      product_images = imagesResult.rows;
    } catch (err) {
      console.error('Error fetching images for product:', product.id, err);
    }
    
    return {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price || 0),
      old_price: product.old_price ? parseFloat(product.old_price) : null,
      description: product.description,
      categories: categories,
      in_stock: product.in_stock,
      sku: product.sku,
      quantity: product.quantity || 0,
      trending: product.trending || false,
      best_seller: product.best_seller || false,
      new_arrival: product.new_arrival || false,
      product_images: product_images,
      // Add legacy image_url field for compatibility
      image_url: product_images.find(img => img.image_type === 'primary')?.image_url || '/images/placeholder.jpg'
    };
  }));

  // Apply category filter if specified (after fetching categories)
  let filteredProducts = products;
  if (category) {
    filteredProducts = products.filter(p => p.categories.includes(category));
  }

  console.log(`Returning ${filteredProducts.length} products`);
  res.json(filteredProducts);
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = result.rows[0];
  
  // Get categories
  const categoriesResult = await pool.query(
    'SELECT category_id FROM product_categories WHERE product_id = $1',
    [id]
  );
  
  // Get images
  const imagesResult = await pool.query(
    'SELECT image_url, image_type FROM product_images WHERE product_id = $1 ORDER BY sort_order',
    [id]
  );
  
  res.json({
    id: product.id,
    name: product.name,
    price: parseFloat(product.price || 0),
    oldPrice: product.old_price ? parseFloat(product.old_price) : null,
    description: product.description,
    categories: categoriesResult.rows.map(row => row.category_id),
    inStock: product.in_stock,
    sku: product.sku,
    quantity: product.quantity || 0,
    trending: product.trending || false,
    best_seller: product.best_seller || false,
    new_arrival: product.new_arrival || false,
    product_images: imagesResult.rows,
    images: {
      primary: imagesResult.rows.find(img => img.image_type === 'primary')?.image_url || '',
      gallery: imagesResult.rows.map(img => img.image_url) || []
    }
  });
}));

app.get('/api/categories', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM categories ORDER BY name');
  res.json(result.rows);
}));

// ADMIN PRODUCTS ENDPOINTS
app.get('/api/admin/products', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  console.log('📦 Admin products endpoint hit');
  
  const { search, category, status, limit = 20, offset = 0 } = req.query;

  // Build the main query
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  let paramCount = 0;

  if (search) {
    paramCount++;
    query += ` AND (name ILIKE $${paramCount} OR sku ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  if (status) {
    if (status === 'active') {
      query += ` AND in_stock = true AND quantity > 0`;
    } else if (status === 'out-of-stock') {
      query += ` AND quantity <= 0`;
    } else if (status === 'draft') {
      query += ` AND in_stock = false`;
    }
  }

  query += ` ORDER BY created_at DESC`;
  
  // Add pagination
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(parseInt(limit));
  
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(parseInt(offset));

  // Execute main query
  const result = await pool.query(query, params);
  
  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
  const countParams = [];
  let countParamIndex = 0;

  if (search) {
    countParamIndex++;
    countQuery += ` AND (name ILIKE $${countParamIndex} OR sku ILIKE $${countParamIndex})`;
    countParams.push(`%${search}%`);
  }

  if (status) {
    if (status === 'active') {
      countQuery += ` AND in_stock = true AND quantity > 0`;
    } else if (status === 'out-of-stock') {
      countQuery += ` AND quantity <= 0`;
    } else if (status === 'draft') {
      countQuery += ` AND in_stock = false`;
    }
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].total);

  // Get categories and images for each product
  const products = await Promise.all(result.rows.map(async (product) => {
    // Get categories
    let categories = [];
    try {
      const categoriesResult = await pool.query(
        'SELECT category_id FROM product_categories WHERE product_id = $1',
        [product.id]
      );
      categories = categoriesResult.rows.map(row => row.category_id);
    } catch (err) {
      console.error('Error fetching categories for product:', product.id, err);
    }
    
    // Get images
    let images = [];
    try {
      const imagesResult = await pool.query(
        'SELECT image_url, image_type, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order',
        [product.id]
      );
      images = imagesResult.rows;
    } catch (err) {
      console.error('Error fetching images for product:', product.id, err);
    }
    
    return {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price || 0),
      oldPrice: product.old_price ? parseFloat(product.old_price) : null,
      description: product.description,
      categories: categories,
      inStock: product.in_stock,
      sku: product.sku,
      quantity: product.quantity || 0,
      lowStockThreshold: product.low_stock_threshold || 5,
      trending: product.trending || false,
      best_seller: product.best_seller || false,
      new_arrival: product.new_arrival || false,
      images: {
        primary: images.find(img => img.image_type === 'primary')?.image_url || '',
        gallery: images.filter(img => img.image_url).map(img => img.image_url) || []
      },
      status: product.quantity <= 0 ? 'out-of-stock' : (product.in_stock ? 'active' : 'draft')
    };
  }));

  // Apply category filter if specified
  let filteredProducts = products;
  if (category) {
    filteredProducts = products.filter(p => p.categories.includes(category));
  }

  res.json({
    products: filteredProducts,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    }
  });
}));

// Create product with image upload support
app.post('/api/admin/products', authenticateToken, requireAdmin, upload.array('images', 8), asyncHandler(async (req, res) => {
  console.log('➕ Create product endpoint hit:', req.body);
  console.log('📸 Uploaded files:', req.files);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      name, sku, price, oldPrice, description, 
      quantity, inStock, lowStockThreshold
    } = req.body;
    
    // Handle categories array from FormData
    let categories = [];
    if (req.body['categories[]']) {
      categories = Array.isArray(req.body['categories[]']) 
        ? req.body['categories[]'] 
        : [req.body['categories[]']];
    }

    // Validate required fields
    if (!name || !sku || price === undefined || quantity === undefined) {
      throw new Error('Missing required fields: name, sku, price, and quantity are required');
    }

    // Generate product ID
    const productId = 'product-' + Date.now();

    // Insert product
    const productResult = await client.query(`
      INSERT INTO products (
        id, name, sku, price, old_price, description, 
        quantity, in_stock, low_stock_threshold,
        trending, best_seller, new_arrival
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      productId, name, sku, parseFloat(price), 
      oldPrice ? parseFloat(oldPrice) : null,
      description || '', parseInt(quantity || 0), 
      inStock === 'true' || inStock === true, 
      parseInt(lowStockThreshold || 5),
      false, false, false // Default trending, best_seller, new_arrival to false
    ]);

    // Insert categories
    if (categories.length > 0) {
      for (const categoryId of categories) {
        if (categoryId && categoryId.trim()) {
          await client.query(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
            [productId, categoryId.trim()]
          );
        }
      }
    }

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/products/${file.filename}`;
        const imageType = i === 0 ? 'primary' : 'gallery';
        
        await client.query(
          'INSERT INTO product_images (product_id, image_url, image_type, sort_order) VALUES ($1, $2, $3, $4)',
          [productId, imageUrl, imageType, i]
        );
      }
    } else {
      // Insert default placeholder if no images uploaded
      await client.query(
        'INSERT INTO product_images (product_id, image_url, image_type) VALUES ($1, $2, $3)',
        [productId, '/images/placeholder.jpg', 'primary']
      );
    }

    await client.query('COMMIT');

    console.log('✅ Product created successfully:', productId);

    res.status(201).json({
      message: 'Product created successfully',
      product: productResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    // Delete uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => { if (err) console.error('Error deleting file:', err); });
      });
    }
    
    console.error('💥 Error creating product:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create product: ' + error.message });
    }
  } finally {
    client.release();
  }
}));

// Update product with image upload support
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, upload.array('images', 8), asyncHandler(async (req, res) => {
  console.log('✏️ Update product endpoint hit:', req.params.id);
  console.log('📸 Uploaded files:', req.files);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      name, sku, price, oldPrice, description,
      quantity, inStock, lowStockThreshold
    } = req.body;
    
    // Handle categories array from FormData
    let categories = [];
    if (req.body['categories[]']) {
      categories = Array.isArray(req.body['categories[]']) 
        ? req.body['categories[]'] 
        : [req.body['categories[]']];
    }

    // Check if product exists
    const existing = await client.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product
    const result = await client.query(`
      UPDATE products SET 
        name = COALESCE($1, name), 
        sku = COALESCE($2, sku), 
        price = COALESCE($3, price), 
        old_price = $4, 
        description = COALESCE($5, description), 
        quantity = COALESCE($6, quantity), 
        in_stock = COALESCE($7, in_stock),
        low_stock_threshold = COALESCE($8, low_stock_threshold),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      name, sku, price !== undefined ? parseFloat(price) : null, 
      oldPrice !== undefined ? parseFloat(oldPrice) : null,
      description, quantity !== undefined ? parseInt(quantity) : null, 
      inStock === 'true' || inStock === true, 
      lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : null, id
    ]);

    // Update categories
    await client.query('DELETE FROM product_categories WHERE product_id = $1', [id]);
    if (categories.length > 0) {
      for (const categoryId of categories) {
        if (categoryId && categoryId.trim()) {
          await client.query(
            'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2)',
            [id, categoryId.trim()]
          );
        }
      }
    }

    // Handle new uploaded images
    if (req.files && req.files.length > 0) {
      // Delete old primary image
      await client.query(
        'DELETE FROM product_images WHERE product_id = $1 AND image_type = $2',
        [id, 'primary']
      );

      // Get current max sort order
      const maxSortResult = await client.query(
        'SELECT MAX(sort_order) AS max_sort FROM product_images WHERE product_id = $1',
        [id]
      );
      let nextSort = (maxSortResult.rows[0].max_sort ?? -1) + 1;

      // Insert all new files
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const imageUrl = `/uploads/products/${file.filename}`;
        const imageType = (i === 0 ? 'primary' : 'gallery');

        await client.query(
          'INSERT INTO product_images (product_id, image_url, image_type, sort_order) VALUES ($1, $2, $3, $4)',
          [id, imageUrl, imageType, nextSort]
        );
        nextSort++;
      }
    }

    await client.query('COMMIT');

    console.log('✅ Product updated successfully:', id);

    res.json({
      message: 'Product updated successfully',
      product: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    // Delete uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => { if (err) console.error('Error deleting file:', err); });
      });
    }
    
    console.error('💥 Error updating product:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'SKU already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update product: ' + error.message });
    }
  } finally {
    client.release();
  }
}));

// Delete product
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Delete product endpoint hit:', id);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get images before deleting
    const imagesResult = await pool.query(
      'SELECT image_url FROM product_images WHERE product_id = $1',
      [id]
    );
    
    // Delete product (cascades to related tables)
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete physical image files
    imagesResult.rows.forEach(row => {
      if (row.image_url && row.image_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, row.image_url);
        fs.unlink(filePath, err => {
          if (err) console.error('Error deleting image file:', err);
        });
      }
    });
    
    await client.query('COMMIT');
    
    console.log('✅ Product deleted successfully:', id);
    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product: ' + error.message });
  } finally {
    client.release();
  }
}));

// Bulk delete products
app.delete('/api/admin/products', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { productIds } = req.body;
  console.log('🗑️ Bulk delete endpoint hit:', productIds);

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({ error: 'Product IDs array is required' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get all images for the products to be deleted
    const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
    const imagesResult = await pool.query(
      `SELECT image_url FROM product_images WHERE product_id IN (${placeholders})`,
      productIds
    );
    
    // Delete products
    const result = await client.query(
      `DELETE FROM products WHERE id IN (${placeholders}) RETURNING id`, 
      productIds
    );
    
    // Delete physical image files
    imagesResult.rows.forEach(row => {
      if (row.image_url && row.image_url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, row.image_url);
        fs.unlink(filePath, err => {
          if (err) console.error('Error deleting image file:', err);
        });
      }
    });
    
    await client.query('COMMIT');
    
    console.log(`✅ ${result.rows.length} products deleted successfully`);
    
    res.json({
      message: `${result.rows.length} products deleted successfully`,
      deletedIds: result.rows.map(row => row.id)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Error bulk deleting products:', error);
    res.status(500).json({ error: 'Failed to delete products: ' + error.message });
  } finally {
    client.release();
  }
}));

// ADMIN CATEGORIES ENDPOINTS
const categoryUpload = upload;

// ADMIN COLLECTIONS ENDPOINTS
const collectionUpload = upload;

app.get('/api/collections', asyncHandler(async (req, res) => {
  console.log('📥 Collections endpoint hit');
  try {
    const result = await pool.query('SELECT * FROM collections ORDER BY name');
    console.log('✅ Collections fetched successfully:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('💥 Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
}));

app.post('/api/admin/collections', authenticateToken, requireAdmin, collectionUpload.single('image'), asyncHandler(async (req, res) => {
  const { name, slug, description, isActive } = req.body;
  const image = req.file;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const imageUrl = image ? `/uploads/collections/${image.filename}` : null;

  const result = await pool.query(
    `INSERT INTO collections (id, name, slug, description, is_active, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [slug, name, slug, description, isActive === 'true', imageUrl]
  );

  res.status(201).json(result.rows[0]);
}));

app.put('/api/admin/collections/:id', authenticateToken, requireAdmin, collectionUpload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, isActive } = req.body;
  const image = req.file;

  let imageUrl;
  if (image) {
    imageUrl = `/uploads/collections/${image.filename}`;
  }

  const result = await pool.query(
    `UPDATE collections SET
       name = $1, slug = $2, description = $3, is_active = $4, image_url = COALESCE($5, image_url),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $6 RETURNING *`,
    [name, slug, description, isActive === 'true', imageUrl, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  res.json(result.rows[0]);
}));

app.delete('/api/admin/collections/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await pool.query('DELETE FROM collections WHERE id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Collection not found' });
  }

  res.status(204).send();
}));

app.post('/api/admin/categories', authenticateToken, requireAdmin, categoryUpload.single('image'), asyncHandler(async (req, res) => {
  const { name, slug, description, parentId, isActive, sortOrder, color, metaDescription } = req.body;
  const image = req.file;

  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const imageUrl = image ? `/uploads/categories/${image.filename}` : null;

  const validSortOrder = sortOrder ? parseInt(sortOrder, 10) : 0; // Default to 0 if invalid or not provided

  const result = await pool.query(
    `INSERT INTO categories (id, name, slug, description, parent_id, is_active, sort_order, color, image_url, meta_description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [slug, name, slug, description, parentId || null, isActive === 'true', validSortOrder, color, imageUrl, metaDescription]
  );

  res.status(201).json(result.rows[0]);
}));

app.put('/api/admin/categories/:id', authenticateToken, requireAdmin, categoryUpload.single('image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, parentId, isActive, sortOrder, color, metaDescription } = req.body;
  const image = req.file;

  let imageUrl;
  if (image) {
    imageUrl = `/uploads/categories/${image.filename}`;
  }

  const result = await pool.query(
    `UPDATE categories SET
       name = $1, slug = $2, description = $3, parent_id = $4, is_active = $5,
       sort_order = $6, color = $7, image_url = COALESCE($8, image_url), meta_description = $9,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $10 RETURNING *`,
    [name, slug, description, parentId || null, isActive === 'true', sortOrder, color, imageUrl, metaDescription, id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.json(result.rows[0]);
}));

app.delete('/api/admin/categories/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const children = await pool.query('SELECT id FROM categories WHERE parent_id = $1', [id]);
  if (children.rows.length > 0) {
    return res.status(400).json({ error: 'Cannot delete category with subcategories' });
  }

  const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  res.status(204).send();
}));

// =============================================================================
// ADMIN BLOG ENDPOINTS  
// =============================================================================

// Get all blog posts (admin)
app.get('/api/admin/blog/posts', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, category, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT bp.*, u.first_name, u.last_name FROM blog_posts bp LEFT JOIN users u ON bp.author_id = u.id';
  let countQuery = 'SELECT COUNT(*) FROM blog_posts bp';
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push(`bp.status = $${params.length + 1}`);
    params.push(status);
  }
  
  if (category) {
    conditions.push(`bp.category = $${params.length + 1}`);
    params.push(category);
  }
  
  if (search) {
    conditions.push(`(bp.title ILIKE $${params.length + 1} OR bp.content ILIKE $${params.length + 1})`);
    params.push(`%${search}%`);
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY bp.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const [posts, count] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    posts: posts.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count.rows[0].count),
      pages: Math.ceil(count.rows[0].count / limit)
    }
  });
}));

// Get single blog post (admin)
app.get('/api/admin/blog/posts/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(`
    SELECT bp.*, u.first_name, u.last_name 
    FROM blog_posts bp 
    LEFT JOIN users u ON bp.author_id = u.id 
    WHERE bp.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Blog post not found' });
  }
  
  res.json(result.rows[0]);
}));

// Create blog post
app.post('/api/admin/blog/posts', authenticateToken, requireAdmin, upload.single('featured_image'), asyncHandler(async (req, res) => {
  const {
    title,
    content,
    excerpt,
    status = 'draft',
    category,
    tags,
    meta_title,
    meta_description,
    featured = false,
    publish_date
  } = req.body;
  
  // Generate slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  let featured_image_url = null;
  if (req.file) {
    featured_image_url = req.file.filename;
  }
  
  const tagsArray = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
  
  const result = await pool.query(`
    INSERT INTO blog_posts (
      title, slug, content, excerpt, featured_image_url, author_id, 
      status, publish_date, category, tags, meta_title, meta_description, featured
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    title,
    slug,
    content,
    excerpt,
    featured_image_url,
    req.user.id,
    status,
    publish_date || (status === 'published' ? new Date() : null),
    category,
    tagsArray,
    meta_title,
    meta_description,
    featured === 'true' || featured === true
  ]);
  
  res.status(201).json({
    message: 'Blog post created successfully',
    post: result.rows[0]
  });
}));

// Update blog post
app.put('/api/admin/blog/posts/:id', authenticateToken, requireAdmin, upload.single('featured_image'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    content,
    excerpt,
    status,
    category,
    tags,
    meta_title,
    meta_description,
    featured,
    publish_date
  } = req.body;
  
  // Check if post exists
  const existingPost = await pool.query('SELECT * FROM blog_posts WHERE id = $1', [id]);
  if (existingPost.rows.length === 0) {
    return res.status(404).json({ error: 'Blog post not found' });
  }
  
  let featured_image_url = existingPost.rows[0].featured_image_url;
  if (req.file) {
    featured_image_url = req.file.filename;
  }
  
  const tagsArray = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []);
  
  const result = await pool.query(`
    UPDATE blog_posts SET
      title = $1, content = $2, excerpt = $3, featured_image_url = $4,
      status = $5, publish_date = $6, category = $7, tags = $8,
      meta_title = $9, meta_description = $10, featured = $11, updated_at = CURRENT_TIMESTAMP
    WHERE id = $12
    RETURNING *
  `, [
    title,
    content,
    excerpt,
    featured_image_url,
    status,
    publish_date,
    category,
    tagsArray,
    meta_title,
    meta_description,
    featured === 'true' || featured === true,
    id
  ]);
  
  res.json({
    message: 'Blog post updated successfully',
    post: result.rows[0]
  });
}));

// Delete blog post
app.delete('/api/admin/blog/posts/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM blog_posts WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Blog post not found' });
  }
  
  res.json({ message: 'Blog post deleted successfully' });
}));

// =============================================================================
// ADMIN SETTINGS ENDPOINTS
// =============================================================================

// Get all settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM admin_settings ORDER BY key');
  
  // Convert to key-value object
  const settings = {};
  result.rows.forEach(row => {
    let value = row.value;
    if (row.type === 'number') {
      value = parseFloat(value);
    } else if (row.type === 'boolean') {
      value = value === 'true';
    }
    settings[row.key] = value;
  });
  
  res.json(settings);
}));

// Update settings
app.put('/api/admin/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const settings = req.body;
  
  for (const [key, value] of Object.entries(settings)) {
    await pool.query(`
      INSERT INTO admin_settings (key, value, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET
        value = $2, updated_at = CURRENT_TIMESTAMP
    `, [key, String(value)]);
  }
  
  res.json({ message: 'Settings updated successfully' });
}));

// =============================================================================
// ADMIN PAGES ENDPOINTS
// =============================================================================

// Get all site pages
app.get('/api/admin/pages', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM site_pages ORDER BY created_at DESC');
  res.json(result.rows);
}));

// Get single page
app.get('/api/admin/pages/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('SELECT * FROM site_pages WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  res.json(result.rows[0]);
}));

// Create page
app.post('/api/admin/pages', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { title, content, meta_title, meta_description, status = 'draft', template = 'default' } = req.body;
  
  // Generate slug from title
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
  
  const result = await pool.query(`
    INSERT INTO site_pages (title, slug, content, meta_title, meta_description, status, template)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [title, slug, content, meta_title, meta_description, status, template]);
  
  res.status(201).json({
    message: 'Page created successfully',
    page: result.rows[0]
  });
}));

// Update page
app.put('/api/admin/pages/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, meta_title, meta_description, status, template } = req.body;
  
  const result = await pool.query(`
    UPDATE site_pages SET
      title = $1, content = $2, meta_title = $3, meta_description = $4,
      status = $5, template = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `, [title, content, meta_title, meta_description, status, template, id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  res.json({
    message: 'Page updated successfully',
    page: result.rows[0]
  });
}));

// Delete page
app.delete('/api/admin/pages/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM site_pages WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Page not found' });
  }
  
  res.json({ message: 'Page deleted successfully' });
}));

// =============================================================================
// ADMIN NOTIFICATIONS ENDPOINTS
// =============================================================================

// Get all notifications
app.get('/api/admin/notifications', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, read } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM notifications';
  let countQuery = 'SELECT COUNT(*) FROM notifications';
  const params = [];
  const conditions = [];
  
  if (type) {
    conditions.push(`type = $${params.length + 1}`);
    params.push(type);
  }
  
  if (read !== undefined) {
    conditions.push(`read = $${params.length + 1}`);
    params.push(read === 'true');
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const [notifications, count] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    notifications: notifications.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(count.rows[0].count),
      pages: Math.ceil(count.rows[0].count / limit)
    }
  });
}));

// Mark notification as read
app.put('/api/admin/notifications/:id/read', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
    [id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ message: 'Notification marked as read' });
}));

// Mark all notifications as read
app.put('/api/admin/notifications/read-all', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  await pool.query('UPDATE notifications SET read = true');
  res.json({ message: 'All notifications marked as read' });
}));

// Delete notification
app.delete('/api/admin/notifications/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ message: 'Notification deleted successfully' });
}));

// =============================================================================
// ADMIN PROFILE ENDPOINTS
// =============================================================================

// Get admin profile
app.get('/api/admin/profile', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(
    'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(result.rows[0]);
}));

// Update admin profile
app.put('/api/admin/profile', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { first_name, last_name, email } = req.body;
  
  // Check if email is already taken by another user
  if (email) {
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already taken' });
    }
  }
  
  const result = await pool.query(`
    UPDATE users SET
      first_name = $1, last_name = $2, email = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING id, email, first_name, last_name, role, created_at
  `, [first_name, last_name, email, req.user.id]);
  
  res.json({
    message: 'Profile updated successfully',
    user: result.rows[0]
  });
}));

// Change admin password
app.put('/api/admin/profile/password', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  
  // Get current user
  const user = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  
  if (user.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Verify current password
  const isValidPassword = await bcrypt.compare(current_password, user.rows[0].password_hash);
  if (!isValidPassword) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  
  // Hash new password
  const hashedPassword = await bcrypt.hash(new_password, 10);
  
  // Update password
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hashedPassword, req.user.id]
  );
  
  res.json({ message: 'Password updated successfully' });
}));

// Admin routes are defined directly in this file


// Initialize database
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');

    // Create tables if they don't exist
    // await pool.query('DROP TABLE IF EXISTS product_collections, collections, product_categories, categories CASCADE');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        parent_id VARCHAR(50) REFERENCES categories(id) ON DELETE SET NULL,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        color VARCHAR(7),
        image_url VARCHAR(255),
        meta_description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        old_price DECIMAL(10,2),
        description TEXT,
        in_stock BOOLEAN DEFAULT true,
        rating DECIMAL(2,1) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        trending BOOLEAN DEFAULT false,
        new_arrival BOOLEAN DEFAULT false,
        best_seller BOOLEAN DEFAULT false,
        sku VARCHAR(100) UNIQUE,
        quantity INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        category_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_collections (
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        collection_id VARCHAR(50) REFERENCES collections(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, collection_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
        image_url VARCHAR(500) NOT NULL,
        image_type VARCHAR(20) DEFAULT 'gallery',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables created');

    // Insert sample data
    await insertSampleData();

  } catch (error) {
    console.error('💥 Database initialization error:', error);
    throw error;
  }
}

async function insertSampleData() {
  try {
    // Skip sample data in development mode
    return console.log('✅ Sample data setup skipped in development mode');

    for (const collection of collections) {
        await pool.query(
            'INSERT INTO collections (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
            [collection.id, collection.name, collection.slug]
        );
    }

    for (const category of categories) {
        await pool.query(
            'INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
            [category.id, category.name, category.slug]
        );
    }

    // Insert sample products
    const products = [
      {
        id: 'product-1',
        name: 'Signature Collection Item',
        price: 199.00,
        old_price: 249.00,
        description: 'Our flagship product from the signature collection.',
        sku: 'BINGO-001',
        quantity: 24,
        trending: true,
        best_seller: true,
        new_arrival: false,
        categories: ['premium']
      },
      {
        id: 'product-2', 
        name: 'Modern Minimalist Piece',
        price: 179.00,
        description: 'Clean lines and minimalist design.',
        sku: 'BINGO-002',
        quantity: 18,
        trending: false,
        best_seller: false,
        new_arrival: true,
        categories: ['lifestyle']
      },
      {
        id: 'product-3',
        name: 'Exclusive Designer Item',
        price: 299.00,
        description: 'Limited edition designer collaboration.',
        sku: 'BINGO-003',
        quantity: 0,
        trending: false,
        best_seller: false,
        new_arrival: false,
        categories: ['limited']
      },
      {
        id: 'product-4',
        name: 'Premium Collector\'s Edition',
        price: 349.00,
        description: 'A must-have for collectors.',
        sku: 'BINGO-004',
        quantity: 5,
        trending: false,
        best_seller: true,
        new_arrival: false,
        categories: ['collection']
      },
      {
        id: 'product-5',
        name: 'Contemporary Classic',
        price: 189.00,
        description: 'Modern take on classic design.',
        sku: 'BINGO-005',
        quantity: 12,
        trending: true,
        best_seller: false,
        new_arrival: true,
        categories: ['new-season']
      }
    ];

    for (const product of products) {
      await pool.query(`
        INSERT INTO products (id, name, price, old_price, description, sku, quantity, in_stock, trending, best_seller, new_arrival)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING
      `, [
        product.id, product.name, product.price, product.old_price || null,
        product.description, product.sku, product.quantity, product.quantity > 0,
        product.trending, product.best_seller, product.new_arrival
      ]);

      // Insert categories
      for (const categoryId of product.categories) {
        await pool.query(
          'INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [product.id, categoryId]
        );
      }

      // Insert sample image
      await pool.query(
        'INSERT INTO product_images (product_id, image_url, image_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [product.id, `/images/${product.id}.jpg`, 'primary']
      );
    }

    // Create admin user
    const adminEmail = 'admin@bingo.com';
    const adminPassword = 'admin123';
    
    const existingAdmin = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
        [adminEmail, hashedPassword, 'Admin', 'User', 'admin']
      );
      console.log('👤 Admin user created - Email:', adminEmail, 'Password:', adminPassword);
    } else {
      console.log('👤 Admin user already exists');
    }

    console.log('✅ Sample data inserted');

  } catch (error) {
    console.error('💥 Error inserting sample data:', error);
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('✨ BINGO E-Commerce Server Started ✨');
      console.log('🚀 Server running on http://localhost:' + PORT);
      console.log('🔧 Database integration active!');
      console.log('👨‍💼 Access admin at: http://localhost:' + PORT + '/admin-products.html');
      console.log('👤 Admin login: admin@bingo.com / admin123');
      console.log('🧪 Test endpoint: http://localhost:' + PORT + '/api/test');
      console.log('📸 Image uploads enabled - Max 8 images per product, 5MB each');
      console.log('📝 API Documentation:');
      console.log('   PUBLIC ENDPOINTS:');
      console.log('   - GET    /api/products (with query params: search, category, trending, best_seller, new_arrival, limit, offset)');
      console.log('   - GET    /api/products/:id');
      console.log('   - GET    /api/categories');
      console.log('   ADMIN ENDPOINTS (require auth):');
      console.log('   - POST   /api/auth/login');
      console.log('   - GET    /api/admin/products');
      console.log('   - POST   /api/admin/products (multipart/form-data)');
      console.log('   - PUT    /api/admin/products/:id (multipart/form-data)');
      console.log('   - DELETE /api/admin/products/:id');
      console.log('   - DELETE /api/admin/products (bulk delete)');
    });
  })
  .catch(err => {
    console.error('💥 Failed to start server:', err);
    process.exit(1);
  });

// =============================================================================
// CART MANAGEMENT ENDPOINTS
// =============================================================================

// Get cart items for user
app.get('/api/cart', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const result = await pool.query(`
    SELECT ci.*, p.name, p.price, p.image_url, pv.variant_name, pv.variant_value
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants pv ON ci.variant_id = pv.id
    WHERE ci.user_id = $1
    ORDER BY ci.created_at DESC
  `, [userId]);
  
  res.json({
    success: true,
    items: result.rows
  });
}));

// Add item to cart
app.post('/api/cart', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { productId, variantId, quantity = 1 } = req.body;
  
  // Check if item already exists in cart
  const existingItem = await pool.query(
    'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2 AND ($3::INTEGER IS NULL OR variant_id = $3)',
    [userId, productId, variantId || null]
  );
  
  if (existingItem.rows.length > 0) {
    // Update quantity
    const newQuantity = existingItem.rows[0].quantity + quantity;
    await pool.query(
      'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newQuantity, existingItem.rows[0].id]
    );
  } else {
    // Add new item
    await pool.query(
      'INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)',
      [userId, productId, variantId || null, quantity]
    );
  }
  
  res.json({
    success: true,
    message: 'Item added to cart successfully'
  });
}));

// Update cart item quantity
app.put('/api/cart/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { quantity } = req.body;
  
  await pool.query(
    'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
    [quantity, id, userId]
  );
  
  res.json({
    success: true,
    message: 'Cart updated successfully'
  });
}));

// Remove item from cart
app.delete('/api/cart/:id', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  
  await pool.query(
    'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  
  res.json({
    success: true,
    message: 'Item removed from cart'
  });
}));

// Clear entire cart
app.delete('/api/cart', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
  
  res.json({
    success: true,
    message: 'Cart cleared successfully'
  });
}));

// =============================================================================
// ORDER MANAGEMENT ENDPOINTS
// =============================================================================

// Get all orders (Admin)
app.get('/api/admin/orders', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT o.*, u.email, u.first_name, u.last_name,
           COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
  `;
  
  const queryParams = [];
  const conditions = [];
  
  if (status) {
    conditions.push(`o.status = $${queryParams.length + 1}`);
    queryParams.push(status);
  }
  
  if (search) {
    conditions.push(`(o.order_number ILIKE $${queryParams.length + 1} OR u.email ILIKE $${queryParams.length + 1})`);
    queryParams.push(`%${search}%`);
  }
  
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  query += ` GROUP BY o.id, u.email, u.first_name, u.last_name
             ORDER BY o.created_at DESC
             LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  
  queryParams.push(limit, offset);
  
  const result = await pool.query(query, queryParams);
  
  // Get total count
  let countQuery = 'SELECT COUNT(DISTINCT o.id) FROM orders o LEFT JOIN users u ON o.user_id = u.id';
  if (conditions.length > 0) {
    countQuery += ` WHERE ${conditions.join(' AND ')}`;
  }
  
  const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
  
  res.json({
    success: true,
    orders: result.rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count),
      pages: Math.ceil(countResult.rows[0].count / limit)
    }
  });
}));

// Get single order (Admin)
app.get('/api/admin/orders/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const orderResult = await pool.query(`
    SELECT o.*, u.email, u.first_name, u.last_name, u.phone
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = $1
  `, [id]);
  
  if (orderResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  
  const itemsResult = await pool.query(`
    SELECT oi.*, p.name as product_name, p.image_url
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [id]);
  
  const order = orderResult.rows[0];
  order.items = itemsResult.rows;
  
  res.json({
    success: true,
    order
  });
}));

// Create order from cart
app.post('/api/orders', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get cart items
    const cartResult = await client.query(`
      SELECT ci.*, p.name, p.price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [userId]);
    
    if (cartResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }
    
    // Calculate totals
    const subtotal = cartResult.rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const taxAmount = subtotal * 0.08; // 8% tax
    const totalAmount = subtotal + shippingCost + taxAmount;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Create order
    const orderResult = await client.query(`
      INSERT INTO orders (
        order_number, user_id, status, subtotal, shipping_cost, tax_amount, total_amount,
        payment_method, shipping_address, billing_address, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      orderNumber, userId, 'pending', subtotal, shippingCost, taxAmount, totalAmount,
      paymentMethod, JSON.stringify(shippingAddress), JSON.stringify(billingAddress), notes
    ]);
    
    const orderId = orderResult.rows[0].id;
    
    // Create order items
    for (const item of cartResult.rows) {
      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, variant_id, product_name, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId, item.product_id, item.variant_id, item.name,
        item.quantity, item.price, item.price * item.quantity
      ]);
    }
    
    // Clear cart
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Order created successfully',
      orderId,
      orderNumber
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

// Update order status (Admin)
app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status'
    });
  }
  
  await pool.query(
    'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [status, id]
  );
  
  res.json({
    success: true,
    message: 'Order status updated successfully'
  });
}));

// =============================================================================
// CUSTOMER MANAGEMENT ENDPOINTS (ADMIN)
// =============================================================================

// Get all customers (Admin)
app.get('/api/admin/customers', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT u.*, 
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(o.total_amount), 0) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.role = 'customer'
  `;
  
  const queryParams = [];
  
  if (search) {
    query += ` AND (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1)`;
    queryParams.push(`%${search}%`);
  }
  
  query += ` GROUP BY u.id
             ORDER BY u.created_at DESC
             LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  
  queryParams.push(limit, offset);
  
  const result = await pool.query(query, queryParams);
  
  res.json({
    success: true,
    customers: result.rows
  });
}));

// Get customer details with order history (Admin)
app.get('/api/admin/customers/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const customerResult = await pool.query(`
    SELECT u.*, 
           COUNT(DISTINCT o.id) as order_count,
           COALESCE(SUM(o.total_amount), 0) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.id = $1 AND u.role = 'customer'
    GROUP BY u.id
  `, [id]);
  
  if (customerResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Customer not found'
    });
  }
  
  const ordersResult = await pool.query(`
    SELECT id, order_number, status, total_amount, created_at
    FROM orders
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, [id]);
  
  const customer = customerResult.rows[0];
  customer.recent_orders = ordersResult.rows;
  
  res.json({
    success: true,
    customer
  });
}));

// =============================================================================
// ANALYTICS ENDPOINTS (ADMIN)
// =============================================================================

// Get dashboard statistics (Admin)
app.get('/api/admin/analytics/dashboard', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { period = '30' } = req.query; // days
  
  // Total statistics
  const statsResult = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
      (SELECT COUNT(*) FROM products WHERE status = 'active' AND quantity <= low_stock_threshold) as low_stock_products,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
      (SELECT COUNT(*) FROM orders) as total_orders,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status != 'cancelled') as total_revenue
  `);
  
  // Period statistics
  const periodStatsResult = await pool.query(`
    SELECT 
      COUNT(*) as period_orders,
      COALESCE(SUM(total_amount), 0) as period_revenue,
      COUNT(DISTINCT user_id) as period_customers
    FROM orders 
    WHERE created_at >= NOW() - INTERVAL '${period} days'
      AND status != 'cancelled'
  `);
  
  // Recent orders
  const recentOrdersResult = await pool.query(`
    SELECT o.id, o.order_number, o.status, o.total_amount, o.created_at,
           u.first_name, u.last_name, u.email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 5
  `);
  
  // Top products
  const topProductsResult = await pool.query(`
    SELECT p.name, SUM(oi.quantity) as sold_quantity, SUM(oi.total_price) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at >= NOW() - INTERVAL '${period} days'
      AND o.status != 'cancelled'
    GROUP BY p.id, p.name
    ORDER BY sold_quantity DESC
    LIMIT 5
  `);
  
  res.json({
    success: true,
    stats: {
      ...statsResult.rows[0],
      ...periodStatsResult.rows[0],
      recent_orders: recentOrdersResult.rows,
      top_products: topProductsResult.rows
    }
  });
}));

// =============================================================================
// DISCOUNT & COUPON MANAGEMENT ENDPOINTS
// =============================================================================

// Get all coupons (Admin)
app.get('/api/admin/coupons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM coupons 
    ORDER BY created_at DESC
  `);
  
  res.json({
    success: true,
    coupons: result.rows
  });
}));

// Create coupon (Admin)
app.post('/api/admin/coupons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    code, type, value, minimumAmount, maximumDiscount, 
    usageLimit, expiresAt, active = true 
  } = req.body;
  
  // Validate coupon type
  if (!['percentage', 'fixed'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid coupon type. Must be "percentage" or "fixed"'
    });
  }
  
  try {
    const result = await pool.query(`
      INSERT INTO coupons (
        code, type, value, minimum_amount, maximum_discount, 
        usage_limit, expires_at, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      code.toUpperCase(), type, value, minimumAmount || null, 
      maximumDiscount || null, usageLimit || null, expiresAt || null, active
    ]);
    
    res.json({
      success: true,
      message: 'Coupon created successfully',
      coupon: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    } else {
      throw error;
    }
  }
}));

// Update coupon (Admin)
app.put('/api/admin/coupons/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    code, type, value, minimumAmount, maximumDiscount, 
    usageLimit, expiresAt, active 
  } = req.body;
  
  const result = await pool.query(`
    UPDATE coupons SET
      code = $1, type = $2, value = $3, minimum_amount = $4,
      maximum_discount = $5, usage_limit = $6, expires_at = $7, active = $8
    WHERE id = $9
    RETURNING *
  `, [
    code.toUpperCase(), type, value, minimumAmount || null,
    maximumDiscount || null, usageLimit || null, expiresAt || null, active, id
  ]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Coupon updated successfully',
    coupon: result.rows[0]
  });
}));

// Delete coupon (Admin)
app.delete('/api/admin/coupons/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query('DELETE FROM coupons WHERE id = $1 RETURNING *', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Coupon deleted successfully'
  });
}));

// Validate coupon for checkout
app.post('/api/coupons/validate', authenticateToken, asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;
  
  const result = await pool.query(`
    SELECT * FROM coupons 
    WHERE code = $1 AND active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (usage_limit IS NULL OR used_count < usage_limit)
  `, [code.toUpperCase()]);
  
  if (result.rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired coupon code'
    });
  }
  
  const coupon = result.rows[0];
  
  // Check minimum amount
  if (coupon.minimum_amount && orderAmount < coupon.minimum_amount) {
    return res.status(400).json({
      success: false,
      message: `Minimum order amount of $${coupon.minimum_amount} required`
    });
  }
  
  // Calculate discount
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = (orderAmount * coupon.value) / 100;
    if (coupon.maximum_discount) {
      discountAmount = Math.min(discountAmount, coupon.maximum_discount);
    }
  } else {
    discountAmount = coupon.value;
  }
  
  discountAmount = Math.min(discountAmount, orderAmount);
  
  res.json({
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount_amount: discountAmount
    }
  });
}));

module.exports = app;
