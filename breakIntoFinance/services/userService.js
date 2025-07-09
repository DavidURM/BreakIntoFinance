const crypto = require('crypto');
const dotenv = require('dotenv').config();
const mysql = require('mysql');

// Database connection configuration
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 10,
});

exports.createResetPasswordToken = async (userId, destroyToken) => {
    return new Promise((resolve, reject) => {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
        console.log("Generated Reset Token:", resetToken);
        console.log("Hashed Token for DB:", hashedToken);
        console.log("Expiration Time:", expiryTime);
        if(!destroyToken){ // flag comes as false in case of error
            const sql = `
            UPDATE login 
            SET resetPasswordToken = ?, resetPasswordExpires = ? 
            WHERE user_id = ?;
        `;

            db.query(sql, [hashedToken, expiryTime, userId], (err, result) => {
                if (err) {
                    console.error("Error updating reset token:", err);
                    return reject(err);
                }
                console.log("Database Update Success:", result);
                resolve(resetToken); // Return the plain reset token for emailing
            });
        }
        else{
            const sql = `
            UPDATE login 
            SET resetPasswordToken = NULL, resetPasswordExpires = NULL 
            WHERE user_id = ?;
        `;
            db.query(sql, [userId], (err, result) => {
                if (err) {
                    console.error("Error DELETING the reset token:", err);
                    return reject(err);
                }
                console.log("Database Update Success:", result);
                resolve(true);

            });
        }

    });
};



