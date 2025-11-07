const poiModel = require('../models/poiModel')
const borobudurpediaModel = require('../services/borobudurpediaService')

const searchAll = async (keyword) => {
    const [poiRows, categoryRows, siteRows] = await Promise.all([
        poiModel.searchPoiByLabel(keyword),
        borobudurpediaModel.searchCategories(keyword),
        borobudurpediaModel.searchCulturalSites(keyword),
    ]);

    const poi = {
        type: "FeatureCollection",
        features: poiRows.map(poi => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [poi.longitude, poi.latitude],
          },
          properties: {
            label: poi.label,
            poi: keyword,
            site_id: poi.site_id,
            lokasi: `Lantai ${poi.floor || 'Tidak diketahui'}`,
            source_type: "poi"
          }
        }))
    };

    const categories = {
        type: "FeatureCollection",
        features: categoryRows.map(cat => ({
          type: "Feature",
          geometry: null,
          properties: {
            label: cat.name,
            poi: keyword,
            description: cat.description || "Tidak ada deskripsi",
            source_type: "category"
          }
        }))
      };

      const sites = {
        type: "FeatureCollection",
        features: siteRows.map(site => ({
          type: "Feature",
          geometry: null,
          properties: {
            label: site.name,
            poi: keyword,
            image_url: site.image_url || "Tidak ada gambar",
            description: site.description,
            source_type: "cultural_site"
          }
        }))
      };

      return {poi, categories, sites}
}

module.exports = {searchAll};