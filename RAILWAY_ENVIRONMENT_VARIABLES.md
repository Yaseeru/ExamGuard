# Railway Environment Variables Configuration

## Backend Service Environment Variables

Set these environment variables in your Railway backend service:

### Required Variables

```
NODE_ENV=production
PORT=5000
```

### Database Configuration

```
MONGODB_URI=mongodb+srv://admin-abdulhamid:lDZZgpsLgH0YGY3j@cluster0.o1kpu.mongodb.net/ExamGuard?retryWrites=true&w=majority&appName=Cluster0&readPreference=secondaryPreferred
```

### JWT Authentication

```
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long-for-production
JWT_EXPIRE=7d
```

**IMPORTANT:** Generate a secure JWT secret using this command:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS Configuration

```
FRONTEND_URL=https://your-frontend-domain.netlify.app
```

**Note:** Update this with your actual frontend deployment URL after deploying the frontend.

### Security & Performance

```
LOG_LEVEL=info
RATE_LIMIT_MAX=100
REQUEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=30000
ENABLE_METRICS=true
```

### Admin User (Optional - for initial setup)

```
ADMIN_EMAIL=admin@examguard.com
ADMIN_PASSWORD=Admin123!
```

---

## Frontend Service Environment Variables

If deploying frontend separately (Netlify/Vercel), set these:

### Required Variables

```
VITE_API_URL=https://your-backend-domain.railway.app/api
VITE_NODE_ENV=production
```

**IMPORTANT:** Update `VITE_API_URL` with your actual Railway backend URL after deployment.

### Optional Variables

```
VITE_APP_NAME=ExamGuard
VITE_APP_VERSION=1.0.0
VITE_ENABLE_SECURITY=true
VITE_ENABLE_COMPRESSION=true
VITE_ENABLE_CACHING=true
VITE_ENABLE_ERROR_TRACKING=false
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=false
```

---

## Quick Setup Guide

### Step 1: Backend Deployment on Railway

1. Go to your Railway project dashboard
2. Select your backend service
3. Go to "Variables" tab
4. Add the following variables:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://admin-abdulhamid:lDZZgpsLgH0YGY3j@cluster0.o1kpu.mongodb.net/ExamGuard?retryWrites=true&w=majority&appName=Cluster0&readPreference=secondaryPreferred
JWT_SECRET=<GENERATE_A_SECURE_SECRET>
JWT_EXPIRE=7d
FRONTEND_URL=<YOUR_FRONTEND_URL>
LOG_LEVEL=info
RATE_LIMIT_MAX=100
REQUEST_TIMEOUT=30000
HEALTH_CHECK_INTERVAL=30000
ENABLE_METRICS=true
```

5. Click "Deploy" or wait for automatic deployment

### Step 2: Get Backend URL

1. After backend deployment succeeds, copy the Railway-provided URL
2. It will look like: `https://examguard-production.up.railway.app`

### Step 3: Update Frontend URL in Backend

1. Go back to backend service variables
2. Update `FRONTEND_URL` with your actual frontend URL

### Step 4: Frontend Deployment (if separate)

1. Deploy frontend to Netlify/Vercel
2. Set environment variable:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   VITE_NODE_ENV=production
   ```

---

## Security Notes

1. **JWT_SECRET**: MUST be at least 32 characters long and cryptographically secure
2. **MONGODB_URI**: Keep this secret and never commit to Git
3. **ADMIN_PASSWORD**: Change immediately after first login
4. **FRONTEND_URL**: Must match exactly (including https://) for CORS to work

---

## Testing After Deployment

1. Test health endpoint: `https://your-backend-url.railway.app/api/health`
2. Expected response:
   ```json
   {
     "status": "OK",
     "message": "ExamGuard API is running",
     "version": "1.0.0",
     "environment": "production"
   }
   ```

3. Test login with admin credentials:
   - Email: `admin@examguard.com`
   - Password: `Admin123!`

---

## Troubleshooting

### If deployment fails:

1. Check Railway logs for errors
2. Verify MongoDB connection string is correct
3. Ensure all required environment variables are set
4. Check that PORT is set to 5000
5. Verify NODE_ENV is set to "production"

### If CORS errors occur:

1. Verify FRONTEND_URL matches your frontend domain exactly
2. Include protocol (https://)
3. No trailing slash
4. Redeploy backend after updating FRONTEND_URL

### If authentication fails:

1. Verify JWT_SECRET is set and at least 32 characters
2. Check MongoDB connection is working
3. Run seed-admin.js to create admin user if needed
