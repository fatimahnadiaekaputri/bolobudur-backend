const express = require('express');
const router = express.Router();
const pathController = require('../controllers/pathController');
const verifyApiKey = require('../middleware/verifyApiKey');

router.get('/snap', verifyApiKey, pathController.snapToNearest);
router.get('/shortest', verifyApiKey, pathController.shortestPath);

module.exports = router;