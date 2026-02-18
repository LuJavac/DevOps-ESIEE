const GEOCODE_PROVIDER_URL =
  process.env.GEOCODE_PROVIDER_URL || 'https://nominatim.openstreetmap.org/search';
const GEOCODE_COUNTRY_CODES = process.env.GEOCODE_COUNTRY_CODES || 'fr';
const GEOCODE_USER_AGENT =
  process.env.GEOCODE_USER_AGENT || 'sport-pres-de-moi/1.0 (esiee-devops-project)';
const REQUEST_TIMEOUT_MS = 10000;

const parseLimit = (value) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 5;
  }
  return Math.min(parsed, 10);
};

const mapProviderResult = (item) => {
  const lat = Number(item.lat);
  const lon = Number(item.lon);

  return {
    provider: 'nominatim',
    lat,
    lon,
    displayName: item.display_name || '',
    city:
      item.address?.city ||
      item.address?.town ||
      item.address?.village ||
      item.address?.municipality ||
      null,
    postcode: item.address?.postcode || null,
    country: item.address?.country || null,
    importance: item.importance || null
  };
};

const geocodeLocation = async (req, res) => {
  const query = String(req.query.query || '').trim();
  const countryCodes = String(req.query.countrycodes || GEOCODE_COUNTRY_CODES).trim();
  const limit = parseLimit(req.query.limit);

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "query" is required'
    });
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    q: query,
    limit: String(limit),
    countrycodes: countryCodes
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEOCODE_PROVIDER_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'fr',
        'User-Agent': GEOCODE_USER_AGENT
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: `Geocoding provider error (${response.status})`
      });
    }

    const payload = await response.json();
    const results = Array.isArray(payload) ? payload.map(mapProviderResult) : [];

    return res.status(200).json({
      success: true,
      query,
      count: results.length,
      data: results
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Geocoding request timeout'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Geocoding request failed',
      message: error.message
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = {
  geocodeLocation
};
