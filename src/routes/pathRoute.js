const express = require('express');
const router = express.Router();
const pathController = require('../controllers/pathController');

router.get('/snap', pathController.snapToNearest);
router.get('/shortest', pathController.shortestPath);

module.exports = router;