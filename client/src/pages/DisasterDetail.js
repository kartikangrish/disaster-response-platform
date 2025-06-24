import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, MapPin, Calendar, User, Edit, ArrowLeft, Activity } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const DisasterDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [disaster, setDisaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);

  useEffect(() => {
    fetchDisaster();
    
    if (socket) {
      socket.on('disaster_update', handleDisasterUpdate);
      socket.emit('join_disaster', { disaster_id: id });
      
      return () => {
        socket.off('disaster_update');
        socket.emit('leave_disaster', { disaster_id: id });
      };
    }
  }, [id, socket]);

  const fetchDisaster = async () => {
    try {
      const response = await axios.get(`/api/disasters/${id}`, {
        headers: { 'x-user-id': user.id }
      });
      
      setDisaster(response.data.disaster);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching disaster:', error);
      toast.error('Failed to load disaster details');
      setLoading(false);
    }
  };

  const handleDisasterUpdate = (data) => {
    if (data.disaster_id === id) {
      setRealTimeUpdates(prev => [{
        type: 'update',
        message: `New reports: ${data.data.new_reports}`,
        timestamp: new Date()
      }, ...prev.slice(0, 9)]);
      
      toast.success(`Real-time update: ${data.data.new_reports} new reports`, {
        icon: '📡'
      });
    }
  };

  const getPriorityColor = (tags) => {
    if (tags?.includes('urgent')) return 'priority-urgent';
    if (tags?.includes('high')) return 'priority-high';
    if (tags?.includes('medium')) return 'priority-medium';
    return 'priority-low';
  };

  const getPriorityText = (tags) => {
    if (tags?.includes('urgent')) return 'Urgent';
    if (tags?.includes('high')) return 'High';
    if (tags?.includes('medium')) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading disaster details...
      </div>
    );
  }

  if (!disaster) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={48} className="text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Disaster not found</h3>
        <p className="text-gray-600 mb-4">The disaster you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate('/disasters')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={16} />
          Back to Disasters
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/disasters')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={16} />
          Back to Disasters
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{disaster.title}</h1>
          <p className="text-gray-600">Disaster Details and Updates</p>
        </div>
        {(user.role === 'admin' || disaster.owner_id === user.id) && (
          <Link to={`/disasters/${id}/edit`} className="btn btn-secondary">
            <Edit size={16} />
            Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Information */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="card-title flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500" />
                  Disaster Information
                </h3>
                <div className={`badge ${getPriorityColor(disaster.tags)}`}>
                  {getPriorityText(disaster.tags)} Priority
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600">{disaster.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin size={16} />
                    Location
                  </h4>
                  <p className="text-gray-600">{disaster.location_name || 'Unknown location'}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    Created
                  </h4>
                  <p className="text-gray-600">
                    {new Date(disaster.created_at).toLocaleDateString()} at{' '}
                    {new Date(disaster.created_at).toLocaleTimeString()}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <User size={16} />
                    Reported By
                  </h4>
                  <p className="text-gray-600">{disaster.owner_id}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                  <div className="badge badge-success">Active</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {disaster.tags?.map((tag, index) => (
                    <span key={index} className="badge badge-info">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

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
                  <p className="text-gray-500">No real-time updates yet</p>
                  <p className="text-sm text-gray-400">Updates will appear here as they come in</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <button className="btn btn-secondary w-full">
                <MapPin size={16} />
                View on Map
              </button>
              <button className="btn btn-info w-full">
                <Activity size={16} />
                Monitor Updates
              </button>
              <button className="btn btn-warning w-full">
                <AlertTriangle size={16} />
                Report Issue
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Statistics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Reports</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resources</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Updates</span>
                <span className="font-medium">{realTimeUpdates.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Age</span>
                <span className="font-medium">
                  {Math.floor((Date.now() - new Date(disaster.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
            </div>
          </div>

          {/* Related Resources */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Related Resources</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">No resources assigned yet</p>
              <button className="btn btn-sm btn-secondary w-full">
                Assign Resources
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">System Information</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID:</span>
                <span className="font-mono">{disaster.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span>{new Date(disaster.updated_at || disaster.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">WebSocket:</span>
                <span className="text-green-500">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisasterDetail; 