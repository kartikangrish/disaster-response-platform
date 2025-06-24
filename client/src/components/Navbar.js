import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Map, Users, Shield, Activity } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, changeUser } = useContext(AuthContext);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Activity },
    { path: '/disasters', label: 'Disasters', icon: AlertTriangle },
    { path: '/resources', label: 'Resources', icon: Map },
    { path: '/social-media', label: 'Social Media', icon: Users },
    { path: '/verification', label: 'Verification', icon: Shield }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <AlertTriangle size={24} />
          Disaster Response Platform
        </Link>

        <ul className="navbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4">
          <div className="real-time-indicator">
            <Activity size={12} />
            Live
          </div>
          
          <select
            className="user-selector"
            value={user.id}
            onChange={(e) => changeUser(e.target.value)}
          >
            <option value="netrunnerX">netrunnerX (Admin)</option>
            <option value="reliefAdmin">reliefAdmin (Admin)</option>
            <option value="citizen1">citizen1 (Contributor)</option>
            <option value="firefighter_jane">firefighter_jane (Contributor)</option>
          </select>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 