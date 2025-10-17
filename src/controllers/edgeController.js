// controllers/edgeController.js
const { createEdge } = require('../models/edgeModel');

const addEdge = async (req, res) => {
  try {
    const { from_node, to_node, type, height } = req.body;

    if (!from_node || !to_node) {
      return res.status(400).json({ message: 'from_node and to_node are required' });
    }

    if (!type) {
      return res.status(400).json({message: 'type is required (stair or road)'})
    }

    const validTypes = ['road', 'stair'];
    if (!validTypes.includes(type.toLowerCase())) {
      return res.status(400).json({ 
        message: "Invalid type. Only 'road' or 'stair' are allowed." 
      });
    }

    const newEdge = await createEdge(from_node, to_node, type.toLowerCase(), height);
    res.status(201).json(newEdge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addEdge };
