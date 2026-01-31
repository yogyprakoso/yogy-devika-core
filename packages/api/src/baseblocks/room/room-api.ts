/**
 * Room API - Lambda handler
 */

import createApp from '../../util/express-app';
import createAuthenticatedHandler from '../../util/create-authenticated-handler';
import { roomRoutes } from './room-routes';

const app = createApp();

// Mount room routes
app.use('/rooms', roomRoutes);

// Export Lambda handler
export const handler = createAuthenticatedHandler(app);
