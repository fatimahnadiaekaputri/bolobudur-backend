const axios = require("axios");
require('dotenv').config(); 

const API_URL = "http://localhost:5000/api/edge"; 
const API_KEY = process.env.API_KEY

async function insertEdges() {
  const start = 1; //example start node_id
  const end = 2; // example end node_id

  for (let i = start; i <= end; i++) {
    const from_node = i;
    const to_node = i === end ? start : i + 1; // terakhir balik ke end 

    const data = {
      from_node,
      to_node
    };

    try {
      const res = await axios.post(API_URL, data, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      console.log(`✅ Edge inserted: ${from_node} -> ${to_node}`, res.data);
    } catch (err) {
      console.error(
        `❌ Error inserting edge ${from_node} -> ${to_node}:`,
        err.response?.data || err.message
      );
    }
  }
}

insertEdges();
