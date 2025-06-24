import logger from '../utils/logger.js';

class GeocodingService {
  constructor() {
    this.googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    this.mapboxKey = process.env.MAPBOX_API_KEY;
    this.cache = new Map();
  }

  async geocode(address) {
    try {
      // Mock geocoding results
      const mockCoordinates = {
        'Downtown Manhattan, NYC': { lat: 40.7589, lng: -73.9851 },
        'Brooklyn Heights, Brooklyn': { lat: 40.6997, lng: -73.9939 },
        'Queens, New York': { lat: 40.7282, lng: -73.7949 },
        'Bronx, New York': { lat: 40.8448, lng: -73.8648 },
        'Staten Island, New York': { lat: 40.5795, lng: -74.1502 }
      };

      const coordinates = mockCoordinates[address] || { lat: 40.7128, lng: -74.0060 };
      
      logger.info('Location geocoded', {
        address,
        coordinates,
        method: 'mock'
      });

      return {
        success: true,
        coordinates,
        formatted_address: address,
        confidence: 0.9
      };
    } catch (error) {
      logger.error('Geocoding error:', error);
      return {
        success: false,
        error: error.message,
        coordinates: null
      };
    }
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    // Simple distance calculation using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

export default new GeocodingService(); 