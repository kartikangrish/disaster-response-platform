import React, { useState, useEffect, useContext } from 'react';
import { MapPin, Plus, Search, Filter, Edit, Trash2, Eye, Navigation } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Resources = () => {
  const { user } = useContext(AuthContext);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [radius, setRadius] = useState(50);
  const [userLocation, setUserLocation] = useState(null);

  const resourceTypes = [
    'medical', 'food', 'water', 'shelter', 'transportation', 'communication',
    'power', 'equipment', 'personnel', 'vehicle', 'supplies'
  ];

  const resourceStatuses = ['available', 'in_use', 'maintenance', 'deployed'];

  useEffect(() => {
    fetchResources();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const fetchResources = async () => {
    try {
      const response = await axios.get('/api/resources', {
        headers: { 'x-user-id': user.id }
      });
      
      setResources(response.data.resources || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
      setLoading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await axios.delete(`/api/resources/${resourceId}`, {
        headers: { 'x-user-id': user.id }
      });
      
      toast.success('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const searchNearby = async () => {
    if (!userLocation) {
      toast.error('Please allow location access to search nearby');
      return;
    }

    try {
      const response = await axios.get('/api/resources/nearby', {
        params: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          radius: radius
        },
        headers: { 'x-user-id': user.id }
      });
      
      setResources(response.data.resources || []);
      toast.success(`Found ${response.data.resources?.length || 0} resources within ${radius}km`);
    } catch (error) {
      console.error('Error searching nearby:', error);
      toast.error('Failed to search nearby resources');
    }
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.location_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || resource.type === selectedType;
    const matchesStatus = !selectedStatus || resource.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'in_use': return 'badge-warning';
      case 'maintenance': return 'badge-danger';
      case 'deployed': return 'badge-info';
      default: return 'badge-secondary';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'medical': return '🏥';
      case 'food': return '🍽️';
      case 'water': return '💧';
      case 'shelter': return '🏠';
      case 'transportation': return '🚗';
      case 'communication': return '📱';
      case 'power': return '⚡';
      case 'equipment': return '🔧';
      case 'personnel': return '👥';
      case 'vehicle': return '🚐';
      case 'supplies': return '📦';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading resources...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
          <p className="text-gray-600">Manage and locate emergency resources</p>
        </div>
        <button className="btn btn-success">
          <Plus size={16} />
          Add Resource
        </button>
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
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="form-label">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
            >
              <option value="">All Types</option>
              {resourceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
            >
              <option value="">All Status</option>
              {resourceStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Actions</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('');
                  setSelectedStatus('');
                }}
                className="btn btn-secondary flex-1"
              >
                <Filter size={16} />
                Clear
              </button>
              <button
                onClick={searchNearby}
                disabled={!userLocation}
                className="btn btn-info"
                title={!userLocation ? 'Enable location access' : `Search within ${radius}km`}
              >
                <Navigation size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Nearby Search */}
        {userLocation && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-500" />
                <span className="text-sm text-gray-600">
                  Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Radius:</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">{radius}km</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.length > 0 ? (
          filteredResources.map((resource) => (
            <div key={resource.id} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(resource.type)}</span>
                  <h3 className="card-title">{resource.name}</h3>
                </div>
                <div className={`badge ${getStatusColor(resource.status)}`}>
                  {resource.status}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">{resource.description}</p>
                <p className="text-sm text-gray-500">
                  <strong>Location:</strong> {resource.location_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Type:</strong> {resource.type}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Quantity:</strong> {resource.quantity || 'N/A'}
                </p>
                {resource.coordinates && (
                  <p className="text-sm text-gray-500">
                    <strong>Coordinates:</strong> {resource.coordinates.lat.toFixed(4)}, {resource.coordinates.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button className="btn btn-sm flex-1">
                  <Eye size={14} />
                  View
                </button>
                {(user.role === 'admin' || resource.owner_id === user.id) && (
                  <>
                    <button className="btn btn-sm btn-secondary">
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(resource.id)}
                      className="btn btn-sm btn-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedType || selectedStatus ? 'Try adjusting your search criteria.' : 'Get started by adding your first resource.'}
            </p>
            <button className="btn btn-success">
              <Plus size={16} />
              Add First Resource
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      {resources.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="card-title">Resource Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{resources.length}</div>
              <div className="text-sm text-gray-600">Total Resources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {resources.filter(r => r.status === 'available').length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {resources.filter(r => r.status === 'in_use').length}
              </div>
              <div className="text-sm text-gray-600">In Use</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {resources.filter(r => r.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources; 