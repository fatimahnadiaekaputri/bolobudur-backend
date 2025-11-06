const db = require('../config/db');

const insertPoi = async (poi) => {
    return await db('poi').insert(poi).returning('*');
}

const getAllPoi = async () => {
    const poiData = await db('poi')
      .select('poi_id', 'label', 'latitude', 'longitude', 'geom', 'site_id', 'floor');
    return poiData;
  };

  async function findNearestPoiFloor(lat, lon) {
    try {
      const pLon = parseFloat(lon);
      const pLat = parseFloat(lat);
  
      const query = db.raw(`
        SELECT 
          floor
        FROM poi
        ORDER BY 
          ST_Distance(
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          )
        LIMIT 1
      `, [pLon, pLat]);
  
      const { rows } = await query;
      if (rows.length === 0) {
        return null;
      }
      return rows[0].floor; 
  
    } catch (err) {
      console.error("Error in findNearestPoiFloor:", err);
      throw err;
    }
  }

  const getNearbyPois = async (lat, lon) => {
    const pLon = parseFloat(lon);
    const pLat = parseFloat(lat);
  
    try {
      // 1️⃣ Deteksi lantai terdekat
      const floorQuery = await db.raw(`
        WITH 
        input_point AS (
          SELECT 
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography AS geog_point,
            ST_SetSRID(ST_MakePoint(?, ?), 4326) AS geom_point
        ),
        nearest_edge AS (
          SELECT 
            n_from.floor AS from_floor,
            n_to.floor AS to_floor,
            n_from.floor AS floor_detected,
            ST_Distance(
              e.geom::geography,
              (SELECT geog_point FROM input_point)
            ) AS dist_m
          FROM edge e
          JOIN node n_from ON e.from_node = n_from.node_id
          JOIN node n_to ON e.to_node = n_to.node_id
          WHERE n_from.floor = n_to.floor
          ORDER BY e.geom <-> (SELECT geom_point FROM input_point)
          LIMIT 1
        )
        SELECT floor_detected AS floor, dist_m FROM nearest_edge;
      `, [pLon, pLat, pLon, pLat]);
  
      if (floorQuery.rows.length === 0) {
        return { floor_detected: null, zones: [] };
      }
  
      const detectedFloor = floorQuery.rows[0].floor;
  
      // 2️⃣ Ambil POI di lantai tsb
      const poiQuery = await db.raw(`
        SELECT 
          poi.poi_id, -- ✅ tambahkan ini
          poi.zone_name,
          poi.label,
          poi.latitude,
          poi.longitude,
          poi.radius,
          poi.floor,
          cs.name AS site_name,
          cs.description AS site_description,
          cs.image_url AS site_image,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(poi.longitude, poi.latitude), 4326)::geography,
            ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
          ) AS distance_m
        FROM poi
        LEFT JOIN cultural_site cs ON poi.site_id = cs.site_id
        WHERE poi.floor = ?
          AND (
            (poi.radius IS NOT NULL AND ST_Distance(
              ST_SetSRID(ST_MakePoint(poi.longitude, poi.latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
            ) <= poi.radius)
            OR
            (poi.area IS NOT NULL AND ST_Contains(
              poi.area,
              ST_SetSRID(ST_MakePoint(?, ?), 4326)
            ))
          )
        ORDER BY poi.zone_name, distance_m ASC;
      `, [pLon, pLat, detectedFloor, pLon, pLat, pLon, pLat]);
      
  
      const pois = poiQuery.rows;
  
      // 3️⃣ Kelompokkan berdasarkan zone_name
      const groupedZones = pois.reduce((acc, poi) => {
        const zone = poi.zone_name || 'Unknown Zone';
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push({
          poi_id: poi.poi_id,
          label: poi.label,
          latitude: poi.latitude,
          longitude: poi.longitude,
          radius: poi.radius,
          floor: poi.floor,
          distance_m: poi.distance_m,
          cultural_site: {
            name: poi.site_name,
            description: poi.site_description,
            image_url: poi.site_image
          }
        });
        return acc;
      }, {});
  
      // 4️⃣ Ubah ke format array yang rapi
      const zones = Object.entries(groupedZones).map(([zone_name, pois]) => ({
        zone_name,
        pois
      }));
  
      return {
        floor_detected: detectedFloor,
        zones
      };
  
    } catch (err) {
      console.error("Error in getNearbyPois (grouped):", err);
      throw new Error("Failed to fetch nearby POIs");
    }
  };

  const searchPoiByLabel = async (keyword) => {
    const result = await db.raw(`
      SELECT 
        poi.label,
        poi.longitude,
        poi.latitude,
        poi.site_id,
        poi.floor,
        cs.name AS site_name
      FROM poi
      LEFT JOIN cultural_site cs ON poi.site_id = cs.site_id
      WHERE poi.label ILIKE ?
    `, [`%${keyword}%`]);
  
    return result.rows;
  };
  

module.exports = { insertPoi, getAllPoi, findNearestPoiFloor, getNearbyPois, searchPoiByLabel };