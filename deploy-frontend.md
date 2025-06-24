# Frontend Deployment to Vercel

## Step-by-Step Instructions:

1. **Go to Vercel.com**
   - Visit: https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository: `kartikangrish/disaster-response-platform`

3. **Configure Project**
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. **Add Environment Variable**
   - Click "Environment Variables"
   - Add: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.onrender.com` (replace with your actual backend URL)

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Get your frontend URL

## Your Frontend URL will be: https://[project-name].vercel.app 