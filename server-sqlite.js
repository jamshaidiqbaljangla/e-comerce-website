const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const IS_NETLIFY = process.env.NETLIFY === 'true';

// Enforce JWT_SECRET in production; provide a safe dev default
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret-change-me' : undefined);
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in production environment.');
}

// SQLite Database Connection with fallback
let db = null;
let dbConnected = false;
let fallbackData = null;

// Import fallback data for when database is not available
try {
  fallbackData = require('./fallback-data.js');
} catch (e) {
  console.warn('⚠️  Fallback data not available');
}

let dbPath = path.join(__dirname, 'database.sqlite');
if (IS_NETLIFY) {
  try {
    const tmpDbPath = path.join('/tmp', 'database.sqlite');
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, tmpDbPath);
      } else {
        console.warn('⚠️  No bundled database.sqlite found to copy for Netlify.');
      }
    }
    dbPath = tmpDbPath;
  } catch (e) {
    console.warn('⚠️  Failed to prepare SQLite DB in /tmp:', e.message);
  }
}

// Try to connect to SQLite, but don't fail if it doesn't work
try {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('⚠️  SQLite connection failed:', err.message);
      console.log('📦 Falling back to static data...');
      dbConnected = false;
    } else {
      console.log('✅ Connected to SQLite database');
      dbConnected = true;
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
    }
  });
} catch (sqliteError) {
  console.error('⚠️  SQLite module failed to load:', sqliteError.message);
  console.log('📦 Using fallback data for API responses...');
  dbConnected = false;
}

// Security and Performance Middleware
// Enable trust proxy for Netlify/serverless environments
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
})); // Apply security headers with proper CSP

// Optimize compression
app.use(compression({
  level: 6,                 // Higher compression level
  threshold: 0,             // Compress all responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
})); 

app.use(morgan('combined')); // Log HTTP requests

// Rate limiting to prevent brute-force attacks (configured for serverless)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development when IP is undefined
  skip: (request) => {
    if (process.env.NODE_ENV === 'development' && (!request.ip || request.ip === '::1')) {
      return true;
    }
    return false;
  }
});
app.use('/api/', apiLimiter);

// CORS Configuration

// Caching middleware for static assets
const setCache = function(req, res, next) {
  // Skip caching for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Cache period in seconds
  const period = 60 * 60 * 24 * 7; // 7 days
  
  // Cache static assets
  if (req.method === 'GET') {
    const fileExt = path.extname(req.path).toLowerCase();
    switch(fileExt) {
      case '.css':
      case '.js':
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.svg':
      case '.woff':
      case '.woff2':
      case '.ttf':
        res.setHeader('Cache-Control', `public, max-age=${period}`);
        break;
      default:
        // For HTML and other files, use no-cache for development
        // In production you might want different settings
        res.setHeader('Cache-Control', 'no-cache');
    }
  }
  
  next();
}

// Apply cache middleware
app.use(setCache);
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:5500', 'http://localhost:5500'];
if (process.env.NODE_ENV === 'production' && process.env.PRODUCTION_URL) {
  allowedOrigins.push(process.env.PRODUCTION_URL);
}

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));
// Serving /uploads statically only in local/dev where the folder exists inside the repo
// On Netlify, uploaded files live in /tmp and are served via /api/uploads/:filename
// to avoid relying on static serving from an ephemeral path
// The conditional keeps local DX unchanged
// Create uploads directory if it doesn't exist
const uploadsDir = IS_NETLIFY ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
}
if (!IS_NETLIFY) {
  app.use('/uploads', express.static(uploadsDir));
}

// Public endpoint to serve uploaded files when running on Netlify
app.get('/api/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.sendFile(filePath);
});

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to promisify database operations with fallback
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!dbConnected || !db) {
      reject(new Error('Database not available'));
      return;
    }
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!dbConnected || !db) {
      reject(new Error('Database not available'));
      return;
    }
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!dbConnected || !db) {
      // Handle fallback data for common queries
      if (sql.includes('categories')) {
        resolve(fallbackData?.categories || []);
        return;
      }
      if (sql.includes('collections')) {
        resolve(fallbackData?.collections || []);
        return;
      }
      if (sql.includes('products')) {
        resolve(fallbackData?.products || []);
        return;
      }
      reject(new Error('Database not available and no fallback data'));
      return;
    }
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

// Login endpoint
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  });
}));

// =============================================================================
// ADMIN SETTINGS ENDPOINTS
// =============================================================================

// Get all settings
app.get('/api/admin/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const settings = await dbAll('SELECT * FROM admin_settings ORDER BY key');
  
  // Convert to key-value object
  const settingsObj = {};
  settings.forEach(row => {
    let value = row.value;
    if (row.type === 'number') {
      value = parseFloat(value);
    } else if (row.type === 'boolean') {
      value = value === 'true';
    }
    settingsObj[row.key] = value;
  });
  
  res.json(settingsObj);
}));

// Update settings
app.put('/api/admin/settings', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const settings = req.body;
  
  for (const [key, value] of Object.entries(settings)) {
    await dbRun(`
      INSERT OR REPLACE INTO admin_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `, [key, String(value)]);
  }
  
  res.json({ message: 'Settings updated successfully' });
}));

// =============================================================================
// ADMIN BLOG ENDPOINTS  
// =============================================================================

// Get all blog posts (admin)
app.get('/api/admin/blog/posts', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, category, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT bp.*, u.first_name, u.last_name FROM blog_posts bp LEFT JOIN users u ON bp.author_id = u.id';
  let countQuery = 'SELECT COUNT(*) as count FROM blog_posts bp';
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push('bp.status = ?');
    params.push(status);
  }
  
  if (category) {
    conditions.push('bp.category = ?');
    params.push(category);
  }
  
  if (search) {
    conditions.push('(bp.title LIKE ? OR bp.content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY bp.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [posts, countResult] = await Promise.all([
    dbAll(query, params),
    dbGet(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    posts: posts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.count,
      pages: Math.ceil(countResult.count / limit)
    }
  });
}));

// =============================================================================
// ADMIN PAGES ENDPOINTS
// =============================================================================

// Get all site pages
app.get('/api/admin/pages', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const pages = await dbAll('SELECT * FROM site_pages ORDER BY created_at DESC');
  res.json(pages);
}));

// =============================================================================
// ADMIN NOTIFICATIONS ENDPOINTS
// =============================================================================

// Get all notifications
app.get('/api/admin/notifications', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, read } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM notifications';
  let countQuery = 'SELECT COUNT(*) as count FROM notifications';
  const params = [];
  const conditions = [];
  
  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }
  
  if (read !== undefined) {
    conditions.push('read = ?');
    params.push(read === 'true' ? 1 : 0);
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [notifications, countResult] = await Promise.all([
    dbAll(query, params),
    dbGet(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    notifications: notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.count,
      pages: Math.ceil(countResult.count / limit)
    }
  });
}));

// =============================================================================
// ADMIN PROFILE ENDPOINTS
// =============================================================================

// Get admin profile
app.get('/api/admin/profile', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const user = await dbGet(
    'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json(user);
}));

// Update admin profile
app.put('/api/admin/profile', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { first_name, last_name, email } = req.body;
  
  // Check if email is already taken by another user
  if (email) {
    const existingUser = await dbGet(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already taken' });
    }
  }
  
  await dbRun(`
    UPDATE users SET
      first_name = ?, last_name = ?, email = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [first_name, last_name, email, req.user.id]);
  
  const updatedUser = await dbGet(
    'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  
  res.json({
    message: 'Profile updated successfully',
    user: updatedUser
  });
}));

// =============================================================================
// ADMIN MEDIA ENDPOINTS
// =============================================================================

// Get all media files
app.get('/api/admin/media', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { section } = req.query;
  
  // Get actual files from images and uploads directories
  const imagesDir = path.join(__dirname, 'images');
  const uploadsPath = uploadsDir;
  
  const mediaFiles = {
    hero: [],
    categories: [],
    'feature-banner': [],
    instagram: [],
    products: []
  };
  
  try {
    // Read images directory
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      
      imageFiles.forEach(file => {
        const filePath = `images/${file}`;
        const fileName = file.toLowerCase();
        
        if (fileName.includes('hero')) {
          mediaFiles.hero.push({
            id: `hero-${file}`,
            src: filePath,
            name: file,
            type: 'image',
            size: fs.statSync(path.join(imagesDir, file)).size
          });
        } else if (fileName.includes('category')) {
          mediaFiles.categories.push({
            id: `cat-${file}`,
            src: filePath,
            name: file,
            type: 'image',
            size: fs.statSync(path.join(imagesDir, file)).size
          });
        } else if (fileName.includes('banner')) {
          mediaFiles['feature-banner'].push({
            id: `banner-${file}`,
            src: filePath,
            name: file,
            type: 'image',
            size: fs.statSync(path.join(imagesDir, file)).size
          });
        } else if (fileName.includes('instagram')) {
          mediaFiles.instagram.push({
            id: `insta-${file}`,
            src: filePath,
            name: file,
            type: 'image',
            size: fs.statSync(path.join(imagesDir, file)).size
          });
        } else if (fileName.includes('product')) {
          mediaFiles.products.push({
            id: `prod-${file}`,
            src: filePath,
            name: file,
            type: 'image',
            size: fs.statSync(path.join(imagesDir, file)).size
          });
        }
      });
    }
    
    // Read uploads directory
    if (fs.existsSync(uploadsPath)) {
      const uploadFiles = fs.readdirSync(uploadsPath);
      uploadFiles.forEach(file => {
        // Build a public path that works both locally and on Netlify
        const filePath = IS_NETLIFY ? `/api/uploads/${file}` : `uploads/${file}`;
        mediaFiles.products.push({
          id: `upload-${file}`,
          src: filePath,
          name: file,
          type: 'image',
          size: fs.statSync(path.join(uploadsPath, file)).size
        });
      });
    }
    
  } catch (error) {
    console.error('Error reading media files:', error);
  }
  
  if (section) {
    res.json({ [section]: mediaFiles[section] || [] });
  } else {
    res.json(mediaFiles);
  }
}));

// Import image processor utility
const imageProcessor = require('./utils/image-processor');

// Upload media file with automatic optimization
app.post('/api/admin/media/upload', authenticateToken, requireAdmin, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const { section } = req.body;
  const filePath = path.join(uploadsDir, req.file.filename);
  
  try {
    // Automatically process and optimize the uploaded image
    const processedImage = await imageProcessor.processImage(filePath, {
      createWebP: true,
      createAVIF: true,
      createResponsive: true,
      responsiveSizes: [1200, 800, 400]
    });
    
    // Get file metadata
    const metadata = await sharp(filePath).metadata();
    const toPublic = (p) => IS_NETLIFY ? `/api/uploads/${path.basename(p)}` : path.relative(__dirname, p);
    
    res.json({
      message: 'File uploaded and optimized successfully',
      file: {
        id: `upload-${req.file.filename}`,
        src: IS_NETLIFY ? `/api/uploads/${req.file.filename}` : `uploads/${req.file.filename}`,
        name: req.file.originalname,
        type: 'image',
        size: req.file.size,
        width: metadata.width,
        height: metadata.height,
        section: section,
        formats: {
          original: IS_NETLIFY ? `/api/uploads/${req.file.filename}` : `uploads/${req.file.filename}`,
          webp: processedImage.formats.webp ? toPublic(processedImage.formats.webp) : null,
          avif: processedImage.formats.avif ? toPublic(processedImage.formats.avif) : null
        },
        responsive: processedImage.responsive ? 
          Object.keys(processedImage.responsive.sizes || {}).map(size => ({
            width: parseInt(size),
            src: toPublic(processedImage.responsive.sizes[size]),
            webp: processedImage.responsive.webp ? toPublic(processedImage.responsive.webp[size]) : null
          })) : []
      }
    });
  } catch (error) {
    console.error('Error processing uploaded image:', error);
    // Even if optimization fails, still return the original uploaded file
    res.json({
      message: 'File uploaded successfully (optimization failed)',
      file: {
        id: `upload-${req.file.filename}`,
        src: IS_NETLIFY ? `/api/uploads/${req.file.filename}` : `uploads/${req.file.filename}`,
        name: req.file.originalname,
        type: 'image',
        size: req.file.size,
        section: section,
        error: 'Image optimization failed'
      }
    });
  }
}));

// Delete media file
app.delete('/api/admin/media/:filename', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { filename } = req.params;
  // Basic filename validation to prevent path traversal
  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filePath = path.join(uploadsDir, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}));

// =============================================================================
// ADMIN USERS ENDPOINTS  
// =============================================================================

// Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users';
  let countQuery = 'SELECT COUNT(*) as count FROM users';
  const params = [];
  const conditions = [];
  
  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  
  if (search) {
    conditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [users, countResult] = await Promise.all([
    dbAll(query, params),
    dbGet(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    users: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.count,
      pages: Math.ceil(countResult.count / limit)
    }
  });
}));

// Create new user
app.post('/api/admin/users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { email, first_name, last_name, password, role = 'customer' } = req.body;
  
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Check if user already exists
  const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const result = await dbRun(`
    INSERT INTO users (email, first_name, last_name, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [email, first_name, last_name, hashedPassword, role]);
  
  const newUser = await dbGet(
    'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
    [result.lastID]
  );
  
  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
}));

// Update user
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, first_name, last_name, role } = req.body;
  
  // Check if user exists
  const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check if email is taken by another user
  const existingUser = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
  if (existingUser) {
    return res.status(400).json({ error: 'Email already taken' });
  }
  
  await dbRun(`
    UPDATE users SET
      email = ?, first_name = ?, last_name = ?, role = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [email, first_name, last_name, role, id]);
  
  const updatedUser = await dbGet(
    'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
    [id]
  );
  
  res.json({
    message: 'User updated successfully',
    user: updatedUser
  });
}));

// Delete user
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Prevent deleting yourself
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  
  const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  await dbRun('DELETE FROM users WHERE id = ?', [id]);
  
  res.json({ message: 'User deleted successfully' });
}));

// =============================================================================
// ADMIN COUPONS ENDPOINTS
// =============================================================================

// Get all coupons
app.get('/api/admin/coupons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM coupons';
  let countQuery = 'SELECT COUNT(*) as count FROM coupons';
  const params = [];
  const conditions = [];
  
  if (status) {
    conditions.push('active = ?');
    params.push(status === 'active' ? 1 : 0);
  }
  
  if (search) {
    conditions.push('(code LIKE ? OR description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    const whereClause = ' WHERE ' + conditions.join(' AND ');
    query += whereClause;
    countQuery += whereClause;
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [coupons, countResult] = await Promise.all([
    dbAll(query, params),
    dbGet(countQuery, params.slice(0, -2))
  ]);
  
  res.json({
    coupons: coupons,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.count,
      pages: Math.ceil(countResult.count / limit)
    }
  });
}));

// Create new coupon
app.post('/api/admin/coupons', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { code, type, value, description, min_order_amount, max_uses, expires_at } = req.body;
  
  if (!code || !type || !value) {
    return res.status(400).json({ error: 'Code, type, and value are required' });
  }
  
  // Check if coupon code already exists
  const existingCoupon = await dbGet('SELECT id FROM coupons WHERE code = ?', [code]);
  if (existingCoupon) {
    return res.status(400).json({ error: 'Coupon code already exists' });
  }
  
  const result = await dbRun(`
    INSERT INTO coupons (code, type, value, description, min_order_amount, max_uses, used_count, active, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, datetime('now'), datetime('now'))
  `, [code, type, value, description, min_order_amount, max_uses, expires_at]);
  
  const newCoupon = await dbGet('SELECT * FROM coupons WHERE id = ?', [result.lastID]);
  
  res.status(201).json({
    message: 'Coupon created successfully',
    coupon: newCoupon
  });
}));

// Update coupon
app.put('/api/admin/coupons/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { code, type, value, description, min_order_amount, max_uses, active, expires_at } = req.body;
  
  const coupon = await dbGet('SELECT id FROM coupons WHERE id = ?', [id]);
  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }
  
  await dbRun(`
    UPDATE coupons SET
      code = ?, type = ?, value = ?, description = ?, min_order_amount = ?, 
      max_uses = ?, active = ?, expires_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [code, type, value, description, min_order_amount, max_uses, active ? 1 : 0, expires_at, id]);
  
  const updatedCoupon = await dbGet('SELECT * FROM coupons WHERE id = ?', [id]);
  
  res.json({
    message: 'Coupon updated successfully',
    coupon: updatedCoupon
  });
}));

// Delete coupon
app.delete('/api/admin/coupons/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const coupon = await dbGet('SELECT id FROM coupons WHERE id = ?', [id]);
  if (!coupon) {
    return res.status(404).json({ error: 'Coupon not found' });
  }
  
  await dbRun('DELETE FROM coupons WHERE id = ?', [id]);
  
  res.json({ message: 'Coupon deleted successfully' });
}));

// =============================================================================
// PUBLIC API ENDPOINTS
// =============================================================================

// Get all categories
app.get('/api/categories', asyncHandler(async (req, res) => {
  console.log('📥 Categories endpoint hit');
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name');
    console.log('✅ Categories fetched successfully:', categories);
    res.json(categories);
  } catch (error) {
    console.error('💥 Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}));

// Get all collections
app.get('/api/collections', asyncHandler(async (req, res) => {
  console.log('📥 Collections endpoint hit');
  try {
    const collections = await dbAll('SELECT * FROM collections ORDER BY name');
    console.log('✅ Collections fetched successfully:', collections);
    res.json(collections);
  } catch (error) {
    console.error('💥 Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
}));

// Get all products
app.get('/api/products', asyncHandler(async (req, res) => {
  console.log('📦 Products endpoint hit');
  try {
    const { search, category, collection, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ` AND (name LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (category) {
      query += ` AND category_id = ?`;
      params.push(category);
    }
    
    if (collection) {
      query += ` AND collection_id = ?`;
      params.push(collection);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const products = await dbAll(query, params);
    console.log('✅ Products fetched successfully:', products.length, 'products');
    res.json(products);
  } catch (error) {
    console.error('💥 Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'BINGO API is working!',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'SQLite Connected' : 'Fallback Data',
    status: dbConnected ? 'Connected' : 'Fallback Mode',
    environment: IS_NETLIFY ? 'Netlify' : 'Local'
  });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack for debugging
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Something went wrong!',
    ...(isProd ? {} : { details: err.message })
  });
});

// Catch-all handler for 404 Not Found
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// For local development, start the server directly
// For Netlify deployment, we'll export the app
if (!IS_NETLIFY) {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    const isProduction = process.env.NODE_ENV === 'production';
    const serverUrl = isProduction 
      ? process.env.PRODUCTION_URL || `Server running on port ${PORT}`
      : `http://localhost:${PORT}`;
      
    console.log('✨ BINGO E-Commerce Server Started ✨');
    console.log(`🚀 ${isProduction ? 'Production server' : 'Development server'} running at: ${serverUrl}`);
  console.log(`🗄️  Database: SQLite (${dbPath})`);
    console.log(`👨‍💼 Access admin at: ${serverUrl}/admin.html`);
    if (!isProduction) {
      console.log('👤 Admin login: admin@bingo.com / admin123');
    }
    console.log(`🧪 Test endpoint: ${serverUrl}/api/test`);
    console.log('\n📋 Available API Endpoints:');
    console.log('   - POST   /api/auth/login');
    console.log('   - GET    /api/categories');
    console.log('   - GET    /api/collections');
    console.log('   - GET    /api/products');
    console.log('   - GET    /api/admin/settings');
    console.log('   - PUT    /api/admin/settings');
    console.log('   - GET    /api/admin/blog/posts');
    console.log('   - GET    /api/admin/pages');
    console.log('   - GET    /api/admin/notifications');
    console.log('   - GET    /api/admin/profile');
    console.log('   - PUT    /api/admin/profile');
    console.log('   - GET    /api/admin/media');
    console.log('   - POST   /api/admin/media/upload');
    console.log('   - DELETE /api/admin/media/:filename');
    console.log('   - GET    /api/admin/users');
    console.log('   - POST   /api/admin/users');
    console.log('   - PUT    /api/admin/users/:id');
    console.log('   - DELETE /api/admin/users/:id');
    console.log('   - GET    /api/admin/coupons');
    console.log('   - POST   /api/admin/coupons');
    console.log('   - PUT    /api/admin/coupons/:id');
    console.log('   - DELETE /api/admin/coupons/:id');
    console.log('\n🎯 Ready for development and deployment!');
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed.');
    }
    process.exit(0);
  });
});

// Export the app for serverless functions
module.exports = app;
