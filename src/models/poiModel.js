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
  
      // Query ini mencari 1 POI terdekat dan mengembalikan lantainya
      // Menggunakan ST_Distance karena tabel POI Anda tidak punya kolom 'geom'
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
      return rows[0].floor; // Mengembalikan nomor lantai, misal: 3
  
    } catch (err) {
      console.error("Error in findNearestPoiFloor:", err);
      throw err;
    }
  }

module.exports = { insertPoi, getAllPoi, findNearestPoiFloor };