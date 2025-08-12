const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;
const IS_NETLIFY = process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'netlify';

// Enforce JWT_SECRET in production; provide a safe dev default
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret-change-me' : undefined);
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in production environment.');
}

// Database connection - handle SQLite gracefully
let db = null;
let dbConnected = false;

// Fallback data for when SQLite isn't available
const fallbackData = {
  categories: [
    { id: 1, name: 'Electronics', slug: 'electronics', description: 'Latest electronic gadgets' },
    { id: 2, name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel' },
    { id: 3, name: 'Home & Garden', slug: 'home-garden', description: 'Home improvement items' }
  ],
  collections: [
    { id: 1, name: 'Summer Collection', slug: 'summer-2024', description: 'Hot summer trends' },
    { id: 2, name: 'Winter Collection', slug: 'winter-2024', description: 'Cozy winter essentials' }
  ],
  products: [
    { id: 1, name: 'Smartphone', price: 599.99, category_id: 1, description: 'Latest smartphone', image_url: '/images/phone.jpg' },
    { id: 2, name: 'T-Shirt', price: 29.99, category_id: 2, description: 'Cotton t-shirt', image_url: '/images/tshirt.jpg' },
    { id: 3, name: 'Garden Tools', price: 49.99, category_id: 3, description: 'Essential garden tools', image_url: '/images/tools.jpg' }
  ]
};

// Try to load SQLite only if not on Netlify
if (!IS_NETLIFY) {
  try {
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./database.sqlite', (err) => {
      if (err) {
        console.error('⚠️  SQLite connection failed:', err.message);
        console.log('📦 Using fallback data...');
      } else {
        console.log('✅ Connected to SQLite database');
        dbConnected = true;
        db.run('PRAGMA foreign_keys = ON');
      }
    });
  } catch (sqliteError) {
    console.error('⚠️  SQLite module failed:', sqliteError.message);
    console.log('📦 Using fallback data...');
  }
} else {
  console.log('🌐 Running on Netlify - using fallback data mode');
}

// Helper functions for database operations
const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    if (!dbConnected || !db) {
      resolve(null);
      return;
    }
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    if (!dbConnected || !db) {
      resolve([]);
      return;
    }
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Security and Performance Middleware
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

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3002',
      'http://127.0.0.1:3002',
      'https://ubiquitous-meringue-b2611a.netlify.app',
      'https://gopingo.store'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting with simpler configuration for serverless
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// Static file serving
app.use(express.static(path.join(__dirname), {
  maxAge: IS_NETLIFY ? '1d' : '1h'
}));

// API Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    environment: IS_NETLIFY ? 'netlify' : 'local',
    database: dbConnected ? 'sqlite' : 'fallback',
    timestamp: new Date().toISOString()
  });
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
  try {
    let categories;
    if (dbConnected) {
      categories = await dbAll('SELECT * FROM categories ORDER BY name');
    } else {
      categories = fallbackData.categories;
    }
    
    res.json({
      success: true,
      data: categories,
      source: dbConnected ? 'database' : 'fallback'
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
    if (dbConnected) {
      collections = await dbAll('SELECT * FROM collections ORDER BY name');
    } else {
      collections = fallbackData.collections;
    }
    
    res.json({
      success: true,
      data: collections,
      source: dbConnected ? 'database' : 'fallback'
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
    let products;
    if (dbConnected) {
      products = await dbAll('SELECT * FROM products ORDER BY name LIMIT 20');
    } else {
      products = fallbackData.products;
    }
    
    res.json({
      success: true,
      data: products,
      source: dbConnected ? 'database' : 'fallback'
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
  
  // Check if it's a specific file request
  if (path.extname(req.path)) {
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
  } else {
    // For routes without extensions, serve index.html
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
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Database: ${dbConnected ? 'SQLite connected' : 'Using fallback data'}`);
  });
}

module.exports = app;
