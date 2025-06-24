// Mock Supabase configuration for testing
const supabase = {
  from: (table) => ({
    select: (columns) => ({
      eq: (column, value) => ({
        single: async () => {
          // Mock data for disasters
          if (table === 'disasters') {
            return {
              data: {
                id: 'mock-disaster-1',
                title: 'Downtown Flood Emergency',
                description: 'Major flooding in downtown area affecting multiple streets',
                location_name: 'Downtown Manhattan',
                tags: ['flood', 'urgent', 'evacuation'],
                owner_id: 'citizen1',
                created_at: new Date().toISOString(),
                audit_trail: []
              },
              error: null
            };
          }
          return { data: null, error: null };
        }
      }),
      order: (column, options) => ({
        then: async (callback) => {
          // Mock data for disasters list
          if (table === 'disasters') {
            const mockDisasters = [
              {
                id: 'mock-disaster-1',
                title: 'Downtown Flood Emergency',
                description: 'Major flooding in downtown area',
                location_name: 'Downtown Manhattan',
                tags: ['flood', 'urgent'],
                owner_id: 'citizen1',
                created_at: new Date().toISOString()
              },
              {
                id: 'mock-disaster-2',
                title: 'Power Outage',
                description: 'Widespread power outage affecting 10,000 homes',
                location_name: 'Brooklyn',
                tags: ['power', 'high'],
                owner_id: 'firefighter_jane',
                created_at: new Date(Date.now() - 3600000).toISOString()
              }
            ];
            return callback({ data: mockDisasters, error: null });
          }
          return callback({ data: [], error: null });
        }
      }),
      contains: (column, value) => ({
        then: async (callback) => {
          return callback({ data: [], error: null });
        }
      })
    }),
    insert: (data) => ({
      select: () => ({
        single: async () => {
          return { data: data, error: null };
        }
      })
    }),
    update: (data) => ({
      eq: (column, value) => ({
        select: () => ({
          single: async () => {
            return { data: { ...data, id: value }, error: null };
          }
        })
      })
    }),
    delete: () => ({
      eq: (column, value) => ({
        then: async (callback) => {
          return callback({ error: null });
        }
      })
    })
  })
};

const geospatialUtils = {
  findNearbyDisasters: async (lat, lng, radius) => {
    // Mock nearby disasters
    return [
      {
        id: 'mock-disaster-1',
        title: 'Downtown Flood Emergency',
        description: 'Major flooding in downtown area',
        location_name: 'Downtown Manhattan',
        distance: 2.5
      }
    ];
  },
  findNearbyResources: async (lat, lng, radius, disasterId) => {
    // Mock nearby resources
    return [
      {
        id: 'mock-resource-1',
        name: 'Emergency Medical Team',
        type: 'medical',
        distance: 1.2
      }
    ];
  },
  createGeographyPoint: (lat, lng) => {
    return `POINT(${lng} ${lat})`;
  }
};

export { supabase, geospatialUtils }; 