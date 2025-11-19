const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;
const dotenv = require('dotenv');
dotenv.config()

const nodeRoutes = require('./src/routes/nodeRoute');
const edgeRoutes = require('./src/routes/edgeRoute');
const pathRoutes = require('./src/routes/pathRoute');
const poiRoutes = require('./src/routes/poiRoute');
const authRoutes = require("./src/routes/authRoutes");
const borobudurpediaRoutes = require("./src/routes/borobudurpediaRoutes");
const searchRoutes = require('./src/routes/searchRoute');

app.use(cors());
app.use(express.json());

app.use('/api/node', nodeRoutes);
app.use('/api/edge', edgeRoutes);
app.use('/api/path', pathRoutes);
app.use('/api/poi', poiRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/borobudurpedia", borobudurpediaRoutes);
app.use('/api/search', searchRoutes);

const db = require('./src/config/db')

// connection test
db.raw('SELECT NOW()')
    .then((result) => {
        console.log('Database connected: ', result.rows || result);
    })
    .catch((err) => {
        console.error('Error connecting to database: ', err);
    });

// routes
app.get('/', (req, res) => {
  res.send('Hello, Bolobudur Backend!');
});

// running server
app.listen(PORT, async () => {
  try {
    await db.raw("SELECT 1+1 AS result");
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
  console.log(`Server running on port ${PORT}`);
});
