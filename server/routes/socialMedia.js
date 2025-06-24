import express from 'express';
import logger from '../utils/logger.js';
import socialMediaService from '../services/socialMediaService.js';

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

// GET /social-media/:disasterId - Get social media reports for a disaster
router.get('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [] } = req.query;

    // Parse keywords if provided as comma-separated string
    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    const reports = await socialMediaService.getSocialMediaReports(disasterId, keywordArray);

    res.json(reports);

  } catch (error) {
    logger.error('Error in GET /social-media/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /social-media/mock - Get mock social media reports (for testing)
router.get('/mock', authenticateUser, async (req, res) => {
  try {
    const mockReports = socialMediaService.getMockSocialMediaReports(req.query.keywords);

    res.json({
      reports: mockReports,
      total: mockReports.length,
      source: 'mock',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /social-media/mock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /social-media/:disasterId/monitor - Start real-time monitoring
router.post('/:disasterId/monitor', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [] } = req.body;

    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    // Start monitoring (this would typically be handled by WebSocket)
    const monitoringSession = await socialMediaService.startRealTimeMonitoring(
      disasterId,
      keywordArray,
      (update) => {
        // This callback would emit WebSocket events
        logger.info(`Real-time update for disaster ${disasterId}:`, update);
      }
    );

    res.json({
      message: 'Real-time monitoring started',
      disasterId,
      keywords: keywordArray,
      sessionId: monitoringSession ? 'active' : 'failed'
    });

  } catch (error) {
    logger.error('Error in POST /social-media/:disasterId/monitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /social-media/:disasterId/urgent - Get urgent social media reports
router.get('/:disasterId/urgent', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { keywords = [] } = req.query;

    const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());

    const allReports = await socialMediaService.getSocialMediaReports(disasterId, keywordArray);
    const urgentReports = allReports.reports.filter(report => report.priority === 'urgent');

    res.json({
      reports: urgentReports,
      total: urgentReports.length,
      disasterId,
      priority: 'urgent',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /social-media/:disasterId/urgent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /social-media/sources - Get available social media sources
router.get('/sources', authenticateUser, async (req, res) => {
  try {
    const sources = [
      {
        name: 'Twitter',
        available: !!process.env.TWITTER_BEARER_TOKEN,
        description: 'Real-time Twitter posts and updates'
      },
      {
        name: 'Bluesky',
        available: !!process.env.BLUESKY_IDENTIFIER,
        description: 'Bluesky social media platform'
      },
      {
        name: 'Mock Data',
        available: true,
        description: 'Simulated social media reports for testing'
      }
    ];

    res.json({
      sources,
      total: sources.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /social-media/sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 