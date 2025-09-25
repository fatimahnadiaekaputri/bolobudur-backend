const express = require('express');
const app = express();
const PORT = 5000;
const dotenv = require('dotenv');
dotenv.config()


app.use(express.json());

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
