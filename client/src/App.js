import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DisasterList from './pages/DisasterList';
import DisasterDetail from './pages/DisasterDetail';
import CreateDisaster from './pages/CreateDisaster';
import Resources from './pages/Resources';
import SocialMedia from './pages/SocialMedia';
import { SocketContext } from './context/SocketContext';
import { AuthContext } from './context/AuthContext';

import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState({
    id: 'netrunnerX',
    role: 'admin'
  });

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  const changeUser = (userId) => {
    const users = {
      'netrunnerX': { id: 'netrunnerX', role: 'admin' },
      'reliefAdmin': { id: 'reliefAdmin', role: 'admin' },
      'citizen1': { id: 'citizen1', role: 'contributor' },
      'firefighter_jane': { id: 'firefighter_jane', role: 'contributor' }
    };
    setUser(users[userId] || users['netrunnerX']);
  };

  return (
    <AuthContext.Provider value={{ user, changeUser }}>
      <SocketContext.Provider value={socket}>
        <Router>
          <div className="App">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/disasters" element={<DisasterList />} />
                <Route path="/disasters/create" element={<CreateDisaster />} />
                <Route path="/disasters/:id" element={<DisasterDetail />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/social-media" element={<SocialMedia />} />
              </Routes>
            </main>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}

export default App; 