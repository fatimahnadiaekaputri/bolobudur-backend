const nodeModel = require('../models/nodeModel');
const db = require('../config/db')

const createNode = async (req, res) => {
    try {
        const {label, geom, floor} = req.body;

        if (!label || !floor) {
            return res.status(400).json({message: "label and floor are required"})
        };

        if (!geom || !geom.type || !geom.coordinates) {
            return res.status(400).json({message: 'Invalid GeoJSON format'});
        }

        const nodeData = {
            label,
            latitude: geom.coordinates[1],
            longitude: geom.coordinates[0],
            geom: db.raw(`ST_GeomFromText(?, 4326)`, [
              `POINT(${geom.coordinates[0]} ${geom.coordinates[1]})`,
            ]),
            floor,
          };
      
          const [newNode] = await nodeModel.createNode(nodeData);
      
          res.status(201).json(newNode);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Error creating node"});
    }
};

module.exports = {createNode};