const axios = require("axios");
require('dotenv').config(); 

const API_URL = "http://localhost:5000/api/edge"; 
const API_KEY = process.env.API_KEY

async function insertEdges() {
  const start = 1249; //example start node_id
  const end = 1252; // example end node_id

  for (let i = start; i <= end; i++) {
    const from_node = i;
    const to_node = i === end ? start : i + 1; // terakhir balik ke end 

    const data = {
      from_node,
      to_node,
      type: "road"
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

async function insertStairEdges() {
  const stairEdges = [
    { from_node: 1233, to_node: 1240, height: 0 }, // lantai 1 ke lantai 2 utara
    { from_node: 1238, to_node: 1244, height: 0 }, // lantai 2 ke lantai 3 
    // { from_node: 1111, to_node: 1139, height: 3.4 }, // lantai 3 ke lantai 4 
    // { from_node: 1139, to_node: 1163, height: 3.4 }, // lantai 4 ke lantai 5 
    // { from_node: 1163, to_node: 1196, height: 3.4 }, // lantai 5 ke lantai 6 
    // { from_node: 1196, to_node: 1226, height: 3.4 } // lantai 6 ke lantai 7 
  ];

  for (const edge of stairEdges) {
    const data = {
      from_node: edge.from_node,
      to_node: edge.to_node,
      type: "road",
      height: edge.height
    };

    try {
      const res = await axios.post(API_URL, data, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      });
      console.log(`🪜 Stair edge inserted: ${edge.from_node} -> ${edge.to_node}`);
    } catch (err) {
      console.error(
        `❌ Error inserting stair edge ${edge.from_node} -> ${edge.to_node}:`,
        err.response?.data || err.message
      );
    }
  }
}


insertEdges();

// insertStairEdges();
