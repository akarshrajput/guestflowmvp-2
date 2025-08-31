# Deploying GuestFlow Backend to Render

## Prerequisites

1. **MongoDB Atlas Account**: Set up a free MongoDB Atlas cluster
2. **Supabase Account**: Set up your Supabase project
3. **Render Account**: Sign up at [render.com](https://render.com)

## Step 1: Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user with read/write permissions
4. Get your connection string
5. Whitelist your IP address (or use `0.0.0.0/0` for all IPs)

## Step 2: Set up Supabase

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API

## Step 3: Deploy to Render

### Option A: Using Render Dashboard

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder

2. **Configure Service**
   - **Name**: `guestflow-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose paid plan for better performance)

3. **Environment Variables**
   Add these environment variables in Render:

   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hotel-management?retryWrites=true&w=majority
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   JWT_SECRET=your-super-secret-jwt-key-here
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=noreply@guestflow.com
   MISTRAL_API_KEY=your-mistral-api-key
   ```

### Option B: Using render.yaml (Recommended)

1. **Push to GitHub**: The `render.yaml` file is already configured
2. **Connect Repository**: Render will automatically detect the configuration
3. **Deploy**: Render will use the settings from `render.yaml`

## Step 4: Update Frontend Configuration

After deployment, update your frontend API base URL to point to your Render backend:

```typescript
// In your frontend API configuration
const API_BASE_URL = 'https://your-backend-name.onrender.com';
```

## Step 5: Test the Deployment

1. **Health Check**: Visit `https://your-backend-name.onrender.com/health`
2. **API Test**: Test your endpoints from the frontend
3. **CORS Test**: Ensure your frontend can make requests to the backend

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `SUPABASE_URL` | Supabase project URL | `https://project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | Secret for JWT tokens | `your-super-secret-key-here` |
| `EMAIL_USER` | Gmail address | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | Gmail app password | `your-app-password` |
| `MISTRAL_API_KEY` | Mistral AI API key | `your-mistral-key` |

## Troubleshooting

### CORS Issues
- Ensure your frontend domain is in the allowed origins list
- Check that the backend URL is correct in your frontend
- Verify environment variables are set correctly

### MongoDB Connection Issues
- Check your MongoDB Atlas IP whitelist
- Verify connection string format
- Ensure database user has correct permissions

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check build logs in Render dashboard

## Security Notes

1. **Never commit sensitive data** to your repository
2. **Use strong JWT secrets** in production
3. **Enable MongoDB Atlas security features** (IP whitelist, authentication)
4. **Use environment variables** for all sensitive configuration
5. **Enable HTTPS** (Render provides this automatically)

## Performance Optimization

1. **Database Indexing**: Add indexes to frequently queried fields
2. **Connection Pooling**: MongoDB connection is already optimized
3. **Caching**: Consider adding Redis for session storage
4. **CDN**: Use Cloudflare or similar for static assets

## Monitoring

1. **Render Dashboard**: Monitor logs and performance
2. **MongoDB Atlas**: Monitor database performance
3. **Application Logs**: Check console logs for errors
4. **Health Checks**: Use the `/health` endpoint for monitoring

## Support

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **MongoDB Atlas**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
