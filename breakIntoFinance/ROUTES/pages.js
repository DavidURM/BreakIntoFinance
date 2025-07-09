const express = require('express');
const {join} = require("node:path");
const req = require("express/lib/request");
const router = express.Router();

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();  // User is authenticated, proceed
    } else {
        res.redirect('/login');  // Redirect if not logged in
    }
};

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Error logging out");
        }
        res.redirect('/index.html'); // Redirect to login page after logout
    });
});

router.get('/forgot_password_page', (req, res) => {
    res.render('forgot_password_page');
});
router.get('/', (req, res) => {
    res.render('index');
});
router.get('/create_account', (req, res) => {
    res.render('create_account');
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/admin', isAuthenticated ,(req , res)=>{
    res.render('admin');
});
router.get('/Home', isAuthenticated, (req, res) => {
    const user = req.session.user;

    if (!user.transactions) {
        user.transactions = []; // empty array if undefined
    }

    // reduce won't throw an error
    const totalSpent = user.transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    res.render('Home', {
        user_name: user.user_name,
        total_spent: totalSpent.toFixed(2)
    });
});

router.get('/finances', isAuthenticated, (req, res) => {
    res.render('finances', { transactions: req.session.user.transactions });
});

router.get('/add_transaction', isAuthenticated, (req, res) => {
    res.render('add_transaction');
});

router.get('/reset_password/', (req, res) => {
    res.render('reset_password');
});

router.get("/user-data", (req, res) => {
    if (req.session.user) {
        return res.json({ success: true, user: req.session.user });
    } else {
        return res.json({ success: false, message: "Not logged in" });
    }
});
module.exports = router;