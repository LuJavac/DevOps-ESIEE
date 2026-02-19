const express = require('express');

const { geocodeLocation } = require('../controllers/location');

const router = express.Router();

router.get('/geocode', geocodeLocation);

module.exports = router;
