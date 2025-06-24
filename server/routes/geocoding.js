import express from 'express';
import logger from '../utils/logger.js';
import geminiService from '../services/geminiService.js';
import geocodingService from '../services/geocodingService.js';

const router = express.Router();

// Mock authentication middleware
const authenticateUser = (req, res, next) => {
  const users = {
    'netrunnerX': { id: 'netrunnerX', role: 'admin' },
    'reliefAdmin': { id: 'reliefAdmin', role: 'admin' },
    'citizen1': { id: 'citizen1', role: 'contributor' },
    'firefighter_jane': { id: 'firefighter_jane', role: 'contributor' }
  };

  const userId = req.headers['x-user-id'] || 'netrunnerX';
  const user = users[userId];

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized user' });
  }

  req.user = user;
  next();
};

// POST /geocoding/extract - Extract location from text using Gemini API
router.post('/extract', authenticateUser, async (req, res) => {
  try {
    const { text, description } = req.body;

    if (!text && !description) {
      return res.status(400).json({ error: 'Text or description is required' });
    }

    const inputText = text || description;
    const locationResult = await geminiService.extractLocation(inputText);

    res.json({
      input: inputText,
      result: locationResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /geocoding/extract:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /geocoding/geocode - Convert location name to coordinates
router.post('/geocode', authenticateUser, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const geocodeResult = await geocodingService.geocode(location);

    res.json({
      location,
      result: geocodeResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /geocoding/geocode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /geocoding/reverse - Convert coordinates to address
router.post('/reverse', authenticateUser, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const reverseResult = await geocodingService.reverseGeocode(parseFloat(lat), parseFloat(lng));

    res.json({
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      result: reverseResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /geocoding/reverse:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /geocoding/process - Extract location and geocode in one step
router.post('/process', authenticateUser, async (req, res) => {
  try {
    const { text, description } = req.body;

    if (!text && !description) {
      return res.status(400).json({ error: 'Text or description is required' });
    }

    const inputText = text || description;

    // Step 1: Extract location using Gemini API
    const locationResult = await geminiService.extractLocation(inputText);

    if (!locationResult.location || locationResult.location === 'Unknown location') {
      return res.json({
        input: inputText,
        location: locationResult,
        geocoding: null,
        success: false,
        error: 'No location found in text',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Geocode the extracted location
    const geocodeResult = await geocodingService.geocode(locationResult.location);

    res.json({
      input: inputText,
      location: locationResult,
      geocoding: geocodeResult,
      success: geocodeResult.success,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /geocoding/process:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /geocoding/distance - Calculate distance between two points
router.get('/distance', authenticateUser, async (req, res) => {
  try {
    const { lat1, lng1, lat2, lng2 } = req.query;

    if (!lat1 || !lng1 || !lat2 || !lng2) {
      return res.status(400).json({ error: 'All coordinates (lat1, lng1, lat2, lng2) are required' });
    }

    const distance = geocodingService.calculateDistance(
      parseFloat(lat1),
      parseFloat(lng1),
      parseFloat(lat2),
      parseFloat(lng2)
    );

    res.json({
      point1: { lat: parseFloat(lat1), lng: parseFloat(lng1) },
      point2: { lat: parseFloat(lat2), lng: parseFloat(lng2) },
      distance: {
        kilometers: distance,
        miles: distance * 0.621371,
        meters: distance * 1000
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /geocoding/distance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /geocoding/providers - Get available geocoding providers
router.get('/providers', authenticateUser, async (req, res) => {
  try {
    const providers = [
      {
        name: 'Google Maps',
        available: !!process.env.GOOGLE_MAPS_API_KEY,
        description: 'Google Maps Geocoding API',
        priority: 1
      },
      {
        name: 'Mapbox',
        available: !!process.env.MAPBOX_ACCESS_TOKEN,
        description: 'Mapbox Geocoding API',
        priority: 2
      },
      {
        name: 'OpenStreetMap',
        available: true,
        description: 'OpenStreetMap Nominatim (free)',
        priority: 3
      }
    ];

    res.json({
      providers,
      total: providers.length,
      available: providers.filter(p => p.available).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /geocoding/providers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /geocoding/batch - Process multiple locations
router.post('/batch', authenticateUser, async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: 'Locations array is required' });
    }

    if (locations.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 locations allowed per batch' });
    }

    const results = [];

    for (const location of locations) {
      try {
        const geocodeResult = await geocodingService.geocode(location);
        results.push({
          location,
          success: true,
          result: geocodeResult
        });
      } catch (error) {
        results.push({
          location,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      locations: results,
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in POST /geocoding/batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 