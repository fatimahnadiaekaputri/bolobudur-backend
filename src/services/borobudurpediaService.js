const db = require("../config/db");

class BorobudurpediaService {
  // ===== CATEGORY =====
  static async getAllCategories() {
    return await db("category")
    .select("category_id", "name", "description")
    .orderBy("name", "asc");
  }

  static async getCategoryById(categoryId) {
    return await db("category").where({ category_id: categoryId }).first();
  }

  // ===== CULTURAL SITE =====
  static async getCulturalSitesByCategory(categoryId) {
    return await db("cultural_site")
      .where({ category_id: categoryId })
      .select("site_id", "name", "description", "image_url")
      .orderBy("name", "asc");
  }

  static async getCulturalSiteById(siteId) {
    return await db("cultural_site")
    .where({ site_id: siteId })
    .select("site_id", "name", "description", "image_url")
    .first();
  }

    // ===== SEARCH =====

    static async searchCategories(keyword) {
    return await db("category")
        .select("category_id", "name", "description")
        .whereILike("name", `%${keyword}%`)
        .orWhereILike("description", `%${keyword}%`)
        .orderBy("name", "asc");
    }

    static async searchCulturalSites(keyword, categoryId = null) {
    const query = db("cultural_site")
        .select("site_id", "name", "image_url", "description");

    if (categoryId) query.where("category_id", categoryId);

    return await query
        .andWhereILike("name", `%${keyword}%`)
        .orderBy("name", "asc");
    }

    static async searchAll(keyword) {
        const categories = await db("category")
            .select("category_id", "name", "description")
            .whereILike("name", `%${keyword}%`)
            .orWhereILike("description", `%${keyword}%`)
            .orderBy("name", "asc");

        const sites = await db("cultural_site")
            .select("site_id", "name", "image_url", "description")
            .whereILike("name", `%${keyword}%`)
            .orderBy("name", "asc");

        return { categories, sites };
    }

}

module.exports = BorobudurpediaService;
