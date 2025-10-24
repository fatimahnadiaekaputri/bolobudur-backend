const express = require("express");
const router = express.Router();
const BorobudurpediaController = require("../controllers/borobudurpediaController");
// SEARCH category
router.get("/categories/search", BorobudurpediaController.searchCategories);

// SEARCH cultural site (optional filter by categoryId)
router.get("/sites/search", BorobudurpediaController.searchCulturalSites);

// SEARCH gabungan category + cultural_site
router.get("/search", BorobudurpediaController.searchAll);

// GET all categories
router.get("/categories", BorobudurpediaController.getCategories);

// GET category detail (optional)
router.get("/categories/:categoryId", BorobudurpediaController.getCategoryById);

// GET cultural sites per category
router.get("/categories/:categoryId/sites", BorobudurpediaController.getCulturalSitesByCategory);

// GET detail of one cultural site
router.get("/sites/:siteId", BorobudurpediaController.getCulturalSiteById);

module.exports = router;
