import { Hono } from 'hono';
import { ContainerController } from '../controllers/container.controller';

const router = new Hono();

/**
 * @route GET /api/containers
 * @summary Get containers
 * @description Get list of containers, optionally filtered by profile
 */
router.get('/containers', ContainerController.getContainers);

/**
 * @route GET /api/containers/:id
 * @summary Get container details
 * @description Get detailed information about a specific container
 */
router.get('/containers/:id', ContainerController.getContainerDetails);

/**
 * @route GET /api/containers/:id/stats
 * @summary Get container stats
 * @description Get real-time statistics for a container
 */
router.get('/containers/:id/stats', ContainerController.getContainerStats);

/**
 * @route GET /api/containers/:id/logs
 * @summary Get container logs
 * @description Get logs from a container
 */
router.get('/containers/:id/logs', ContainerController.getContainerLogs);

/**
 * @route POST /api/containers/stats/aggregate
 * @summary Get aggregate stats
 * @description Get aggregated statistics for multiple containers
 */
router.post('/containers/stats/aggregate', ContainerController.getAggregateStats);

/**
 * @route POST /api/containers/:id/:action
 * @summary Container action
 * @description Perform an action on a container (start, stop, restart, remove)
 */
router.post('/containers/:id/:action', ContainerController.containerAction);

/**
 * @route POST /api/containers/apply
 * @summary Apply changes (docker compose down and up)
 * @description Apply configuration changes by doing docker compose down and up for profiles with running containers
 */
router.post('/containers/apply', ContainerController.applyChanges);

export default router;


