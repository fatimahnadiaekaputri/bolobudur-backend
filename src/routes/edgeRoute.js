// routes/edgeRoute.js
const express = require('express');
const router = express.Router();
const edgeController = require('../controllers/edgeController');
const verifyApiKey = require('../middleware/verifyApiKey');

router.post('/', verifyApiKey, edgeController.addEdge);
router.get('/geojson', verifyApiKey, edgeController.getEdgesGeoJSON)

module.exports = router;
