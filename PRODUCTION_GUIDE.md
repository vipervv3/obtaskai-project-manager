# Production Deployment Guide

## Recommended Stack:
- **Frontend**: Vercel (already deployed)
- **Backend**: Render.com
- **Database**: Supabase (already set up)

## Step-by-Step Deployment:

### 1. Deploy Backend to Render

1. **Sign up** at https://render.com/
2. **Create New → Web Service**
3. **Connect your GitHub** repository
4. **Configure:**
   - Name: `obtaskai-backend`
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: Free

5. **Add Environment Variables:**
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   JWT_SECRET=your-secret-jwt-key-here
   NODE_ENV=production
   PORT=10000
   ```

### 2. Update Frontend Environment

1. **Go to Vercel Dashboard**
2. **Settings → Environment Variables**
3. **Update:**
   ```
   REACT_APP_SERVER_URL=https://your-backend.onrender.com
   ```
4. **Redeploy**

### 3. Configure Supabase for Production

1. **Go to Supabase Dashboard**
2. **Settings → API**
3. **Add your production URLs** to allowed origins:
   - `https://obtaskai-project-manager.vercel.app`
   - `https://your-backend.onrender.com`

### 4. Update CORS in Backend

In `server/src/index.ts`, update CORS for production:

```typescript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://obtaskai-project-manager.vercel.app'] 
    : ['http://localhost:3000'],
  credentials: true
};
```

### 5. Security Checklist

- [ ] Remove all console.logs with sensitive data
- [ ] Set strong JWT_SECRET
- [ ] Enable Supabase Row Level Security
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS everywhere (automatic with Vercel/Render)

### 6. Performance Optimizations

- [ ] Enable gzip compression (already done)
- [ ] Set up caching headers
- [ ] Optimize images
- [ ] Enable React production build (automatic)

## Monitoring

### Free Options:
1. **Render Dashboard** - Built-in metrics
2. **Vercel Analytics** - Frontend performance
3. **Supabase Dashboard** - Database metrics

## Costs:
- **Frontend (Vercel)**: Free
- **Backend (Render)**: Free (spins down after 15 min inactivity)
- **Database (Supabase)**: Free (up to 500MB)
- **Total**: $0/month for small projects

## Upgrade Path:
When you need more:
1. **Render Paid**: $7/month (no spin-down)
2. **Supabase Pro**: $25/month (8GB database)
3. **Vercel Pro**: $20/month (more builds)

## Domain Setup (Optional):
1. Buy domain from Namecheap/Google Domains
2. Add custom domain in Vercel
3. Add custom domain in Render
4. Update CORS settings with new domain

## Backup Strategy:
1. **Database**: Supabase daily backups (Pro plan)
2. **Code**: GitHub
3. **Manual backups**: Use Supabase dashboard to export data

## Support:
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs