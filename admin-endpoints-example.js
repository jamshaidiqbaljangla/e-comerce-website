// Additional admin endpoints for server-simple.js
// These would need a cloud database to work in production

// Middleware to verify admin authentication
const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // In production, this would check against cloud database
    if (dbConnected) {
      const admin = await dbGet('SELECT * FROM admins WHERE email = ?', [email]);
      if (admin && await bcrypt.compare(password, admin.password)) {
        const token = jwt.sign(
          { id: admin.id, email: admin.email, role: 'admin' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.json({ success: true, token, user: { id: admin.id, email: admin.email } });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } else {
      // Fallback for demo purposes
      if (email === 'admin@bingo.com' && password === 'admin123') {
        const token = jwt.sign(
          { id: 1, email: 'admin@bingo.com', role: 'admin' },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        res.json({ success: true, token, user: { id: 1, email: 'admin@bingo.com' } });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Add new category
app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    if (dbConnected) {
      const result = await dbRun(
        'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
        [name, slug, description]
      );
      res.json({ success: true, id: result.lastID, message: 'Category added successfully' });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available - changes cannot be saved in production' 
      });
    }
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ success: false, message: 'Failed to add category' });
  }
});

// Add new product
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  try {
    const { name, price, category_id, description, image_url } = req.body;
    
    if (dbConnected) {
      const result = await dbRun(
        'INSERT INTO products (name, price, category_id, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [name, price, category_id, description, image_url]
      );
      res.json({ success: true, id: result.lastID, message: 'Product added successfully' });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available - changes cannot be saved in production' 
      });
    }
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, message: 'Failed to add product' });
  }
});

// Update product
app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category_id, description, image_url } = req.body;
    
    if (dbConnected) {
      await dbRun(
        'UPDATE products SET name = ?, price = ?, category_id = ?, description = ?, image_url = ? WHERE id = ?',
        [name, price, category_id, description, image_url, id]
      );
      res.json({ success: true, message: 'Product updated successfully' });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available - changes cannot be saved in production' 
      });
    }
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (dbConnected) {
      await dbRun('DELETE FROM products WHERE id = ?', [id]);
      res.json({ success: true, message: 'Product deleted successfully' });
    } else {
      res.status(503).json({ 
        success: false, 
        message: 'Database not available - changes cannot be saved in production' 
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});
