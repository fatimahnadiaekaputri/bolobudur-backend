const axios = require('axios');
require('dotenv').config(); 

const BASE_URL = 'http://localhost:5000/api/node';
const API_KEY = process.env.API_KEY; 

const coordinates = [
    // ex [longitude, latitude]
    // [110.000, -7.8888],
     

];

async function insertNodes() {
  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    const data = {
      label: `L1_${i + 1}`,
      geom: {
        type: 'Point',
        coordinates: coord
      },
      floor: 1
    };

    try {
      const response = await axios.post(BASE_URL, data, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Success ${data.label}`, response.data);
    } catch (error) {
      console.error(`❌ Error ${data.label}`, error.response?.data || error.message);
    }

    // optional: tambahin delay dikit biar gak spam server
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

insertNodes();
