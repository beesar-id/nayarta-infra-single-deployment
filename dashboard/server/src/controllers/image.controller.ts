import { Context } from 'hono';
import { ImageService } from '../services/image.service';

const imageService = new ImageService();

export class ImageController {
  /**
   * @summary Get all images
   * @description Get list of all Docker images
   */
  static async getImages(c: Context) {
    try {
      const images = await imageService.listImages();
      return c.json({ images, count: images.length });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Pull image
   * @description Pull a Docker image from registry with progress tracking
   * @body { imageName: string }
   */
  static async pullImage(c: Context) {
    try {
      const { imageName } = await c.req.json();
      
      if (!imageName) {
        return c.json({ error: 'Image name is required' }, 400);
      }
      
      const result = await imageService.pullImage(imageName);
      return c.json({ success: true, progressId: result.progressId });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Get pull progress
   * @description Get progress of an image pull operation
   * @param progressId - Progress ID returned from pull endpoint
   */
  static async getPullProgress(c: Context) {
    try {
      const progressId = c.req.param('progressId');
      const progress = imageService.getPullProgress(progressId);
      
      if (!progress) {
        return c.json({ error: 'Progress not found' }, 404);
      }
      
      return c.json(progress);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Cancel pull
   * @description Cancel an ongoing image pull operation
   * @param progressId - Progress ID returned from pull endpoint
   */
  static async cancelPull(c: Context) {
    try {
      const progressId = c.req.param('progressId');
      const result = imageService.cancelPull(progressId);
      return c.json(result);
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }

  /**
   * @summary Delete image
   * @description Delete a Docker image
   * @param id - Image ID
   */
  static async deleteImage(c: Context) {
    try {
      const imageId = c.req.param('id');
      await imageService.deleteImage(imageId);
      return c.json({ success: true, message: 'Image deleted successfully' });
    } catch (error: any) {
      return c.json({ error: error.message }, 500);
    }
  }
}

