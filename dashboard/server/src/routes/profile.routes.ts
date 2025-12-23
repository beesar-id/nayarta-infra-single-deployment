import { Hono } from 'hono';
import { ProfileController } from '../controllers/profile.controller';

const router = new Hono();

/**
 * @route GET /api/profiles
 * @summary Get all available profiles
 * @description Returns a list of all available Docker Compose profiles
 */
router.get('/profiles', ProfileController.getProfiles);

export default router;

