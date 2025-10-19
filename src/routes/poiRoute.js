const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const verifyApiKey = require('../middleware/verifyApiKey');

router.post('/', verifyApiKey, poiController.createPoi);
router.get('/', verifyApiKey, poiController.getAllPois);

module.exports = router;

