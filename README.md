# Disaster Response Coordination Platform

A comprehensive MERN stack application for real-time disaster response coordination, featuring AI-powered location extraction, social media monitoring, and geospatial resource mapping.

## 🚀 Features

- **Disaster Management**: CRUD operations with ownership and audit trails
- **AI-Powered Location Extraction**: Google Gemini API for extracting locations from descriptions
- **Real-Time Social Media Monitoring**: Mock Twitter/Bluesky API integration
- **Geospatial Resource Mapping**: Supabase geospatial queries for nearby resources
- **Image Verification**: Gemini API for authenticating disaster images
- **Official Updates Aggregation**: Web scraping for government/relief updates
- **Real-Time Updates**: WebSocket integration for live data
- **Caching System**: Supabase-based caching with TTL
- **Role-Based Access**: Admin and contributor user roles

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: React.js, React Router, Socket.IO Client
- **Database**: Supabase (PostgreSQL with geospatial support)
- **AI Services**: Google Gemini API
- **External APIs**: Google Maps Geocoding, Mock Social Media APIs
- **Deployment**: Render (Backend), Vercel (Frontend)
 
## 📋 Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account
- Google Gemini API key
- Google Maps API key (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/kartikangrish/disaster-response-platform.git
cd disaster-response-platform
```

### 2. Backend Setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

### 3. Frontend Setup
```bash
cd client
npm install
npm start
```

## 🌐 Deployment

### Backend Deployment (Render)

1. **Fork/Clone** this repository
2. **Sign up** at [Render.com](https://render.com)
3. **Create New Web Service**
4. **Connect** your GitHub repository
5. **Configure** the service:
   - **Name**: `disaster-response-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Port**: `10000`

6. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```

7. **Deploy** and note the URL (e.g., `https://disaster-response-backend.onrender.com`)

### Frontend Deployment (Vercel)

1. **Sign up** at [Vercel.com](https://vercel.com)
2. **Import** your GitHub repository
3. **Configure** the project:
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. **Add Environment Variables**:
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   ```

5. **Deploy** and get your frontend URL

## 🔧 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

## 📊 API Endpoints

- `POST /api/disasters` - Create disaster
- `GET /api/disasters` - List disasters
- `PUT /api/disasters/:id` - Update disaster
- `DELETE /api/disasters/:id` - Delete disaster
- `GET /api/social-media/mock` - Mock social media posts
- `GET /api/resources` - Get resources
- `POST /api/geocoding/extract` - Extract location from text
- `POST /api/verification/verify-image` - Verify image authenticity

## 🎯 AI Tool Usage

This project was extensively developed using **Cursor AI** for:
- Generating API routes and middleware
- Creating Supabase queries and caching logic
- Implementing WebSocket handlers
- Building React components and hooks
- Writing geospatial query logic
- Developing mock social media services

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ using Cursor AI** 