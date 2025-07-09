const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register',authController.register);
router.post('/loginUser',authController.loginUser);
router.post('/forgot_password',authController.forgotPassword);

router.post('/reset_password',authController.resetPasswordSubmit);



module.exports = router;