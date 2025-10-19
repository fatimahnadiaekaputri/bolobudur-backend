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
        const {label, geom, site_id} = req.body;

        if (!label) {
            return res.status(400).json({message: "label is required"})
        };

        if (!geom || !geom.type || !geom.coordinates) {
            return res.status(400).json({message: 'Invalid GeoJSON format'});
        }

        const poiData = {
            label,
            latitude: geom.coordinates[1],
            longitude: geom.coordinates[0],
            geom: db.raw(`ST_GeomFromText(?, 4326)`, [
                `POINT(${geom.coordinates[0]} ${geom.coordinates[1]})`,
            ]),
            site_id: null || site_id
        };

        const [newPoi] = await poiModel.insertPoi(poiData);

        res.status(201).json(newPoi);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Error creating poi data"})
    }
};

const getAllPois = async (req, res) => {
    try {
      const pois = await poiModel.getAllPoi();
  
      const geojson = {
        type: 'FeatureCollection',
        features: pois.map(poi => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [poi.longitude, poi.latitude],
          },
          properties: {
            label: poi.label,
            poi: getPoiType(poi.label),
            site_id: poi.site_id, 
          },
        })),
      };
  
      res.status(200).json(geojson);
    } catch (error) {
      console.error('Error getting POI:', error);
      res.status(500).json({ message: 'Error retrieving POI data', error });
    }
  };

module.exports = {createPoi, getAllPois};