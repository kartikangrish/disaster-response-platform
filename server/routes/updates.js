import express from 'express';
import logger from '../utils/logger.js';
import updatesService from '../services/updatesService.js';

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

// GET /updates - Get official updates
router.get('/', authenticateUser, async (req, res) => {
  try {
    const mockUpdates = [
      {
        id: '1',
        source: 'FEMA',
        title: 'Emergency Declaration Issued',
        content: 'Federal Emergency Management Agency has issued an emergency declaration for the affected area.',
        url: 'https://www.fema.gov/news-release/2024/01/15/emergency-declaration-issued',
        timestamp: new Date().toISOString(),
        priority: 'high'
      },
      {
        id: '2',
        source: 'Red Cross',
        title: 'Shelters Open',
        content: 'Emergency shelters have been opened at local community centers.',
        url: 'https://www.redcross.org/local/ny/nyc/news-and-events/news/shelters-open.html',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        priority: 'medium'
      }
    ];

    res.json({
      updates: mockUpdates,
      total: mockUpdates.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /updates/:disasterId - Get official updates for a disaster
router.get('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [], source } = req.query;

    // Parse keywords if provided as comma-separated string
    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    let updates;
    
    if (source) {
      // Get updates from specific source
      updates = await updatesService.getUpdatesBySource(source);
    } else {
      // Get updates from all sources
      updates = await updatesService.getOfficialUpdates(disasterId, keywordArray);
    }

    res.json(updates);

  } catch (error) {
    logger.error('Error in GET /updates/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /updates/sources - Get available update sources
router.get('/sources', authenticateUser, async (req, res) => {
  try {
    const sources = [
      {
        key: 'fema',
        name: 'FEMA',
        url: 'https://www.fema.gov/disaster',
        description: 'Federal Emergency Management Agency updates',
        available: true
      },
      {
        key: 'redcross',
        name: 'Red Cross',
        url: 'https://www.redcross.org/about-us/news-and-events/news.html',
        description: 'American Red Cross news and updates',
        available: true
      },
      {
        key: 'noaa',
        name: 'NOAA Weather',
        url: 'https://www.weather.gov/',
        description: 'National Weather Service alerts and warnings',
        available: true
      }
    ];

    res.json({
      sources,
      total: sources.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /updates/sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /updates/:disasterId/urgent - Get urgent official updates
router.get('/:disasterId/urgent', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [] } = req.query;

    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    const allUpdates = await updatesService.getOfficialUpdates(disasterId, keywordArray);
    const urgentUpdates = allUpdates.updates.filter(update => update.priority === 'urgent');

    res.json({
      updates: urgentUpdates,
      total: urgentUpdates.length,
      disasterId,
      priority: 'urgent',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /updates/:disasterId/urgent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /updates/:disasterId/source/:sourceKey - Get updates from specific source
router.get('/:disasterId/source/:sourceKey', authenticateUser, async (req, res) => {
  try {
    const { disasterId, sourceKey } = req.params;
    const { keywords = [] } = req.query;

    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    const updates = await updatesService.getUpdatesBySource(sourceKey);
    
    // Filter by keywords if provided
    if (keywordArray.length > 0) {
      updates.updates = updates.updates.filter(update => {
        const text = `${update.title} ${update.description}`.toLowerCase();
        return keywordArray.some(keyword => text.includes(keyword.toLowerCase()));
      });
      updates.total = updates.updates.length;
    }

    res.json({
      ...updates,
      disasterId,
      filters: { keywords: keywordArray }
    });

  } catch (error) {
    logger.error('Error in GET /updates/:disasterId/source/:sourceKey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /updates/:disasterId/monitor - Start monitoring for updates
router.post('/:disasterId/monitor', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [], sources = [] } = req.body;

    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());
    const sourceArray = Array.isArray(sources) ? sources : sources.split(',').filter(s => s.trim());

    // Start monitoring (this would typically be handled by WebSocket)
    const monitoringSession = await updatesService.startUpdatesMonitoring(
      disasterId,
      keywordArray,
      (update) => {
        // This callback would emit WebSocket events
        logger.info(`Official update for disaster ${disasterId}:`, update);
      }
    );

    res.json({
      message: 'Update monitoring started',
      disasterId,
      keywords: keywordArray,
      sources: sourceArray,
      sessionId: monitoringSession ? 'active' : 'failed'
    });

  } catch (error) {
    logger.error('Error in POST /updates/:disasterId/monitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /updates/mock - Get mock official updates (for testing)
router.get('/mock', authenticateUser, async (req, res) => {
  try {
    const { keywords = [] } = req.query;
    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    const mockUpdates = updatesService.getMockOfficialUpdates(keywordArray);

    res.json({
      updates: mockUpdates,
      total: mockUpdates.length,
      source: 'mock',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /updates/mock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 