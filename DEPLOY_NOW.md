# 🚀 Deploy ObtaskAI Right Now - Step by Step

## Before Starting
You need your Supabase credentials. Get them from:
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Settings → API
4. Copy these 3 values:
   - `Project URL` (looks like https://xxx.supabase.co)
   - `anon public` key
   - `service_role` key (keep this secret!)

## Step 1: Deploy to Render

### 1.1 Sign up/Login
- Go to [render.com](https://render.com)
- Sign up (it's free)

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Choose **"Build and deploy from a Git repository"**
3. Click **"Connect account"** to connect GitHub
4. Find and select your repository: `obtaskai`
5. Click **"Connect"**

### 1.3 Configure Service
Fill in these settings:
- **Name**: `obtaskai-backend`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/index.js`
- **Instance Type**: `Free`

### 1.4 Add Environment Variables
Scroll down to "Environment Variables" and add:

| Key | Value |
|-----|-------|
| SUPABASE_URL | (paste your Supabase URL) |
| SUPABASE_ANON_KEY | (paste your anon key) |
| SUPABASE_SERVICE_KEY | (paste your service key) |
| JWT_SECRET | any-random-secret-key-123456 |
| NODE_ENV | production |
| PORT | 10000 |

### 1.5 Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. When done, you'll see: `Your service is live 🎉`
4. Copy your URL: `https://obtaskai-backend.onrender.com`

## Step 2: Update Mobile App

### 2.1 Update API URL
Edit `client/src/services/api.ts`:
```typescript
const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'https://obtaskai-backend.onrender.com';
```

### 2.2 Create Production Environment
Create `client/.env.production`:
```
REACT_APP_SERVER_URL=https://obtaskai-backend.onrender.com
```

### 2.3 Build APK
Run this command:
```bash
cd client
npm run build
npx cap sync android
cd android
gradlew assembleRelease
```

Your APK is ready at: `client/android/app/release/app-release.apk`

## Step 3: Test & Share

### Test First
1. Install APK on your phone
2. Test login/signup
3. Create a project
4. Make sure everything works

### Share with Testers
1. Upload APK to Google Drive
2. Create shareable link
3. Send to testers with instructions:
   ```
   1. Download APK
   2. Enable "Unknown sources" in settings
   3. Install and test
   4. Report any issues
   ```

## Troubleshooting

### "Service Unavailable" Error
- Wait 5 more minutes for Render to finish
- Check Render dashboard for errors

### "Network Error" in App
- Make sure you updated the API URL
- Rebuild the APK
- Check server logs on Render

### Free Tier Limitations
- Server sleeps after 15 min inactivity
- First request takes 30 seconds to wake up
- Upgrade to paid ($7/month) to keep always on

## Success! 🎉
Your app is now deployed and testers can use it from anywhere!