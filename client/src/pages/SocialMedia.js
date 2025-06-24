import React, { useState, useEffect, useContext } from 'react';
import { Twitter, MessageCircle, TrendingUp, Filter, Search, Activity, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const SocialMedia = () => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);

  const platforms = ['twitter', 'bluesky', 'instagram', 'facebook'];
  const priorities = ['high', 'medium', 'low'];

  useEffect(() => {
    fetchSocialMediaPosts();
    
    if (socket) {
      socket.on('social_media_update', handleSocialMediaUpdate);
      
      return () => {
        socket.off('social_media_update');
      };
    }
  }, [socket]);

  const fetchSocialMediaPosts = async () => {
    try {
      const response = await axios.get('/api/social-media/mock', {
        headers: { 'x-user-id': user.id }
      });
      
      setPosts(response.data.posts || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching social media posts:', error);
      toast.error('Failed to load social media posts');
      setLoading(false);
    }
  };

  const handleSocialMediaUpdate = (data) => {
    setRealTimeUpdates(prev => [{
      type: 'new_post',
      platform: data.platform,
      message: `New ${data.platform} post: ${data.content.substring(0, 50)}...`,
      timestamp: new Date()
    }, ...prev.slice(0, 9)]);
    
    setPosts(prev => [data, ...prev]);
    
    if (data.priority === 'high') {
      toast.error(`🚨 High priority ${data.platform} post detected!`, {
        duration: 8000,
        icon: '🚨'
      });
    } else {
      toast.success(`New ${data.platform} post received`, {
        icon: '📱'
      });
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = !selectedPlatform || post.platform === selectedPlatform;
    const matchesPriority = !selectedPriority || post.priority === selectedPriority;
    
    return matchesSearch && matchesPlatform && matchesPriority;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-urgent';
      case 'medium': return 'priority-high';
      case 'low': return 'priority-low';
      default: return 'priority-low';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'twitter': return <Twitter size={16} className="text-blue-400" />;
      case 'bluesky': return <MessageCircle size={16} className="text-blue-600" />;
      case 'instagram': return <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded"></div>;
      case 'facebook': return <div className="w-4 h-4 bg-blue-600 rounded"></div>;
      default: return <MessageCircle size={16} />;
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case 'twitter': return 'Twitter';
      case 'bluesky': return 'Bluesky';
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      default: return platform;
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading social media posts...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Social Media Monitoring</h1>
          <p className="text-gray-600">Real-time social media posts and disaster reports</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live Monitoring
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Search</label>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="form-label">Platform</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="form-select"
            >
              <option value="">All Platforms</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{getPlatformName(platform)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Priority</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="form-select"
            >
              <option value="">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Actions</label>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedPlatform('');
                setSelectedPriority('');
              }}
              className="btn btn-secondary w-full"
            >
              <Filter size={16} />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Social Media Posts */}
          <div className="space-y-4">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <div key={post.id} className="card">
                  <div className="card-header">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPlatformIcon(post.platform)}
                        <div>
                          <h3 className="font-medium">{post.author}</h3>
                          <p className="text-sm text-gray-500">
                            {getPlatformName(post.platform)} • {new Date(post.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className={`badge ${getPriorityColor(post.priority)}`}>
                        {post.priority} priority
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-gray-700 mb-3">{post.content}</p>
                    {post.location && (
                      <p className="text-sm text-gray-500">
                        <strong>Location:</strong> {post.location}
                      </p>
                    )}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.hashtags.map((tag, index) => (
                          <span key={index} className="badge badge-info">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>❤️ {post.likes || 0}</span>
                      <span>🔄 {post.retweets || 0}</span>
                      <span>💬 {post.replies || 0}</span>
                    </div>
                    <button className="btn btn-sm btn-secondary">
                      <AlertTriangle size={14} />
                      Flag
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
                <p className="text-gray-600">
                  {searchTerm || selectedPlatform || selectedPriority ? 'Try adjusting your search criteria.' : 'Social media posts will appear here as they are detected.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Real-time Updates */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <Activity size={20} className="text-green-500" />
                Real-time Updates
              </h3>
            </div>
            
            <div className="space-y-3">
              {realTimeUpdates.length > 0 ? (
                realTimeUpdates.map((update, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">{update.message}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {update.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No updates yet</p>
                  <p className="text-sm text-gray-400">Real-time updates will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Platform Statistics</h3>
            </div>
            <div className="space-y-3">
              {platforms.map(platform => {
                const platformPosts = posts.filter(p => p.platform === platform);
                const highPriority = platformPosts.filter(p => p.priority === 'high').length;
                
                return (
                  <div key={platform} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(platform)}
                      <span className="text-sm">{getPlatformName(platform)}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{platformPosts.length}</div>
                      {highPriority > 0 && (
                        <div className="text-xs text-red-600">{highPriority} urgent</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Priority Breakdown</h3>
            </div>
            <div className="space-y-3">
              {priorities.map(priority => {
                const priorityPosts = posts.filter(p => p.priority === priority);
                
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(priority).replace('badge-', 'bg-')}`}></div>
                      <span className="text-sm capitalize">{priority}</span>
                    </div>
                    <span className="text-sm font-medium">{priorityPosts.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monitoring Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">WebSocket</span>
                <span className="text-green-500 text-sm">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Update</span>
                <span className="text-sm">
                  {realTimeUpdates.length > 0 
                    ? realTimeUpdates[0].timestamp.toLocaleTimeString()
                    : 'None'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Posts</span>
                <span className="text-sm font-medium">{posts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMedia; 