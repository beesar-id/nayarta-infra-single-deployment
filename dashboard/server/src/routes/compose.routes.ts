import { Hono } from 'hono';
import { ComposeController } from '../controllers/compose.controller';

const router = new Hono();

/**
 * @route POST /api/compose/:profile/:action
 * @summary Execute docker compose command
 * @description Execute docker compose up or down command for a specific profile
 */
router.post('/compose/:profile/:action', ComposeController.execute);

/**
 * @route GET /api/compose/:profile/:action/progress
 * @summary Execute docker compose command with progress
 * @description Execute docker compose up or down command with Server-Sent Events for real-time progress
 */
router.get('/compose/:profile/:action/progress', ComposeController.executeWithProgress);

export default router;

