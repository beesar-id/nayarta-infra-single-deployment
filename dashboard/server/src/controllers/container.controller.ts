import { Context } from 'hono';
import { ContainerService } from '../services/container.service';
import { PROFILES } from '../config/constants';
import type { Profile } from '../types';

const containerService = new ContainerService();

export class ContainerController {
  /**
   * @summary Get containers
   * @description Get list of containers, optionally filtered by profile
   * @param profile - Optional profile filter
   */
  static async getContainers(c: Context) {
    try {
      const profile = c.req.query('profile') as Profile | undefined;
      
      if (profile && !PROFILES.includes(profile)) {
        return c.json({ error: 'Invalid profile' }, 400);
      }

      const containers = await containerService.getContainersByProfile(profile);
      return c.json({ containers, count: containers.length });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get container details
   * @description Get detailed information about a specific container
   * @param id - Container ID
   */
  static async getContainerDetails(c: Context) {
    try {
      const containerId = c.req.param('id');
      const details = await containerService.getContainerDetails(containerId);
      return c.json(details);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get container stats
   * @description Get real-time statistics for a container (CPU, memory, disk, network)
   * @param id - Container ID
   */
  static async getContainerStats(c: Context) {
    try {
      const containerId = c.req.param('id');
      const stats = await containerService.getContainerStats(containerId);
      
      if (!stats) {
        return c.json({ error: 'Container not found or not running' }, 404);
      }
      
      return c.json(stats);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get aggregate stats
   * @description Get aggregated statistics for multiple containers
   * @body { containerIds: string[] }
   */
  static async getAggregateStats(c: Context) {
    try {
      const { containerIds } = await c.req.json();
      
      if (!Array.isArray(containerIds) || containerIds.length === 0) {
        return c.json({ error: 'containerIds must be a non-empty array' }, 400);
      }

      const stats = await containerService.getAggregateStats(containerIds);
      return c.json(stats);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get container logs
   * @description Get logs from a container
   * @param id - Container ID
   * @param tail - Number of lines to return (default: 100)
   */
  static async getContainerLogs(c: Context) {
    try {
      const containerId = c.req.param('id');
      const tail = Number.parseInt(c.req.query('tail') || '100', 10);
      const logs = await containerService.getContainerLogs(containerId, tail);
      return c.text(logs);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Container action
   * @description Perform an action on a container (start, stop, restart, remove)
   * @param id - Container ID
   * @param action - Action to perform (start, stop, restart, remove)
   */
  static async containerAction(c: Context) {
    try {
      const containerId = c.req.param('id');
      const action = c.req.param('action') as 'start' | 'stop' | 'restart' | 'remove';

      if (!['start', 'stop', 'restart', 'remove'].includes(action)) {
        return c.json({ error: 'Invalid action' }, 400);
      }

      await containerService.containerAction(containerId, action);
      return c.json({ 
        success: true, 
        message: `Container ${action} executed successfully` 
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Apply changes (docker compose down and up)
   * @description Apply configuration changes by doing docker compose down and up for profiles with running containers
   */
  static async applyChanges(c: Context) {
    try {
      const result = await containerService.applyChanges();
      return c.json({ 
        success: true, 
        message: `Applied changes to ${result.applied.length} profile(s): ${result.applied.join(', ')}`,
        applied: result.applied,
        errors: result.errors,
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
}

