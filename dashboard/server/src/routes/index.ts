import { Hono } from 'hono';
import { PROFILES } from '../config/constants';
import healthRoutes from './health.routes';
import docsRoutes from './docs.routes';
import profileRoutes from './profile.routes';
import containerRoutes from './container.routes';
import composeRoutes from './compose.routes';
import imageRoutes from './image.routes';

const router = new Hono();

/**
 * @route GET /
 * @summary API root
 * @description Get API information and available profiles
 */
router.get('/', (c) => {
  return c.json({ 
    message: 'Nayarta Docker Dashboard API',
    version: '1.0.0',
    profiles: PROFILES,
    docs: '/docs',
    health: '/health',
    openapi: '/openapi.json',
    apiEndpoint: '/api',
  });
});

// Mount route modules
router.route('/', healthRoutes);
router.route('/', docsRoutes);
router.route('/api', profileRoutes);
router.route('/api', containerRoutes);
router.route('/api', composeRoutes);
router.route('/api', imageRoutes);

export default router;

