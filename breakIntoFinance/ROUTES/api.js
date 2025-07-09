const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/user-data", (req, res) => {
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    } else {
        return res.json({ success: false, message: "Not logged in" });
    }
});

router.get('/reset_password/:token', authController.resetPassword);

router.get('/get_reset_username', (req, res) => {
    if (!req.session.resetPassword || !req.session.resetPassword.username || !req.session.resetPassword.token) {
        return res.status(403).json({ message: "Invalid or expired session" });
    }

    return res.json({
        username: req.session.resetPassword.username,
        token: req.session.resetPassword.token
    });
});

module.exports = router;