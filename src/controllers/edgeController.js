// controllers/edgeController.js
const { createEdge } = require('../models/edgeModel');

const addEdge = async (req, res) => {
  try {
    const { from_node, to_node } = req.body;

    if (!from_node || !to_node) {
      return res.status(400).json({ message: 'from_node and to_node are required' });
    }

    const newEdge = await createEdge(from_node, to_node);
    res.status(201).json(newEdge);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addEdge };
