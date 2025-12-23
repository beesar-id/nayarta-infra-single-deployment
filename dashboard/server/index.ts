import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import router from './src/routes';
import { PORT } from './src/config/constants';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

// Mount API routes
app.route('/', router);

console.log(`🚀 Server is running on http://localhost:${PORT}`);
console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);

serve({
  fetch: app.fetch,
  port: PORT,
});
