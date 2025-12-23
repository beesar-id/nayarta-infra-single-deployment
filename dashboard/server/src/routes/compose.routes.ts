import { Hono } from 'hono';
import { ComposeController } from '../controllers/compose.controller';

const router = new Hono();

/**
 * @route POST /api/compose/:profile/:action
 * @summary Execute docker compose command
 * @description Execute docker compose up or down command for a specific profile
 */
router.post('/compose/:profile/:action', ComposeController.execute);

export default router;

