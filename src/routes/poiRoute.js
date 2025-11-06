const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const verifyApiKey = require('../middleware/verifyApiKey');

router.post('/', verifyApiKey, poiController.createPoi);
router.get('/', poiController.getAllPois);
router.get('/nearby', poiController.getNearbyPois);
router.get('/search', poiController.searchPoi)

module.exports = router;

