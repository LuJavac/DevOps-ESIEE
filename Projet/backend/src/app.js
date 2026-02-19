require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const equipementsRoutes = require('./routes/equipements');
const locationRoutes = require('./routes/location');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API Equipements Sportifs is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/version', (req, res) => {
  res.status(200).json({
    version: process.env.APP_VERSION || '1.1'
  });
});

app.use((req, res, next) => {
  if (req.query.radius_km && !req.query.radius) {
    req.query.radius = req.query.radius_km;
  }
  next();
});

app.use('/equipements', equipementsRoutes);
app.use('/location', locationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;
