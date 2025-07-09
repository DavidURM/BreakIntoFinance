const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();


const sendEmail = async (option) => {
    // CREATE TRANSPORTER
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        }
    })
    const EmailOptions = {
        from: 'youResetPasswordMommy@gmail.com',
        to: option.email,
        subject: option.subject,
        text: option.text,
    }
    await transporter.sendMail(EmailOptions);
}
module.exports = sendEmail;
