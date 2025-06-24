import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Save, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const CreateDisaster = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [extractingLocation, setExtractingLocation] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    location_name: '',
    description: '',
    tags: []
  });
  const [errors, setErrors] = useState({});

  const availableTags = [
    'flood', 'earthquake', 'fire', 'hurricane', 'tornado', 'tsunami',
    'volcano', 'drought', 'landslide', 'avalanche', 'urgent', 'high',
    'medium', 'low', 'evacuation', 'shelter', 'medical', 'food',
    'water', 'power', 'communication', 'transportation'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTagToggle = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const extractLocation = async () => {
    if (!formData.description) {
      toast.error('Please provide a description first');
      return;
    }

    setExtractingLocation(true);
    try {
      const response = await axios.post('/api/geocoding/extract', {
        description: formData.description
      }, {
        headers: { 'x-user-id': user.id }
      });

      const extractedLocation = response.data.result.location;
      if (extractedLocation && extractedLocation !== 'Unknown location') {
        setFormData(prev => ({
          ...prev,
          location_name: extractedLocation
        }));
        toast.success(`Location extracted: ${extractedLocation}`);
      } else {
        toast.error('Could not extract location from description');
      }
    } catch (error) {
      console.error('Error extracting location:', error);
      toast.error('Failed to extract location');
    } finally {
      setExtractingLocation(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/disasters', formData, {
        headers: { 'x-user-id': user.id }
      });

      toast.success('Disaster created successfully!');
      navigate(`/disasters/${response.data.disaster.id}`);
    } catch (error) {
      console.error('Error creating disaster:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create disaster';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Disaster Report</h1>
          <p className="text-gray-600">Report a new disaster with location and details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card">
            <div className="card-header">
              <h3 className="card-title flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Disaster Information
              </h3>
            </div>

            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., NYC Flood Emergency"
                className={`form-input ${errors.title ? 'border-red-500' : ''}`}
              />
              {errors.title && <div className="form-error">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Provide detailed description of the disaster..."
                className={`form-textarea ${errors.description ? 'border-red-500' : ''}`}
                rows={4}
              />
              {errors.description && <div className="form-error">{errors.description}</div>}
              <div className="text-sm text-gray-500 mt-1">
                {formData.description.length}/1000 characters
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Manhattan, NYC"
                  className="form-input flex-1"
                />
                <button
                  type="button"
                  onClick={extractLocation}
                  disabled={extractingLocation || !formData.description}
                  className="btn btn-secondary"
                >
                  {extractingLocation ? (
                    <div className="spinner"></div>
                  ) : (
                    <MapPin size={16} />
                  )}
                  Extract
                </button>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Leave empty to extract from description, or specify manually
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg">
                {availableTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.tags.includes(tag)}
                      onChange={() => handleTagToggle(tag)}
                      className="rounded"
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Select relevant tags to categorize the disaster
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-success flex-1"
              >
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <Save size={16} />
                )}
                Create Disaster
              </button>
              <button
                type="button"
                onClick={() => navigate('/disasters')}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          {/* Preview */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Preview</h3>
            </div>
            <div className="space-y-3">
              <div>
                <strong>Title:</strong>
                <p className="text-gray-600">{formData.title || 'Not specified'}</p>
              </div>
              <div>
                <strong>Location:</strong>
                <p className="text-gray-600">{formData.location_name || 'Will be extracted'}</p>
              </div>
              <div>
                <strong>Tags:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.tags.length > 0 ? (
                    formData.tags.map(tag => (
                      <span key={tag} className="badge badge-info">{tag}</span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No tags selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tips</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Include specific location details in the description for better location extraction</p>
              <p>• Use relevant tags to help with categorization and filtering</p>
              <p>• Mark as "urgent" for immediate attention disasters</p>
              <p>• Provide detailed descriptions for better resource allocation</p>
            </div>
          </div>

          {/* User Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User Information</h3>
            </div>
            <div className="space-y-2 text-sm">
              <p><strong>User:</strong> {user.id}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Created:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDisaster; 