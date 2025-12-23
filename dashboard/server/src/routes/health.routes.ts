import { Hono } from 'hono';

const router = new Hono();

/**
 * @route GET /health
 * @summary Health check endpoint
 * @description Simple health check endpoint to verify API is running
 */
router.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;

