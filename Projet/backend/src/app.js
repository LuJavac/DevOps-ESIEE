require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const equipementsRoutes = require('./routes/equipements');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet()); // Sécurité HTTP headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(morgan('dev')); // Logs des requêtes
app.use(express.json()); // Parse JSON body

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API Équipements Sportifs is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/equipements', equipementsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 API endpoint: http://localhost:${PORT}/equipements`);
});

module.exports = app;