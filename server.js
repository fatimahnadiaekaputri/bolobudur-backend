const express = require('express');
const app = express();
const PORT = 3000;

// Middleware (opsional)
app.use(express.json());

// Route sederhana
app.get('/', (req, res) => {
  res.send('Hello, Bolobudur Backend!');
});

// Jalankan server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
