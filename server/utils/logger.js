import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'disaster-response-platform' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
      })
    )
  }));
}

// Helper methods for structured logging
logger.logDisasterAction = (action, disasterId, userId, details = {}) => {
  logger.info('Disaster action processed', {
    action,
    disasterId,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logResourceMapped = (resourceName, location, disasterId) => {
  logger.info('Resource mapped', {
    resourceName,
    location,
    disasterId,
    timestamp: new Date().toISOString()
  });
};

logger.logSocialMediaProcessed = (platform, postCount, disasterId) => {
  logger.info('Social media processed', {
    platform,
    postCount,
    disasterId,
    timestamp: new Date().toISOString()
  });
};

logger.logGeocodingRequest = (locationName, coordinates, success) => {
  logger.info('Geocoding request', {
    locationName,
    coordinates,
    success,
    timestamp: new Date().toISOString()
  });
};

logger.logImageVerification = (imageUrl, verificationStatus, disasterId) => {
  logger.info('Image verification', {
    imageUrl,
    verificationStatus,
    disasterId,
    timestamp: new Date().toISOString()
  });
};

export default logger; 