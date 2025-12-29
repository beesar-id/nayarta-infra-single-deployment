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

  /**
   * @summary Execute docker compose command with streaming progress
   * @description Execute docker compose up or down command with Server-Sent Events for real-time progress
   * @param profile - Profile name
   * @param action - Action to perform (up or down)
   */
  static async executeWithProgress(c: Context) {
    try {
      const profile = c.req.param('profile') as Profile;
      const action = c.req.param('action') as 'up' | 'down';

      if (!PROFILES.includes(profile)) {
        return c.json({ error: 'Invalid profile' }, 400);
      }

      if (action !== 'up' && action !== 'down') {
        return c.json({ error: 'Invalid action. Use "up" or "down"' }, 400);
      }

      // Create a readable stream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          try {
            // Send initial message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', message: `Starting ${action} for profile ${profile}...` })}\n\n`));

            await composeService.executeWithStream(
              profile,
              action,
              (data: string) => {
                // Send progress data
                const lines = data.split('\n').filter(line => line.trim());
                for (const line of lines) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'output', data: line })}\n\n`));
                }
              },
              (error: string) => {
                // Send error
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error })}\n\n`));
              },
              (success: boolean) => {
                // Send completion
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', success, message: `Profile ${profile} ${action} ${success ? 'completed' : 'failed'}` })}\n\n`));
                controller.close();
              }
            );
          } catch (error: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
}

