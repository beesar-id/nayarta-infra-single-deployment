import { Hono } from 'hono';
import { ImageController } from '../controllers/image.controller';

const router = new Hono();

/**
 * @route GET /api/images
 * @summary Get all images
 * @description Get list of all Docker images
 */
router.get('/images', ImageController.getImages);

/**
 * @route POST /api/images/pull
 * @summary Pull image
 * @description Pull a Docker image from registry with progress tracking
 */
router.post('/images/pull', ImageController.pullImage);

/**
 * @route GET /api/images/pull/progress/:progressId
 * @summary Get pull progress
 * @description Get progress of an image pull operation
 */
router.get('/images/pull/progress/:progressId', ImageController.getPullProgress);

/**
 * @route POST /api/images/pull/cancel/:progressId
 * @summary Cancel pull
 * @description Cancel an ongoing image pull operation
 */
router.post('/images/pull/cancel/:progressId', ImageController.cancelPull);

/**
 * @route DELETE /api/images/:id
 * @summary Delete image
 * @description Delete a Docker image
 */
router.delete('/images/:id', ImageController.deleteImage);

export default router;

