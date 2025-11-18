// routes user
const express = require('express');
const router = express.Router();
const { verifyToken, validateTokenDB } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile', verifyToken, validateTokenDB, profileController.getProfile);

router.put(
    '/profile',
    verifyToken,
    validateTokenDB,
    upload.single('image'),
    profileController.updateProfile
);

module.exports = router;
