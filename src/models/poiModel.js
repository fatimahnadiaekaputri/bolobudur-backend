const db = require('../config/db');

const insertPoi = async (poi) => {
    return await db('poi').insert(poi).returning('*');
}

const getAllPoi = async () => {
    const poiData = await db('poi')
      .select('poi_id', 'label', 'latitude', 'longitude', 'geom', 'site_id', 'floor');
    return poiData;
  };

module.exports = { insertPoi, getAllPoi };