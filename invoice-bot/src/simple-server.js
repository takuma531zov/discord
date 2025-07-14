const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Test endpoint
app.post('/interactions', (req, res) => {
  console.log('✅ Received interaction:', req.body);
  res.json({ type: 1 }); // PONG response
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
});