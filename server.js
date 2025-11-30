// server.js - Node.js + Express 5 + SQL Server Backend
require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================
// Middleware
// ==========================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session management
const session = require('express-session');

app.use(session({
    secret: 'mySecretKey123',   // change this later
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
}

// Middleware to check role
function requireRole(role) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role.toLowerCase() === role.toLowerCase()) {
            return next();
        }
        res.status(403).json({ success: false, error: 'Forbidden. Insufficient permissions.' });
    }
}

// ==========================
// SQL Server Configuration
// ==========================
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,               // disable encryption for local dev
        trustServerCertificate: true, // accept self-signed certificate
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

// ==========================
// Initialize Server
// ==========================
async function startServer() {
    try {
        // Connect to database
        pool = await sql.connect(sqlConfig);
        console.log('✅ Connected to SQL Server successfully');

        // ==========================
        // Auth Routes (inline)
        // ==========================
        
        // POST login
        app.post('/api/login', async (req, res) => {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required' });
            }

            try {
                const result = await pool.request()
                    .input('email', sql.VarChar, email)
                    .input('password', sql.VarChar, password)
                    .query('SELECT id, FirstName, LastName, role, CompanyCode FROM Users WHERE email = @email AND password = @password');

                if (result.recordset.length === 0) {
                    return res.status(401).json({ success: false, error: 'Invalid email or password' });
                }

                const user = result.recordset[0];

                // Store user session
                req.session.user = {
                    id: user.id,
                    FirstName: user.FirstName,
                    LastName: user.LastName,
                    role: user.role,
                    CompanyCode: user.CompanyCode
                };

                res.json({ success: true, message: 'Login successful', user: req.session.user });

            } catch (err) {
                console.error('Login error:', err);
                res.status(500).json({ success: false, error: 'Database error' });
            }
        });

        // GET session info
        app.get('/api/session', (req, res) => {
            if (req.session.user) {
                return res.json({ loggedIn: true, user: req.session.user });
            }
            res.json({ loggedIn: false });
        });

        // POST logout
        app.post('/api/logout', (req, res) => {
            req.session.destroy(() => {
                res.json({ success: true, message: 'Logged out successfully' });
            });
        });

        // ==========================
        // Auto-load route files
        // ==========================
        const routesPath = path.join(__dirname, 'routes');
        
        if (fs.existsSync(routesPath)) {
            fs.readdirSync(routesPath).forEach(file => {
                if (file.endsWith('.js')) {
                    const routeSetup = require('./routes/' + file);
                    const routeName = file.replace('.js', '');
                    app.use('/api/' + routeName, routeSetup(pool));
                    console.log(`✅ Loaded route: /api/${routeName}`);
                }
            });
        } else {
            console.warn('⚠️  Routes folder not found');
        }

        // ==========================
        // SPA fallback for Express 5
        // ==========================
        app.get(/.*/, (req, res) => {
            // Skip API routes
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ success: false, error: 'API route not found' });
            }

            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // ==========================
        // Start server
        // ==========================
        app.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Server startup failed:', err.message);
        process.exit(1);
    }
}

// Start the server
startServer();