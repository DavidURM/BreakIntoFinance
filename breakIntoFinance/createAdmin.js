const mysql = require('mysql');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config({ path: './sensitive.env' });

// -----------------------------------------
// this is a seperate script to create admin users
// -----------------------------------------


// Database connection configuration
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});

// Connect to the database
db.connect(async (err) => {
    if (err) {
        console.error(" Database connection failed:", err);
        return;
    }

    console.log(" Database Connected Successfully");

    // Admin user details
    const username = "DavidAdmin";
    const email = "admin@example.com";
    const plainPassword = "DavidAdmin"; // remember this password
    const userStatus = "admin";

    // Hash password before inserting the same way users are salted
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // Step 1: Insert into user table
    const userSql = `INSERT INTO user (user_name, email) VALUES (?, ?)`;

    db.query(userSql, [username, email], (err, result) => {
        if (err) {
            console.error(" Error inserting into user table:", err);
            return db.end();
        }

        const userId = result.insertId; // Get the inserted user_id

        console.log(" User entry created in 'user' table with user_id:", userId);

        // Step 2: Insert into login table
        const loginSql = `INSERT INTO login (user_id, user_name, password, user_status) VALUES (?, ?, ?, ?)`;

        db.query(loginSql, [userId, username, hashedPassword, userStatus], (err, result) => {
            if (err) {
                console.error(" Error inserting into login table:", err);
            } else {
                console.log("Admin user inserted successfully into 'login' table!");
            }
            db.end();
        });
    });
});
