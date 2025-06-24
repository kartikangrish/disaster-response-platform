import logger from '../utils/logger.js';

export const setupSocketHandlers = (io) => {
  logger.info('Setting up Socket.IO handlers');

  // Store active monitoring sessions
  const activeMonitoring = new Map();

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join disaster room for real-time updates
    socket.on('join_disaster', (disasterId) => {
      socket.join(`disaster_${disasterId}`);
      logger.info(`Client ${socket.id} joined disaster room: ${disasterId}`);
      
      socket.emit('joined_disaster', {
        disasterId,
        message: `Now monitoring disaster ${disasterId}`
      });
    });

    // Leave disaster room
    socket.on('leave_disaster', (disasterId) => {
      socket.leave(`disaster_${disasterId}`);
      logger.info(`Client ${socket.id} left disaster room: ${disasterId}`);
    });

    // Start real-time monitoring for a disaster
    socket.on('start_monitoring', async (data) => {
      const { disasterId, keywords = [] } = data;
      
      try {
        // Check if monitoring is already active
        if (activeMonitoring.has(disasterId)) {
          socket.emit('monitoring_status', {
            disasterId,
            status: 'already_active',
            message: 'Monitoring already active for this disaster'
          });
          return;
        }

        // Start monitoring
        const monitoringSession = {
          disasterId,
          keywords,
          socketId: socket.id,
          startTime: new Date(),
          active: true
        };

        activeMonitoring.set(disasterId, monitoringSession);

        // Simulate real-time updates
        const interval = setInterval(async () => {
          if (!activeMonitoring.has(disasterId)) {
            clearInterval(interval);
            return;
          }

          try {
            // Emit mock real-time updates
            const mockUpdate = {
              type: 'real_time_update',
              disasterId,
              timestamp: new Date().toISOString(),
              data: {
                new_reports: Math.floor(Math.random() * 3),
                urgent_alerts: Math.floor(Math.random() * 2),
                resources_updated: Math.floor(Math.random() * 2)
              }
            };

            io.to(`disaster_${disasterId}`).emit('disaster_update', mockUpdate);
          } catch (error) {
            logger.error('Real-time monitoring error:', error.message);
          }
        }, 30000); // Update every 30 seconds

        // Store interval reference for cleanup
        monitoringSession.interval = interval;

        socket.emit('monitoring_status', {
          disasterId,
          status: 'started',
          message: 'Real-time monitoring started'
        });

        logger.info(`Started real-time monitoring for disaster ${disasterId}`);

      } catch (error) {
        logger.error('Error starting monitoring:', error.message);
        socket.emit('monitoring_error', {
          disasterId,
          error: error.message
        });
      }
    });

    // Stop real-time monitoring
    socket.on('stop_monitoring', (disasterId) => {
      const session = activeMonitoring.get(disasterId);
      if (session) {
        if (session.interval) {
          clearInterval(session.interval);
        }
        activeMonitoring.delete(disasterId);
        
        socket.emit('monitoring_status', {
          disasterId,
          status: 'stopped',
          message: 'Real-time monitoring stopped'
        });

        logger.info(`Stopped real-time monitoring for disaster ${disasterId}`);
      }
    });

    // Handle disaster creation/update/delete events
    socket.on('disaster_action', async (data) => {
      const { action, disasterId, disaster } = data;
      
      try {
        // Broadcast to all clients monitoring this disaster
        io.to(`disaster_${disasterId}`).emit('disaster_updated', {
          action,
          disasterId,
          disaster,
          timestamp: new Date().toISOString()
        });

        // Log the action
        logger.logDisasterAction(action, disasterId, socket.id, { disaster });

      } catch (error) {
        logger.error('Error handling disaster action:', error.message);
        socket.emit('error', { message: 'Failed to process disaster action' });
      }
    });

    // Handle social media updates
    socket.on('social_media_update', async (data) => {
      const { disasterId, reports } = data;
      
      try {
        io.to(`disaster_${disasterId}`).emit('social_media_updated', {
          disasterId,
          reports,
          timestamp: new Date().toISOString()
        });

        logger.logSocialMediaProcessed('socket', reports.length, disasterId);

      } catch (error) {
        logger.error('Error handling social media update:', error.message);
        socket.emit('error', { message: 'Failed to process social media update' });
      }
    });

    // Handle resource updates
    socket.on('resource_update', async (data) => {
      const { disasterId, resources } = data;
      
      try {
        io.to(`disaster_${disasterId}`).emit('resources_updated', {
          disasterId,
          resources,
          timestamp: new Date().toISOString()
        });

        // Log resource mapping
        resources.forEach(resource => {
          logger.logResourceMapped(resource.name, resource.location_name, disasterId);
        });

      } catch (error) {
        logger.error('Error handling resource update:', error.message);
        socket.emit('error', { message: 'Failed to process resource update' });
      }
    });

    // Handle urgent alerts
    socket.on('urgent_alert', async (data) => {
      const { disasterId, alert } = data;
      
      try {
        // Broadcast urgent alert to all connected clients
        io.emit('urgent_alert', {
          disasterId,
          alert,
          timestamp: new Date().toISOString()
        });

        logger.info(`Urgent alert broadcasted for disaster ${disasterId}: ${alert.message}`);

      } catch (error) {
        logger.error('Error handling urgent alert:', error.message);
        socket.emit('error', { message: 'Failed to process urgent alert' });
      }
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      
      // Clean up any monitoring sessions for this client
      for (const [disasterId, session] of activeMonitoring.entries()) {
        if (session.socketId === socket.id) {
          if (session.interval) {
            clearInterval(session.interval);
          }
          activeMonitoring.delete(disasterId);
          logger.info(`Cleaned up monitoring session for disaster ${disasterId}`);
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Helper function to emit disaster updates
  const emitDisasterUpdate = (disasterId, updateType, data) => {
    io.to(`disaster_${disasterId}`).emit('disaster_update', {
      type: updateType,
      disasterId,
      data,
      timestamp: new Date().toISOString()
    });
  };

  // Helper function to emit global updates
  const emitGlobalUpdate = (updateType, data) => {
    io.emit('global_update', {
      type: updateType,
      data,
      timestamp: new Date().toISOString()
    });
  };

  // Simulate real-time updates
  setInterval(() => {
    // Simulate disaster updates
    io.emit('disaster_update', {
      disaster_id: 'mock-disaster-1',
      data: {
        new_reports: Math.floor(Math.random() * 5) + 1,
        timestamp: new Date().toISOString()
      }
    });

    // Simulate social media updates
    const platforms = ['twitter', 'bluesky', 'instagram'];
    const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    
    io.emit('social_media_update', {
      platform: randomPlatform,
      content: `Mock ${randomPlatform} post about emergency situation`,
      priority: Math.random() > 0.7 ? 'high' : 'medium',
      timestamp: new Date().toISOString()
    });

    // Simulate urgent alerts occasionally
    if (Math.random() > 0.9) {
      io.emit('urgent_alert', {
        alert: {
          type: 'emergency',
          message: 'Urgent: New disaster reported in downtown area!'
        },
        timestamp: new Date().toISOString()
      });
    }
  }, 10000); // Every 10 seconds

  logger.info('Socket.IO handlers setup complete');

  return {
    emitDisasterUpdate,
    emitGlobalUpdate,
    getActiveMonitoring: () => activeMonitoring
  };
}; 