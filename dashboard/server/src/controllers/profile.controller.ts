import { Context } from 'hono';
import { PROFILES } from '../config/constants';

export class ProfileController {
  /**
   * @summary Get all available profiles
   * @description Returns a list of all available Docker Compose profiles
   */
  static async getProfiles(c: Context) {
    return c.json({ profiles: PROFILES });
  }
}

