const searchModel = require('../models/searchModel');

const searchController = async (req, res) => {
    try {
      const { keyword } = req.query;
      if (!keyword || keyword.trim() === '') {
        return res.status(400).json({ success: false, message: 'Keyword is required' });
      }
  
      const data = await searchModel.searchAll(keyword);
  
      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {searchController}