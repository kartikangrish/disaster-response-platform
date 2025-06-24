import express from 'express';
import { supabase, geospatialUtils } from '../config/supabase.js';
import logger from '../utils/logger.js';
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

// GET /resources - List all resources
router.get('/', authenticateUser, async (req, res) => {
  try {
    const mockResources = [
      {
        id: '1',
        name: 'Emergency Medical Team',
        type: 'medical',
        description: 'Mobile medical unit with emergency supplies',
        location_name: 'Downtown Hospital',
        status: 'available',
        quantity: 1,
        coordinates: { lat: 40.7128, lng: -74.0060 },
        owner_id: 'reliefAdmin'
      },
      {
        id: '2',
        name: 'Water Supply',
        type: 'water',
        description: 'Bottled water and purification tablets',
        location_name: 'Community Center',
        status: 'available',
        quantity: 500,
        coordinates: { lat: 40.7589, lng: -73.9851 },
        owner_id: 'reliefAdmin'
      }
    ];

    res.json({
      resources: mockResources,
      total: mockResources.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /resources/nearby - Find resources near a location
router.get('/nearby', authenticateUser, async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const mockResources = [
      {
        id: '1',
        name: 'Emergency Medical Team',
        type: 'medical',
        description: 'Mobile medical unit with emergency supplies',
        location_name: 'Downtown Hospital',
        status: 'available',
        quantity: 1,
        coordinates: { lat: 40.7128, lng: -74.0060 },
        distance: 2.5
      }
    ];

    res.json({
      resources: mockResources,
      total: mockResources.length,
      searchParams: { lat, lng, radius }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /resources/:disasterId - Get resources for a specific disaster
router.get('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { lat, lng, radius = 10000, type } = req.query;

    let query = supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', disasterId);

    // Filter by type if provided
    if (type) {
      query = query.eq('type', type);
    }

    // If coordinates provided, use geospatial query
    if (lat && lng) {
      const nearbyResources = await geospatialUtils.findNearbyResources(
        parseFloat(lat),
        parseFloat(lng),
        parseInt(radius),
        disasterId
      );

      // Filter by type if provided
      const filteredResources = type 
        ? nearbyResources.filter(r => r.type === type)
        : nearbyResources;

      return res.json({
        resources: filteredResources,
        total: filteredResources.length,
        disasterId,
        filters: { lat, lng, radius, type }
      });
    }

    const { data: resources, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching resources:', error);
      return res.status(500).json({ error: 'Failed to fetch resources' });
    }

    res.json({
      resources: resources || [],
      total: resources?.length || 0,
      disasterId,
      filters: { type }
    });

  } catch (error) {
    logger.error('Error in GET /resources/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /resources/:disasterId - Add a new resource to a disaster
router.post('/:disasterId', authenticateUser, async (req, res) => {
  try {
    const { disasterId } = req.params;
    const { name, location_name, type, description, capacity } = req.body;

    if (!name || !location_name || !type) {
      return res.status(400).json({ error: 'Name, location_name, and type are required' });
    }

    // Verify disaster exists
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('id')
      .eq('id', disasterId)
      .single();

    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }

    // Geocode the resource location
    const geocodeResult = await geocodingService.geocode(location_name);

    const resourceId = uuidv4();
    const resource = {
      id: resourceId,
      disaster_id: disasterId,
      name,
      location_name,
      location: geocodeResult.success ? geospatialUtils.createGeographyPoint(
        geocodeResult.coordinates.lat,
        geocodeResult.coordinates.lng
      ) : null,
      type,
      description: description || '',
      capacity: capacity || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('resources')
      .insert(resource)
      .select()
      .single();

    if (error) {
      logger.error('Error creating resource:', error);
      return res.status(500).json({ error: 'Failed to create resource' });
    }

    logger.logResourceMapped(name, location_name, disasterId);

    res.status(201).json({
      resource: data,
      geocoding: geocodeResult,
      message: 'Resource created successfully'
    });

  } catch (error) {
    logger.error('Error in POST /resources/:disasterId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /resources/:id - Update a resource
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location_name, type, description, capacity } = req.body;

    // Get current resource
    const { data: currentResource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
      }
      logger.error('Error fetching resource for update:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch resource' });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (capacity !== undefined) updateData.capacity = capacity;

    // Handle location updates
    if (location_name && location_name !== currentResource.location_name) {
      updateData.location_name = location_name;
      
      // Re-geocode if location changed
      const geocodeResult = await geocodingService.geocode(location_name);
      if (geocodeResult.success) {
        updateData.location = geospatialUtils.createGeographyPoint(
          geocodeResult.coordinates.lat,
          geocodeResult.coordinates.lng
        );
      }
    }

    const { data: updatedResource, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating resource:', error);
      return res.status(500).json({ error: 'Failed to update resource' });
    }

    logger.logResourceMapped(updatedResource.name, updatedResource.location_name, updatedResource.disaster_id);

    res.json({
      resource: updatedResource,
      message: 'Resource updated successfully'
    });

  } catch (error) {
    logger.error('Error in PUT /resources/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /resources/:id - Delete a resource
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get current resource
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Resource not found' });
      }
      logger.error('Error fetching resource for deletion:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch resource' });
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting resource:', error);
      return res.status(500).json({ error: 'Failed to delete resource' });
    }

    res.json({
      message: 'Resource deleted successfully',
      deletedResource: resource
    });

  } catch (error) {
    logger.error('Error in DELETE /resources/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /resources/types - Get available resource types
router.get('/types', authenticateUser, async (req, res) => {
  try {
    const { data: resources, error } = await supabase
      .from('resources')
      .select('type');

    if (error) {
      logger.error('Error fetching resource types:', error);
      return res.status(500).json({ error: 'Failed to fetch resource types' });
    }

    const types = [...new Set(resources.map(r => r.type))].sort();

    res.json({
      types,
      total: types.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in GET /resources/types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 