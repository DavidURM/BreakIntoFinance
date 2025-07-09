const dotenv = require('dotenv').config();
const mysql = require('mysql')
const { createResetPasswordToken } = require('../services/userService');
const sendEmail = require('../services/emailService');
const crypto = require('crypto');
const path = require("path");


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
    const insertUserQuery = `
        INSERT INTO user (user_name, email) 
        VALUES (${mysql.escape(username)}, ${mysql.escape(email)}) 
    `; // PATCH CHANGE TO: ? to prevent injection
    db.query(insertUserQuery, (err, result) => {
        if (err) {
            console.error("Error inserting user:", err);
            return response.status(500).send("Server error. Please try again.");
        }

        const userId = result.insertId;

        const insertLoginQuery = `
            INSERT INTO login (user_id, user_name, password) 
            VALUES (${userId}, ${mysql.escape(username)}, ${mysql.escape(password)})
        `;

        db.query(insertLoginQuery, (err) => {
            if (err) {
                console.error("Error inserting login details:", err);
                return response.status(500).send("Server error. Please try again.");
            }

            const insertTransactionQuery = `
                INSERT INTO transactions (user_id, date_transaction, amount, currency, card_number) 
                VALUES (${userId}, NOW(), 0.00, ${mysql.escape(currency)}, ${mysql.escape(cardholder)})
            `;
            db.query(insertTransactionQuery, (err) => {
                if (err) {
                    console.error("Error inserting transaction details:", err);
                    return response.status(500).send("Server error. Please try again.");
                }
                console.log("User registered successfully!");
                return response.redirect('/');
            });
        });
    });
};

exports.loginUser = (request, response) => {
    const { username, password } = request.body;
    console.log(username, password);

    const sql = `SELECT user_name, user_id FROM login WHERE user_name = '${username}' AND password = '${password}'`;

    db.query(sql, async (err, result) => {
        if (err) {
            console.error("Error logging in user:", err);
            return response.status(500).json({ error: "Internal Server Error" });
        }

        if (result.length > 0) {
            console.log("User exists");
            const userId = result[0].user_id;

            try {
                const userTransactions = await getUserData(userId);
                console.log(userTransactions);

                // Store user data in session
                request.session.user = {
                    user_id: userId,
                    user_name: result[0].user_name,
                    transactions: userTransactions
                };

                return response.redirect('/Home'); // Redirect to homepage after login

            } catch (err) {
                console.error("Error fetching user transactions:", err);
                return response.status(500).json({ error: "Error retrieving user data" });
            }
        } else {
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
                     WHERE t.user_id = '${user_id}';`; // NO sanitization, fully open to SQL injection

        console.log("Executing SQL Query: ", sql); // Logging query for debugging (Also a security risk)

        db.query(sql, (err, result) => {
            if (err) {
                return reject(err); // Reject the promise if there's an error
            }

            if (result.length > 0) {
                resolve(result); // Returns all user transactions
            } else {
                resolve(null); // No transactions found
            }
        });
    });
};

exports.forgotPassword = (request, response, next) => {
    // 1. GET USER, VALIDATE USERNAME -> PATCH: Security question on signup, validate user=username=email
    const { username, email } = request.body;
    const sql = `SELECT user_name, user_id FROM login WHERE user_name = '${username}'`;
    const user = db.query(sql, async (err, result) => {
        if (err) {
            console.error("Error validating user:", err);
        }
        if (result.length > 0) {
            const userId = result[0].user_id;
            console.log("User exists");
            let error = false; // if error arises flag used to destroy tokens
            const resetToken = await createResetPasswordToken(userId , error);
            console.log(resetToken);
            const resetURL = `${request.protocol}://${request.get('host')}/api/reset_password/${resetToken}`;
            const message = `Here is the link to reset the  password short memory user: \n\n ${resetURL} \n Now go reset ur password valid for 10 minutes, GO!}`
            try{
                console.log('got here')
                await sendEmail({
                    email: email,
                    subject: "Reset Password Break into finance",
                    text: message,
                });

            }catch(err){
                error = true;
                // flag is set to true, now token gets destroyed in db
                await createResetPasswordToken(userId , error);
                console.log(error)
                return next(err)

            }
            console.log(sendEmail.toLocaleString());
        }
        else{
            console.log("User does not exist");
        }
    });

}

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
