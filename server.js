const express = require('express');
const app = express();
const PORT = 5000;
const dotenv = require('dotenv');
dotenv.config()

const nodeRoutes = require('./src/routes/nodeRoute');
const edgeRoutes = require('./src/routes/edgeRoute');

app.use(express.json());

app.use('/api/node', nodeRoutes);
app.use('/api/edge', edgeRoutes)


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
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
