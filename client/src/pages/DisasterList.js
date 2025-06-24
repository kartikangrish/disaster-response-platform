import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const DisasterList = () => {
  const { user } = useContext(AuthContext);
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState([]);

  useEffect(() => {
    fetchDisasters();
  }, []);

  const fetchDisasters = async () => {
    try {
      const response = await axios.get('/api/disasters', {
        headers: { 'x-user-id': user.id }
      });
      
      setDisasters(response.data.disasters || []);
      
      // Extract unique tags
      const tags = new Set();
      response.data.disasters?.forEach(disaster => {
        disaster.tags?.forEach(tag => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching disasters:', error);
      toast.error('Failed to load disasters');
      setLoading(false);
    }
  };

  const handleDelete = async (disasterId) => {
    if (!window.confirm('Are you sure you want to delete this disaster?')) {
      return;
    }

    try {
      await axios.delete(`/api/disasters/${disasterId}`, {
        headers: { 'x-user-id': user.id }
      });
      
      toast.success('Disaster deleted successfully');
      fetchDisasters();
    } catch (error) {
      console.error('Error deleting disaster:', error);
      toast.error('Failed to delete disaster');
    }
  };

  const filteredDisasters = disasters.filter(disaster => {
    const matchesSearch = disaster.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disaster.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disaster.location_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = !selectedTag || disaster.tags?.includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  const getPriorityColor = (tags) => {
    if (tags?.includes('urgent')) return 'priority-urgent';
    if (tags?.includes('high')) return 'priority-high';
    if (tags?.includes('medium')) return 'priority-medium';
    return 'priority-low';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading disasters...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Disasters</h1>
          <p className="text-gray-600">Manage and monitor disaster reports</p>
        </div>
        <Link to="/disasters/create" className="btn btn-success">
          <Plus size={16} />
          Create Disaster
        </Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search disasters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="form-select"
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTag('');
              }}
              className="btn btn-secondary"
            >
              <Filter size={16} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Disasters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDisasters.length > 0 ? (
          filteredDisasters.map((disaster) => (
            <div key={disaster.id} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500" />
                  <h3 className="card-title">{disaster.title}</h3>
                </div>
                <div className={`badge ${getPriorityColor(disaster.tags)}`}>
                  {disaster.tags?.includes('urgent') ? 'Urgent' : 
                   disaster.tags?.includes('high') ? 'High' : 
                   disaster.tags?.includes('medium') ? 'Medium' : 'Low'}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">{disaster.description}</p>
                <p className="text-sm text-gray-500">
                  <strong>Location:</strong> {disaster.location_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Created:</strong> {new Date(disaster.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Owner:</strong> {disaster.owner_id}
                </p>
              </div>

              <div className="flex gap-1 mb-4">
                {disaster.tags?.map((tag, index) => (
                  <span key={index} className="badge badge-info">{tag}</span>
                ))}
              </div>

              <div className="flex gap-2">
                <Link to={`/disasters/${disaster.id}`} className="btn btn-sm flex-1">
                  <Eye size={14} />
                  View
                </Link>
                {(user.role === 'admin' || disaster.owner_id === user.id) && (
                  <>
                    <Link to={`/disasters/${disaster.id}/edit`} className="btn btn-sm btn-secondary">
                      <Edit size={14} />
                    </Link>
                    <button
                      onClick={() => handleDelete(disaster.id)}
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
            <AlertTriangle size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disasters found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedTag ? 'Try adjusting your search criteria.' : 'Get started by creating your first disaster report.'}
            </p>
            <Link to="/disasters/create" className="btn btn-success">
              <Plus size={16} />
              Create First Disaster
            </Link>
          </div>
        )}
      </div>

      {/* Statistics */}
      {disasters.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="card-title">Statistics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{disasters.length}</div>
              <div className="text-sm text-gray-600">Total Disasters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {disasters.filter(d => d.tags?.includes('urgent')).length}
              </div>
              <div className="text-sm text-gray-600">Urgent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {disasters.filter(d => d.tags?.includes('high')).length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {disasters.filter(d => !d.tags?.includes('urgent') && !d.tags?.includes('high')).length}
              </div>
              <div className="text-sm text-gray-600">Normal</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisasterList; 