import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase, geospatialUtils } from '../config/supabase.js';
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

// GET /disasters - List all disasters with optional filtering
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { tag, lat, lng, radius = 50000 } = req.query;
    let query = supabase.from('disasters').select('*');

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // Filter by location if coordinates provided
    if (lat && lng) {
      const nearbyDisasters = await geospatialUtils.findNearbyDisasters(
        parseFloat(lat), 
        parseFloat(lng), 
        parseInt(radius)
      );
      return res.json({
        disasters: nearbyDisasters,
        total: nearbyDisasters.length,
        filters: { lat, lng, radius, tag }
      });
    }

    const { data: disasters, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching disasters:', error);
      return res.status(500).json({ error: 'Failed to fetch disasters' });
    }

    res.json({
      disasters: disasters || [],
      total: disasters?.length || 0,
      filters: { tag }
    });

  } catch (error) {
    logger.error('Error in GET /disasters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /disasters - Create a new disaster
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, location_name, description, tags = [] } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Extract location using Gemini API if not provided
    let finalLocationName = location_name;
    if (!location_name) {
      const locationResult = await geminiService.extractLocation(description);
      finalLocationName = locationResult.location;
    }

    // Geocode the location
    const geocodeResult = await geocodingService.geocode(finalLocationName);
    
    const disasterId = uuidv4();
    const disaster = {
      id: disasterId,
      title,
      location_name: finalLocationName,
      location: geocodeResult.success ? geospatialUtils.createGeographyPoint(
        geocodeResult.coordinates.lat, 
        geocodeResult.coordinates.lng
      ) : null,
      description,
      tags: Array.isArray(tags) ? tags : [tags],
      owner_id: req.user.id,
      created_at: new Date().toISOString(),
      audit_trail: [{
        action: 'create',
        user_id: req.user.id,
        timestamp: new Date().toISOString(),
        details: { location_extraction: finalLocationName !== location_name }
      }]
    };

    const { data, error } = await supabase
      .from('disasters')
      .insert(disaster)
      .select()
      .single();

    if (error) {
      logger.error('Error creating disaster:', error);
      return res.status(500).json({ error: 'Failed to create disaster' });
    }

    logger.logDisasterAction('create', disasterId, req.user.id, { title, location_name: finalLocationName });
    
    res.status(201).json({
      disaster: data,
      geocoding: geocodeResult,
      message: 'Disaster created successfully'
    });

  } catch (error) {
    logger.error('Error in POST /disasters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /disasters/:id - Get a specific disaster
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: disaster, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      logger.error('Error fetching disaster:', error);
      return res.status(500).json({ error: 'Failed to fetch disaster' });
    }

    res.json({ disaster });

  } catch (error) {
    logger.error('Error in GET /disasters/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /disasters/:id - Update a disaster
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, location_name, description, tags } = req.body;

    // Get current disaster
    const { data: currentDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      logger.error('Error fetching disaster for update:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch disaster' });
    }

    // Check ownership (only owner or admin can update)
    if (currentDisaster.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this disaster' });
    }

    // Prepare update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (tags) updateData.tags = Array.isArray(tags) ? tags : [tags];

    // Handle location updates
    if (location_name && location_name !== currentDisaster.location_name) {
      updateData.location_name = location_name;
      
      // Re-geocode the location
      const geocodeResult = await geocodingService.geocode(location_name);
      if (geocodeResult.success) {
        updateData.location = geospatialUtils.createGeographyPoint(
          geocodeResult.coordinates.lat,
          geocodeResult.coordinates.lng
        );
      }
    }

    // Add to audit trail
    const auditEntry = {
      action: 'update',
      user_id: req.user.id,
      timestamp: new Date().toISOString(),
      details: { changes: Object.keys(updateData) }
    };

    updateData.audit_trail = [...(currentDisaster.audit_trail || []), auditEntry];
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('disasters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating disaster:', error);
      return res.status(500).json({ error: 'Failed to update disaster' });
    }

    logger.logDisasterAction('update', id, req.user.id, { changes: Object.keys(updateData) });
    
    res.json({
      disaster: data,
      message: 'Disaster updated successfully'
    });

  } catch (error) {
    logger.error('Error in PUT /disasters/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /disasters/:id - Delete a disaster
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current disaster
    const { data: currentDisaster, error: fetchError } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      logger.error('Error fetching disaster for deletion:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch disaster' });
    }

    // Check ownership (only owner or admin can delete)
    if (currentDisaster.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this disaster' });
    }

    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting disaster:', error);
      return res.status(500).json({ error: 'Failed to delete disaster' });
    }

    logger.logDisasterAction('delete', id, req.user.id, { title: currentDisaster.title });
    
    res.json({
      message: 'Disaster deleted successfully',
      deletedDisaster: currentDisaster
    });

  } catch (error) {
    logger.error('Error in DELETE /disasters/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /disasters/:id/audit - Get audit trail for a disaster
router.get('/:id/audit', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: disaster, error } = await supabase
      .from('disasters')
      .select('audit_trail')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Disaster not found' });
      }
      logger.error('Error fetching disaster audit trail:', error);
      return res.status(500).json({ error: 'Failed to fetch audit trail' });
    }

    res.json({
      disasterId: id,
      auditTrail: disaster.audit_trail || []
    });

  } catch (error) {
    logger.error('Error in GET /disasters/:id/audit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 