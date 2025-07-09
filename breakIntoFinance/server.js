const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

dotenv.config({ path: './/sensitive.env' });

const app = express();
const PORT = process.env.HOST_PORT || 3000

// Trust Proxy (for IP detection)
app.set('trust proxy', 1);

// apply API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 1-minute window
    max: 100, // Max 3 requests per IP per minute
    message: { error: "Too many requests to the API. Try again later." }
});

// apply page rate limiter (For Pages & Static Files)
const pageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 100, // Max 10 page loads per IP per 15 minutes
    message: { error: "Too many page requests to the page. Try again later." }
});

//  Apply Limiter *BEFOrE Routes
app.use('/api', apiLimiter);
app.use('/', pageLimiter);

//  Logging Requests for Debugging
app.use((req, res, next) => {
    console.log(`Request from ${req.ip} | Path: ${req.originalUrl} | Time: ${new Date().toISOString()}`);
    next();
});

//  Database Connection
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});

db.connect((error) => {
    if (error) {
        console.log("Database Connection Failed:", error);
        throw error;
    } else {
        console.log('Database Connected Successfully');
    }
});



app.use(session({
    secret: process.env.SESSION_SECRET || 'key123', // Use a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, //
        httpOnly: true, // Prevent XSS attacks
        sameSite: "strict", // CSRF protection
        maxAge: 15 * 60 * 1000, // 15-minute session expiry
    }
}));

// Middleware for JSON & Form Data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve Static Files (After Rate Limiter)
const publicDirectory = path.join(__dirname, 'PUBLIC');
app.use(express.static(publicDirectory));

// Set View Engine
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', publicDirectory);

// Register Routes
app.use('/api', require('./ROUTES/api'));
app.use('/auth', require('./ROUTES/auth'));
app.use('/', require('./ROUTES/pages'));

// Test Route for API Limit
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working" });
});



// server usually kaputs
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT} or http://${getLocalIP()}:${PORT}`);
});

// Function to get your local IP
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    // Defaults to localhost
    return '127.0.0.1';
}