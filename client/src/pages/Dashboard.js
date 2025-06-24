import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Map, Users, Shield, Activity, Plus, TrendingUp } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const socket = useContext(SocketContext);
  const [stats, setStats] = useState({
    disasters: 0,
    resources: 0,
    socialMediaReports: 0,
    verifications: 0
  });
  const [recentDisasters, setRecentDisasters] = useState([]);
  const [urgentAlerts, setUrgentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    if (socket) {
      socket.on('urgent_alert', handleUrgentAlert);
      socket.on('disaster_update', handleDisasterUpdate);
      
      return () => {
        socket.off('urgent_alert');
        socket.off('disaster_update');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const [disastersRes, resourcesRes, socialRes, verificationRes] = await Promise.all([
        axios.get('/api/disasters', { headers: { 'x-user-id': user.id } }),
        axios.get('/api/resources', { headers: { 'x-user-id': user.id } }),
        axios.get('/api/social-media/mock', { headers: { 'x-user-id': user.id } }),
        axios.get('/api/verification/stats', { headers: { 'x-user-id': user.id } })
      ]);

      setStats({
        disasters: disastersRes.data.total || 0,
        resources: resourcesRes.data.total || 0,
        socialMediaReports: socialRes.data.total || 0,
        verifications: verificationRes.data.statistics?.total || 0
      });

      setRecentDisasters(disastersRes.data.disasters?.slice(0, 5) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleUrgentAlert = (data) => {
    setUrgentAlerts(prev => [data, ...prev.slice(0, 4)]);
    toast.error(`URGENT: ${data.alert.message}`, {
      duration: 10000,
      icon: '🚨'
    });
  };

  const handleDisasterUpdate = (data) => {
    toast.success(`Real-time update: ${data.data.new_reports} new reports`, {
      icon: '📡'
    });
  };

  const StatCard = ({ title, value, icon: Icon, color, link }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} style={{ color }} />
        </div>
      </div>
      {link && (
        <Link to={link} className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          View all →
        </Link>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.id}</p>
        </div>
        <Link to="/disasters/create" className="btn btn-success">
          <Plus size={16} />
          Create Disaster
        </Link>
      </div>

      {/* Urgent Alerts */}
      {urgentAlerts.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" />
              Urgent Alerts
            </h3>
          </div>
          <div className="space-y-2">
            {urgentAlerts.map((alert, index) => (
              <div key={index} className="alert alert-error">
                <strong>🚨 {alert.alert.type}:</strong> {alert.alert.message}
                <span className="text-xs text-gray-500 ml-2">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Disasters"
          value={stats.disasters}
          icon={AlertTriangle}
          color="#ef4444"
          link="/disasters"
        />
        <StatCard
          title="Available Resources"
          value={stats.resources}
          icon={Map}
          color="#3b82f6"
          link="/resources"
        />
        <StatCard
          title="Social Media Reports"
          value={stats.socialMediaReports}
          icon={Users}
          color="#10b981"
          link="/social-media"
        />
        <StatCard
          title="Verifications"
          value={stats.verifications}
          icon={Shield}
          color="#f59e0b"
          link="/verification"
        />
      </div>

      {/* Recent Disasters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Disasters</h3>
            <Link to="/disasters" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentDisasters.length > 0 ? (
              recentDisasters.map((disaster) => (
                <div key={disaster.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{disaster.title}</h4>
                    <p className="text-sm text-gray-600">{disaster.location_name}</p>
                    <div className="flex gap-1 mt-1">
                      {disaster.tags?.map((tag, index) => (
                        <span key={index} className="badge badge-info">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <Link to={`/disasters/${disaster.id}`} className="btn btn-sm">
                    View
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No disasters found</p>
            )}
          </div>
        </div>

        {/* Real-time Activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <Activity size={20} className="text-green-500" />
              Real-time Activity
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">WebSocket connected</span>
              </div>
              <span className="text-xs text-gray-500">Live</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                <span className="text-sm">Monitoring active disasters</span>
              </div>
              <span className="text-xs text-gray-500">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-yellow-500" />
                <span className="text-sm">Image verification ready</span>
              </div>
              <span className="text-xs text-gray-500">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mt-6">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/disasters/create" className="btn btn-success w-full">
            <Plus size={16} />
            Report New Disaster
          </Link>
          <Link to="/resources" className="btn btn-secondary w-full">
            <Map size={16} />
            Manage Resources
          </Link>
          <Link to="/verification" className="btn btn-warning w-full">
            <Shield size={16} />
            Verify Images
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 