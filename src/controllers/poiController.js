const poiModel = require('../models/poiModel');
const db = require('../config/db');

function getPoiType(label) {
    const lower = label.toLowerCase();
  
    if (lower.includes('pintu')) return 'pintu';
    if (lower.includes('arca')) return 'arca';
    if (lower.includes('relief')) return 'relief';
    return 'pintu';
  }

  const createPoi = async (req, res) => {
    try {
      const { label, geom, site_id, floor, radius, area } = req.body;
  
      if (!label) {
        return res.status(400).json({ message: "label is required" });
      }
  
      // Validasi geom wajib ada untuk menentukan lokasi
      if (!geom || !geom.type || !geom.coordinates) {
        return res.status(400).json({ message: "Invalid GeoJSON format" });
      }
  
      // Data dasar untuk semua POI
      const poiData = {
        label,
        latitude: geom.coordinates[1],
        longitude: geom.coordinates[0],
        geom: db.raw(`ST_GeomFromText(?, 4326)`, [
          `POINT(${geom.coordinates[0]} ${geom.coordinates[1]})`,
        ]),
        site_id: site_id || null,
        floor: floor || null,
        radius: radius || null, // default null kalau tidak ada radius
        area: null              // diisi nanti kalau polygon
      };
  
      // Kalau dikirim area polygon (GeoJSON)
      if (area && area.type === "Polygon" && Array.isArray(area.coordinates)) {
        poiData.area = db.raw(`ST_GeomFromGeoJSON(?)`, [JSON.stringify(area)]);
      }
  
      // Simpan ke database
      const [newPoi] = await poiModel.insertPoi(poiData);
  
      res.status(201).json({
        message: "POI created successfully",
        data: newPoi,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error creating poi data" });
    }
};  

const getAllPois = async (req, res) => {
    try {
      const pois = await poiModel.getAllPoi();
  
      const geojson = {
        type: "FeatureCollection",
        features: pois.map((poi) => {
          const poiType = getPoiType(poi.label);
  
          const lokasi =`Lantai ${poi.floor ?? "-"}`

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [poi.longitude, poi.latitude],
            },
            properties: {
              label: poi.label,
              poi: poiType,
              site_id: poi.site_id,
              lokasi, 
            },
          };
        }),
      };
  
  
      res.status(200).json(geojson);
    } catch (error) {
      console.error('Error getting POI:', error);
      res.status(500).json({ message: 'Error retrieving POI data', error });
    }
  };

  const getNearbyPois = async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ message: "lat and lon are required" });
      }
  
      const { floor_detected, pois } = await poiModel.getNearbyPois(lat, lon);
  
      const geojson = {
        type: "FeatureCollection",
        features: pois.map(poi => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [poi.longitude, poi.latitude],
          },
          properties: {
            label: poi.label,
            floor: poi.floor,
            radius: poi.radius,
            distance_m: poi.distance_m,
            site: poi.site_id
              ? {
                  id: poi.site_id,
                  name: poi.site_name,
                  description: poi.site_description,
                  image_url: poi.site_image,
                }
              : null,
          },
        })),
      };
  
      res.status(200).json({
        floor_detected,
        data: geojson,
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error fetching nearby POIs", error });
    }
  };

module.exports = {createPoi, getAllPois, getNearbyPois};