const dotenv = require('dotenv').config();
const mysql = require('mysql')
const { createResetPasswordToken } = require('../services/userService');
const sendEmail = require('../services/emailService');
const crypto = require('crypto');
const path = require("path");
const saltRounds = 10; // add salt rounds to passwords
const bcrypt = require('bcrypt'); // Secure password hashing



// Database connection configuration
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});

exports.register = (request, response) => {
    const { username, email, password, cardholder, currency } = request.body;
    console.log(username, email, password, cardholder, currency);

    bcrypt.hash(password, saltRounds, (err, hashedPassword) => { //
        // Hash password before storing, and salt
        if (err) {
            console.error("Error hashing password:", err);
            return response.status(500).send("Server error.");
        }

        const insertUserQuery = `
            INSERT INTO user (user_name, email) 
            VALUES (?, ?) 
        `; //  Use prepared statements

        db.query(insertUserQuery, [username, email], (err, result) => {
            if (err) {
                console.error("Error inserting user:", err);
                return response.status(500).send("Server error.");
            }

            const userId = result.insertId;

            const insertLoginQuery = `
                INSERT INTO login (user_id, user_name, password) 
                VALUES (?, ?, ?)
            `;

            db.query(insertLoginQuery, [userId, username, hashedPassword], (err) => {
                if (err) {
                    console.error("Error inserting login details:", err);
                    return response.status(500).send("Server error.");
                }

                const insertTransactionQuery = `
                    INSERT INTO transactions (user_id, date_transaction, amount, currency, card_number) 
                    VALUES (?, NOW(), 0.00, ?, ?)
                `;
                db.query(insertTransactionQuery, [userId, currency, cardholder], (err) => {
                    if (err) {
                        console.error("Error inserting transaction details:", err);
                        return response.status(500).send("Server error.");
                    }
                    console.log("User registered successfully!");
                    return response.redirect('/');
                });
            });
        });
    });
};

exports.loginUser = (request, response) => {
    const { username, password } = request.body;
    console.log(username, password);

    const sql = `SELECT user_name, user_id, password, user_status FROM login WHERE user_name = ?`;

    db.query(sql, [username], async (err, result) => { // Use prepared statemen
        if (err) {
            console.error("Error logging in user:", err);
            return response.status(500).json({ error: "Internal Server Error" });
        }

        if (result.length > 0) {
            console.log("User exists");
            const userId = result[0].user_id;
            const hashedPassword = result[0].password;
            const userStatus = result[0].user_status;

            bcrypt.compare(password, hashedPassword, async (err, match) => { // Compare hashed password
                if (err || !match) {
                    console.log(" Invalid credentials");
                    return response.status(401).json({ success: false, message: "Invalid credentials" });
                }

                try {
                    const userTransactions = await getUserData(userId);
                    console.log(userTransactions);

                    request.session.user = {
                        user_id: userId,
                        user_name: result[0].user_name,
                        transactions: userTransactions
                    };

                    if (userStatus === 'admin') { //  Redirect admin to admin page, admin verification
                        return response.redirect('/admin');
                    } else {
                        return response.redirect('/Home');
                    }

                } catch (err) {
                    console.error("Error fetching user transactions:", err);
                    return response.status(500).json({ error: "Error retrieving user data" });
                }
            });
        } else {
            console.log(" Invalid credentials");
            return response.status(401).json({ success: false, message: "Invalid credentials" });
        }
    });
};
const getUserData = (user_id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT
                         t.card_number,
                         t.currency,
                         l.user_name,
                         t.amount,
                         t.date_transaction
                     FROM transactions t
                              JOIN login l ON t.user_id = l.user_id
                     WHERE t.user_id = ?`; //  Use prepared statement

        db.query(sql, [user_id], (err, result) => {
            if (err) {
                return reject(err);
            }

            if (result.length > 0) {
                resolve(result);
            } else {
                resolve(null);
            }
        });
    });
};

exports.forgotPassword = (request, response, next) => {
    const { username, email } = request.body;

    const sql = `
        SELECT u.user_name, u.user_id, u.email, l.password
        FROM user u
                 JOIN login l ON u.user_id = l.user_id
        WHERE u.user_name = ? AND u.email = ?;
    `;
    db.query(sql, [username, email], async (err, result) => {
        if (err) {
            console.error("Error validating user:", err);
            return response.status(500).send("Server error.");
        }

        if (result.length > 0) {
            const userId = result[0].user_id;
            console.log("User exists");
            let error = false;
            const resetToken = await createResetPasswordToken(userId , error);
            console.log(resetToken);
            const resetURL = `${request.protocol}://${request.get('host')}/api/reset_password/${resetToken}`;
            const message = `Here is the link to reset your password: \n\n ${resetURL} \n This link is valid for 10 minutes.`;

            try {
                console.log('Sending email...');
                await sendEmail({
                    email: email,
                    subject: "Reset Password Break into finance",
                    text: message,
                });

            } catch (err) {
                error = true;
                await createResetPasswordToken(userId , error);
                console.log(error);
                return next(err);
            }

            console.log("Reset email sent.");
        } else {
            console.log("User does not exist or email mismatch.");
            return response.status(400).json({ message: "Invalid username or email" });
        }
    });
};

async function DestroyToken(UserToken) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE login 
            SET resetPasswordToken = NULL, resetPasswordExpires = NULL 
            WHERE resetPasswordToken = ?;
        `;
        db.query(sql, [UserToken], (err, result) => {
            if (err) {
                console.error("Error DELETING the reset token:", err);
                return reject(err);
            }
            console.log("Database Update Success: Token deleted, password reset allowed", result);
            resolve(true); // Ensure the Promise resolves
        });
    });
}


exports.resetPasswordPage = (req, response) => {
    return response.redirect('/reset_password/'); // Redirect to reset_password page after token validation

};

exports.resetPassword = async (request, response, next) => {
    // 1. Hash the token received from the request
    const UserToken = crypto.createHash('sha256').update(request.params.token).digest('hex');

    console.log("Received Token for Validation:", UserToken); // Debugging Log

    // 2. Query to get the stored resetPasswordToken, resetPasswordExpires, and username
    const sql = `
        SELECT user_name, resetPasswordToken, resetPasswordExpires
        FROM login
        WHERE resetPasswordToken = ?
          AND resetPasswordExpires > NOW();
    `;

    db.query(sql, [UserToken], async (err, result) => {
        if (err) {
            console.error("Error querying reset token:", err);
            return response.status(500).json({ message: "Server error" });
        }

        // 3. Check if the token exists in the database
        if (result.length === 0) {
            console.log("Invalid or Expired Token:", UserToken); // Debugging Log
            return response.status(400).json({ message: "Invalid or expired reset token" });
        } else {
            console.log("Valid Reset Token:", result[0]); // Debugging Log

            const username = result[0].user_name; // Extract the username

            request.session.resetPassword = {
                username: username,
                token: UserToken, // Store token for later validation
            };

            console.log("Session Data:", request.session.resetPassword);

            // Redirect user to reset password page
            return response.redirect(`/reset_password`);
        }
    });
};
exports.resetPasswordSubmit = async (req, res) => {
    console.log("Received Password Reset Submission:", req.body); // Debugging Log

    const { password } = req.body;

    // 1. Ensure the session has a valid token
    if (!req.session.resetPassword || !req.session.resetPassword.token) {
        return res.status(403).json({ message: "Invalid or expired session" });
    }
    // patch
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // 2. Update the password in the database
    const sql = `UPDATE login SET password = ? WHERE user_name = ?`;
    db.query(sql, [password, req.session.resetPassword.username], async (err, result) => {
        if (err) {
            console.error("Error updating password:", err);
            return res.status(500).json({ message: "Server error" });
        }

        console.log("Password updated for:", req.session.resetPassword.username);

        // 3. Destroy the token in the database after password is changed
        await DestroyToken(req.session.resetPassword.token);

        // 4. Destroy the session after successful password reset
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
            }
            // res.json({ message: "Password successfully reset. You can now log in." });
            return res.redirect(`/`);

        });
    });
};
