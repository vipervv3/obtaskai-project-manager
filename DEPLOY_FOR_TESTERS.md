# 🚀 Deploy ObtaskAI for Testers

## Quick Start - Deploy Backend to Render (Free)

### 1. Prepare Backend
```bash
cd server
npm run build
```

### 2. Deploy to Render.com
1. Sign up at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub/GitLab or use "Public Git repository"
4. Configure:
   - **Name**: obtaskai-backend
   - **Root Directory**: server
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Instance Type**: Free

5. Add Environment Variables:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### 3. Update Mobile App
Edit `client/src/services/api.ts`:
```typescript
const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'https://obtaskai-backend.onrender.com';
```

### 4. Build Production APK
```bash
cd client
npm run build
npx cap sync android
cd android
gradlew assembleRelease
```

### 5. Distribute APK

#### Option A: Direct Sharing
- APK location: `client/android/app/release/app-release.apk`
- Upload to Google Drive/Dropbox
- Share link with testers

#### Option B: Firebase App Distribution (Better)
1. Set up Firebase project
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Upload APK:
```bash
firebase appdistribution:distribute app-release.apk \
  --app YOUR_FIREBASE_APP_ID \
  --groups "testers"
```

## Testing Checklist for Your Testers

Send this to testers:

### Installation:
1. Enable "Unknown sources" in Android settings
2. Download APK from link
3. Install the app
4. Open and test

### What to Test:
- [ ] User registration/login
- [ ] Create new project
- [ ] Add tasks
- [ ] Voice recording
- [ ] AI features
- [ ] Offline functionality

### Report Issues:
- App version
- Android version
- Steps to reproduce
- Screenshots

## Cost Summary
- **Render Backend**: Free (sleeps after 15 min)
- **Supabase Database**: Free (500MB)
- **Total**: $0/month for testing

## Production Ready?
When ready for real users:
1. Upgrade Render ($7/month - no sleep)
2. Get Google Play Developer account ($25)
3. Publish to Play Store

---
**Current Status**: Ready for local testing only
**Next Step**: Deploy backend to Render.com