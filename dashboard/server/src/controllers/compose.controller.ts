import { Context } from 'hono';
import { DockerComposeService } from '../services/docker-compose.service';
import { PROFILES } from '../config/constants';
import type { Profile } from '../types';

const composeService = new DockerComposeService();

export class ComposeController {
  /**
   * @summary Execute docker compose command
   * @description Execute docker compose up or down command for a specific profile
   * @param profile - Profile name
   * @param action - Action to perform (up or down)
   */
  static async execute(c: Context) {
    try {
      const profile = c.req.param('profile') as Profile;
      const action = c.req.param('action') as 'up' | 'down';

      if (!PROFILES.includes(profile)) {
        return c.json({ error: 'Invalid profile' }, 400);
      }

      if (action !== 'up' && action !== 'down') {
        return c.json({ error: 'Invalid action. Use "up" or "down"' }, 400);
      }

      const result = await composeService.execute(profile, action);
      
      if (result.success) {
        return c.json({ 
          success: true, 
          message: `Profile ${profile} ${action} executed successfully`,
          output: result.output,
        });
      } else {
        return c.json({ 
          success: false, 
          error: result.error,
          output: result.output,
        }, 500);
      }
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
}

