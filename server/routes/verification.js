import express from 'express';
import { supabase } from '../config/supabase.js';
import logger from '../utils/logger.js';
import geminiService from '../services/geminiService.js';

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

// POST /verification/:disasterId - Verify an image for a disaster
router.post('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { imageUrl, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Verify disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('title, description')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Verify image using Gemini API
    const verificationResult = await geminiService.verifyImage(imageUrl, disaster.description);

    // Create verification record
    const verificationId = uuidv4();
    const verificationRecord = {
      id: verificationId,
      disaster_id: disasterId,
      image_url: imageUrl,
      description: description || '',
      verification_status: verificationResult.recommendation,
      confidence: verificationResult.confidence,
      authentic: verificationResult.authentic,
      issues: verificationResult.issues,
      verified_by: req.user.id,
      verified_at: new Date().toISOString(),
      source: verificationResult.source
    };

    const { data: savedVerification, error: saveError } = await supabase
      .from('reports')
      .insert(verificationRecord)
      .select()
      .single();

    if (saveError) {
      logger.error('Error saving verification record:', saveError);
      return res.status(500).json({ error: 'Failed to save verification record' });
    }

    logger.logImageVerification(imageUrl, verificationResult.recommendation, disasterId);

    res.status(201).json({
      verification: savedVerification,
      result: verificationResult,
      message: 'Image verification completed'
    });

  } catch (error) {
    logger.error('Error in POST /verification/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /verification/:disasterId - Get verification records for a disaster
router.get('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { status, limit = 50 } = req.query;

    let query = supabase
      .from('reports')
      .select('*')
      .eq('disaster_id', disasterId)
      .not('image_url', 'is', null)
      .order('verified_at', { ascending: false });

    // Filter by verification status
    if (status) {
      query = query.eq('verification_status', status);
    }

    // Apply limit
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: verifications, error } = await query;

    if (error) {
      logger.error('Error fetching verification records:', error);
      return res.status(500).json({ error: 'Failed to fetch verification records' });
    }

    // Group by status
    const statusCounts = verifications.reduce((acc, v) => {
      acc[v.verification_status] = (acc[v.verification_status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      verifications: verifications || [],
      total: verifications?.length || 0,
      disasterId,
      statusCounts,
      filters: { status, limit }
    });

  } catch (error) {
    logger.error('Error in GET /verification/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /verification/:disasterId/:id - Get a specific verification record
router.get('/:disasterId/:id', authenticateUser, async (req, res) => {
  try {
    const { disasterId, id } = req.params;

    const { data: verification, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('disaster_id', disasterId)
      .not('image_url', 'is', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Verification record not found' });
      }
      logger.error('Error fetching verification record:', error);
      return res.status(500).json({ error: 'Failed to fetch verification record' });
    }

    res.json({ verification });

  } catch (error) {
    logger.error('Error in GET /verification/:disasterId/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /verification/:disasterId/:id - Update verification status
router.put('/:disasterId/:id', authenticateUser, async (req, res) => {
  try {
    const { disasterId, id } = req.params;
    const { verification_status, notes } = req.body;

    // Only admins can update verification status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update verification status' });
    }

    // Get current verification record
    const { data: currentVerification, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', id)
      .eq('disaster_id', disasterId)
      .not('image_url', 'is', null)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Verification record not found' });
      }
      logger.error('Error fetching verification record for update:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch verification record' });
    }

    // Prepare update data
    const updateData = {};
    if (verification_status) updateData.verification_status = verification_status;
    if (notes) updateData.notes = notes;
    updateData.updated_by = req.user.id;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedVerification, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating verification record:', error);
      return res.status(500).json({ error: 'Failed to update verification record' });
    }

    logger.logImageVerification(
      updatedVerification.image_url, 
      updatedVerification.verification_status, 
      disasterId
    );

    res.json({
      verification: updatedVerification,
      message: 'Verification status updated successfully'
    });

  } catch (error) {
    logger.error('Error in PUT /verification/:disasterId/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /verification/stats - Get verification statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const mockStats = {
      total: 15,
      verified: 12,
      pending: 2,
      rejected: 1,
      accuracy: 0.93
    };

    res.json({
      statistics: mockStats
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /verification/verify-image - Verify an image
router.post('/verify-image', authenticateUser, async (req, res) => {
  try {
    const { imageUrl, disasterId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Mock verification result
    const mockResult = {
      verified: true,
      confidence: 0.87,
      analysis: 'Image shows flooding in urban area',
      location: 'Downtown area',
      timestamp: new Date().toISOString()
    };

    res.json({
      result: mockResult,
      message: 'Image verification completed'
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 