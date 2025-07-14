import * as express from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express.default();
const PORT = process.env.PORT || 3000;

// JSON parsing middleware
app.use(express.default.json());

// Test endpoint
app.post('/interactions', (req, res) => {
  console.log('Received interaction:', req.body);
  res.json({ type: 1 }); // PONG response
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
});