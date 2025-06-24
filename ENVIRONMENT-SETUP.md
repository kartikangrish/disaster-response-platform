# 🔑 Environment Variables Setup

## Required API Keys

### 1. Supabase Setup
1. Go to https://supabase.com
2. Create new project
3. Get your URL and anon key from Settings → API

### 2. Google Gemini API
1. Go to https://aistudio.google.com/app/apikey
2. Create new API key
3. Copy the key

### 3. Google Maps API (Optional)
1. Go to https://console.cloud.google.com
2. Enable Geocoding API
3. Create API key

## Environment Variables for Render (Backend)

Add these to your Render service:

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Environment Variables for Vercel (Frontend)

Add this to your Vercel project:

```
REACT_APP_API_URL=https://your-backend-service.onrender.com
```

## Quick Setup Commands

### For Local Development
```bash
# Backend
cd server
cp .env.example .env
# Edit .env with your keys

# Frontend
cd client
# Create .env.local with REACT_APP_API_URL=http://localhost:5000
```

### For Production
- Use the environment variable sections in Render and Vercel dashboards
- Never commit API keys to Git 