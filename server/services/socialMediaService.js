import logger from '../utils/logger.js';

class SocialMediaService {
  constructor() {
    this.twitterApiKey = process.env.TWITTER_API_KEY;
    this.blueskyApiKey = process.env.BLUESKY_API_KEY;
  }

  getMockSocialMediaReports(keywords = []) {
    const mockPosts = [
      {
        id: '1',
        platform: 'twitter',
        author: 'citizen1',
        content: 'Major flooding in downtown area! Streets are completely underwater. #flood #emergency',
        location: 'Downtown',
        timestamp: new Date().toISOString(),
        priority: 'high',
        hashtags: ['flood', 'emergency'],
        likes: 45,
        retweets: 12,
        replies: 8
      },
      {
        id: '2',
        platform: 'bluesky',
        author: 'firefighter_jane',
        content: 'Responding to multiple calls in the affected area. Please stay clear of flooded streets.',
        location: 'Downtown',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        priority: 'medium',
        hashtags: ['emergency', 'response'],
        likes: 23,
        retweets: 5,
        replies: 3
      },
      {
        id: '3',
        platform: 'twitter',
        author: 'emergency_services',
        content: 'Emergency shelters now open at Community Center and City Hall. #shelter #help',
        location: 'Community Center',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        priority: 'high',
        hashtags: ['shelter', 'help'],
        likes: 67,
        retweets: 28,
        replies: 15
      }
    ];

    // Filter by keywords if provided
    if (keywords && keywords.length > 0) {
      return mockPosts.filter(post => 
        keywords.some(keyword => 
          post.content.toLowerCase().includes(keyword.toLowerCase()) ||
          post.hashtags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))
        )
      );
    }

    return mockPosts;
  }

  async monitorSocialMedia(disasterId, keywords = []) {
    try {
      logger.info('Monitoring social media for disaster', { disasterId, keywords });
      
      // Simulate real-time monitoring
      const posts = this.getMockSocialMediaReports(keywords);
      
      return {
        posts,
        total: posts.length,
        disasterId,
        keywords
      };
    } catch (error) {
      logger.error('Error monitoring social media:', error);
      return {
        posts: [],
        total: 0,
        error: error.message
      };
    }
  }
}

export default new SocialMediaService(); 