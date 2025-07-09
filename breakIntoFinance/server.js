const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: './sensitive.env' });

// Initialize Express application
const app = express();
const PORT = 3000;

// Database connection configuration
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});
const session = require('express-session');

app.use(session({
    secret: 'key123', // Change this in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

app.use('/api', require('./ROUTES/api')); // Register the API routes

// Connect to the database
// Logs success or error message
db.connect((error) => {
    if (error) {
        console.log(error);
        throw error;
    } else {
        console.log('Database Connected on port: ' + PORT + '.......');
    }
});

// Define path for static public directory
const publicDirectory = path.join(__dirname, 'PUBLIC');

// Middleware to serve static files (HTML, CSS, JS)
app.use(express.static(publicDirectory));

// Middleware to parse URL-encoded and JSON payloads
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up view engine to render HTML files using EJS
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', publicDirectory);

// Route handlers
app.use('/auth', require('./ROUTES/auth')); // Authentication routes
app.use('/', require('./ROUTES/pages')); // Page rendering routes
app.use('/api', require('./ROUTES/api')); // Register the new API route

// the following are "dev commands" for offline debugging of files
// to exploit run curl http://IP:PORT/files
app.get('/files', (req, res) => {
    const dirPath = __dirname; // Expose all files from project root
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).send("Error reading files");
        }

        // Return all files and directories
        res.json(files.map(file => file.name));
    });
});


// curl http://localhost:3000/download?file=sensitive.env    --- can expose database credentials
app.get('/download', (req, res) => {
    const filename = req.query.file; // Get filename from query parameter

    if (!filename) {
        return res.status(400).send("Error: No file specified.");
    }

    const filepath = path.join(__dirname, filename); // Construct file path

    // Check if the file exists before attempting to send it
    if (fs.existsSync(filepath)) {
        res.download(filepath); // Send file for download
    } else {
        res.status(404).send("Error: File not found.");
    }
});

// FIX, only allows listing of public files
// const safeDirectory = path.join(__dirname, 'public'); // Only allow files in 'public'
//
// app.get('/download', (req, res) => {
//     const filename = req.query.file;
//     const filepath = path.join(safeDirectory, filename);
//
//     if (filepath.startsWith(safeDirectory) && fs.existsSync(filepath)) {
//         res.download(filepath);
//     } else {
//         res.status(403).send("Access denied.");
//     }
// });
//

// Start the server and listen on specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
