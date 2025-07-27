# 🚀 Quick Deploy to Render - 10 Minutes

## Step 1: Push to GitHub (If not already)
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

## Step 2: Deploy Backend
1. Go to [render.com](https://render.com)
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Name**: obtaskai-backend
   - **Root Directory**: server
   - **Build**: `npm install && npm run build`
   - **Start**: `node dist/index.js`
   - **Plan**: Free

6. Click "Advanced" → Add Environment Variables:
```
SUPABASE_URL=(get from Supabase dashboard)
SUPABASE_ANON_KEY=(get from Supabase dashboard)
SUPABASE_SERVICE_KEY=(get from Supabase dashboard)
JWT_SECRET=any-random-secret-key-here
NODE_ENV=production
```

7. Click "Create Web Service"
8. Wait for deployment (5-10 min)
9. Copy your URL: `https://obtaskai-backend.onrender.com`

## Step 3: Update & Build APK
Run this script:
```batch
@echo off
set BACKEND_URL=https://obtaskai-backend.onrender.com
cd client
echo REACT_APP_SERVER_URL=%BACKEND_URL% > .env.production
npm run build
npx cap sync android
cd android
gradlew assembleRelease
echo APK ready at: android\app\release\app-release.apk
```

## Step 4: Share with Testers
1. Upload APK to Google Drive
2. Share link
3. Tell testers to:
   - Enable "Unknown sources"
   - Download & install
   - Test all features

## That's it! 🎉
Your app now works for anyone, anywhere!