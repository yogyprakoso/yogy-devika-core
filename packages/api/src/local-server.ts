/**
 * Local development server - runs Express directly without serverless-offline
 * This bypasses the pnpm + Serverless plugin compatibility issue
 *
 * Usage: pnpm run start:local (from packages/api)
 */

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { logRoute } from './middleware/log-route';

// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(compression());
app.use(cors({ origin: '*', optionsSuccessStatus: 200 }));
app.options('*', cors());
app.use(logRoute);

// Authentication middleware for local development
// Extracts user info from Cognito JWT token, or falls back to mock user
const FALLBACK_USER_SUB = process.env.LOCAL_USER_SUB || 'local-dev-user';
app.use((req: any, _res, next) => {
  let userSub = FALLBACK_USER_SUB;
  let userEmail = 'local@dev.com';

  // Try to extract real user from Authorization header (Cognito JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Decode JWT payload (base64) - we don't verify signature locally
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      if (payload.sub) {
        userSub = payload.sub;
        userEmail = payload.email || 'unknown@local.dev';
        console.log(`[Auth] User: ${userEmail} (${userSub.substring(0, 8)}...)`);
      }
    } catch (e) {
      console.log('[Auth] Failed to parse JWT, using fallback user');
    }
  } else {
    console.log('[Auth] No token, using fallback user');
  }

  req.currentUserSub = userSub;
  req.context = {
    authorizer: {
      claims: {
        sub: userSub,
        email: userEmail,
      },
    },
  };
  next();
});

// Import and mount routes
// Note: We import the route handlers, not the Lambda handlers
import { adminRoutes } from './baseblocks/admin/admin-routes';
import { roomRoutes } from './baseblocks/room/room-routes';

app.use('/local/admin', adminRoutes);
app.use('/local/rooms', roomRoutes);

// Health check
app.get('/local/health', (_req, res) => {
  res.json({ status: 'ok', environment: 'local' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('===========================================');
  console.log('  Local API Server');
  console.log('===========================================');
  console.log(`  URL:      http://localhost:${PORT}/local/`);
  console.log(`  User:     (from JWT or fallback: ${FALLBACK_USER_SUB})`);
  console.log(`  DynamoDB: ${process.env.DYNAMODB_ENDPOINT || 'AWS (remote)'}`);
  console.log('===========================================');
  console.log('');
});
