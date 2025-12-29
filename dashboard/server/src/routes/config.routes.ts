import { Hono } from 'hono';
import { ConfigController } from '../controllers/config.controller';

const router = new Hono();

/**
 * @route GET /api/config/env
 * @summary Get root .env content
 */
router.get('/config/env', ConfigController.getEnv);

/**
 * @route PUT /api/config/env
 * @summary Update root .env content
 */
router.put('/config/env', ConfigController.updateEnv);

/**
 * @route GET /api/config/mediamtx
 * @summary Get MediaMTX config
 */
router.get('/config/mediamtx', ConfigController.getMediamtx);

/**
 * @route PUT /api/config/mediamtx
 * @summary Update MediaMTX config
 */
router.put('/config/mediamtx', ConfigController.updateMediamtx);

/**
 * @route PUT /api/config/host-ip
 * @summary Update Host IP
 */
router.put('/config/host-ip', ConfigController.updateHostIp);

export default router;



