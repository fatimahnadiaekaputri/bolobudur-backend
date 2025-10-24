const BorobudurpediaService = require("../services/borobudurpediaService");

const BorobudurpediaController = {
  // GET all categories
  getCategories: async (req, res) => {
    try {
      const data = await BorobudurpediaService.getAllCategories();
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // GET category detail (optional)
  getCategoryById: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const data = await BorobudurpediaService.getCategoryById(categoryId);
      if (!data) return res.status(404).json({ message: "Category not found" });
      res.status(200).json(data);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // GET cultural sites by category
  getCulturalSitesByCategory: async (req, res) => {
    try {
      const { categoryId } = req.params;
      const sites = await BorobudurpediaService.getCulturalSitesByCategory(categoryId);
      res.status(200).json(sites);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // GET cultural site detail
  getCulturalSiteById: async (req, res) => {
    try {
      const { siteId } = req.params;
      const site = await BorobudurpediaService.getCulturalSiteById(siteId);
      if (!site) return res.status(404).json({ message: "Cultural site not found" });
      res.status(200).json(site);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // 🔍 SEARCH CATEGORY
    searchCategories: async (req, res) => {
        try {
            const { q } = req.query; // ambil dari ?q= di URL
            if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });
            const result = await BorobudurpediaService.searchCategories(q);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // 🔍 SEARCH CULTURAL SITE
    searchCulturalSites: async (req, res) => {
        try {
            const { q, categoryId } = req.query; // bisa filter per kategori
            if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });
            const result = await BorobudurpediaService.searchCulturalSites(q, categoryId);
            res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    searchAll: async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Query parameter 'q' is required" });
    }

    const result = await BorobudurpediaService.searchAll(q);
        res.status(200).json(result);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },


};

module.exports = BorobudurpediaController;
