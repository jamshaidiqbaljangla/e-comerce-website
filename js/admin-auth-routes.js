const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts, please try again after 15 minutes'
});

// Session storage (replace with Redis in production)
const sessions = new Map();

module.exports = function(pool) {
    // Middleware to validate admin token
    const validateAdminToken = async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Fetch user role from the database
            const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [decoded.userId]);
            
            if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }

            req.user = decoded;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            res.status(401).json({ error: 'Invalid token' });
        }
    };

    // Login endpoint with rate limiting
    router.post('/login', loginLimiter, async (req, res) => {
        try {
            const { email, password } = req.body;

            // Get user from database
            const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role = \'admin\'', [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create session
        const sessionId = uuidv4();
        const session = {
            userId: user.id,
            created: new Date(),
            invalidated: false
        };
        sessions.set(sessionId, session);

        // Generate tokens
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                sessionId 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { sessionId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const session = sessions.get(decoded.sessionId);

        if (!session || session.invalidated) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Get user from database
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [session.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = result.rows[0];

        // Generate new tokens
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: 'admin',
                sessionId: decoded.sessionId 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const newRefreshToken = jwt.sign(
            { sessionId: decoded.sessionId },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Refresh token expired' });
        }
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Logout endpoint
router.post('/logout', validateAdminToken, (req, res) => {
    if (req.user.sessionId) {
        const session = sessions.get(req.user.sessionId);
        if (session) {
            session.invalidated = true;
        }
    }
    res.status(200).json({ message: 'Logged out successfully' });
});

    // Categories API
    router.get('/categories', validateAdminToken, async (req, res) => {
        try {
            const categories = await pool.query('SELECT * FROM categories ORDER BY name');
            res.json(categories.rows);
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    });

    return {
        router,
        validateAdminToken
    };
};
