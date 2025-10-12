const express = require('express');
const router = express.Router();
const nodeControllers = require('../controllers/nodeController');
const verifyApiKey = require('../middleware/verifyApiKey');

router.post('/', verifyApiKey, nodeControllers.createNode);

module.exports = router;