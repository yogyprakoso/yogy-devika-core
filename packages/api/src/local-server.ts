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

// Mock authentication for local development
// In production, this comes from Cognito Authorizer
const LOCAL_USER_SUB = process.env.LOCAL_USER_SUB || 'local-dev-user';
app.use((req: any, _res, next) => {
  req.currentUserSub = LOCAL_USER_SUB;
  req.context = {
    authorizer: {
      claims: {
        sub: LOCAL_USER_SUB,
        email: 'local@dev.com',
      },
    },
  };
  next();
});

// Import and mount routes
// Note: We import the route handlers, not the Lambda handlers
import { adminRoutes } from './baseblocks/admin/admin-routes';
app.use('/local/admin', adminRoutes);

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
  console.log(`  User:     ${LOCAL_USER_SUB}`);
  console.log(`  DynamoDB: ${process.env.DYNAMODB_ENDPOINT || 'AWS (remote)'}`);
  console.log('===========================================');
  console.log('');
});
