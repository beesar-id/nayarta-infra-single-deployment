import { Context } from 'hono';
import { ConfigService } from '../services/config.service';

export class ConfigController {
  /**
   * @summary Get root .env file content
   * @description Read .env file located at the project root
   * @tags Config
   */
  static async getEnv(c: Context) {
    try {
      const content = await ConfigService.getEnvFile();
      return c.text(content, 200);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Update root .env file
   * @description Overwrite .env file content located at the project root
   * @tags Config
   */
  static async updateEnv(c: Context) {
    try {
      const body = await c.req.text();
      await ConfigService.updateEnvFile(body ?? '');
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get MediaMTX config
   * @description Read stream/config/mediamtx.yml
   * @tags Config
   */
  static async getMediamtx(c: Context) {
    try {
      const content = await ConfigService.getMediamtxConfig();
      return c.text(content, 200);
    } catch (error: any) {
      const message = error.message || '';
      if (message.includes('not found')) {
        return c.json({ error: 'mediamtx.yml not found' }, 404);
      }
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Update MediaMTX config
   * @description Overwrite stream/config/mediamtx.yml
   * @tags Config
   */
  static async updateMediamtx(c: Context) {
    try {
      const body = await c.req.text();
      await ConfigService.updateMediamtxConfig(body ?? '');
      return c.json({ success: true });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Update Host IP
   * @description Update HOST_IP variable, add IP to SSE_ALLOW_ORIGINS, and replace localhost with IP in BASE_URL and HOMEPAGE_URL in .env file
   * @tags Config
   */
  static async updateHostIp(c: Context) {
    try {
      const body = await c.req.json();
      const { ip } = body;
      
      if (!ip || typeof ip !== 'string') {
        return c.json({ error: 'IP address is required' }, 400);
      }

      await ConfigService.updateHostIp(ip);
      return c.json({ success: true, message: `Updated successfully with IP: ${ip}` });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
}



