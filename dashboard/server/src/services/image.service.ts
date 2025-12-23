import { docker } from '../config/docker';
import type { Image, PullProgress } from '../types';

// Store pull progress in memory (in production, use Redis or similar)
const pullProgress = new Map<string, PullProgress>();
const pullStreams = new Map<string, any>();

export class ImageService {
  async listImages(): Promise<Image[]> {
    const images = await docker.listImages({ all: true });
    
    return images.map((image) => ({
      id: image.Id,
      tags: image.RepoTags || ['<none>:<none>'],
      size: image.Size,
      created: image.Created,
      parentId: image.ParentId,
      repoDigests: image.RepoDigests || [],
    }));
  }

  async pullImage(imageName: string): Promise<{ progressId: string }> {
    const progressId = `${imageName}-${Date.now()}`;
    pullProgress.set(progressId, { 
      status: 'starting', 
      progress: 0, 
      logs: [],
      imageName: imageName
    });
    
    docker.pull(imageName, (err: any, stream: any) => {
      if (err) {
        pullProgress.set(progressId, { 
          status: 'error', 
          error: err.message,
          progress: 0,
          logs: [],
          imageName: imageName
        });
        pullStreams.delete(progressId);
        return;
      }
      
      pullProgress.set(progressId, {
        status: 'Pulling from registry',
        progress: 0,
        logs: [],
        imageName: imageName
      });
      
      pullStreams.set(progressId, stream);
      
      stream.on('data', (data: Buffer) => {
        try {
          const current = pullProgress.get(progressId);
          if (!current || current.status === 'cancelled') {
            try {
              if (stream.pause) stream.pause();
              if (stream.destroy) stream.destroy();
            } catch (e) {
              // Ignore
            }
            return;
          }
          
          const json = JSON.parse(data.toString());
          
          let progress = current.progress || 0;
          if (json.progressDetail && json.progressDetail.current && json.progressDetail.total) {
            progress = Math.round((json.progressDetail.current / json.progressDetail.total) * 100);
          } else if (json.status) {
            if (json.status.includes('Downloading') || json.status.includes('Pulling')) {
              progress = Math.min(current.progress + 1, 99);
            }
          }
          
          let status = current.status;
          if (json.status) {
            status = json.status;
          } else if (json.progressDetail) {
            if (json.progressDetail.current && json.progressDetail.total) {
              status = 'Downloading layers';
            }
          }
          
          pullProgress.set(progressId, {
            status: status,
            progress: progress,
            logs: [...(current.logs || []), json],
            id: json.id || current.id,
            progressDetail: json.progressDetail || current.progressDetail,
            imageName: current.imageName || imageName,
          });
        } catch (e: any) {
          console.error('Error parsing pull progress:', e.message);
          const current = pullProgress.get(progressId);
          if (current && current.status !== 'cancelled') {
            pullProgress.set(progressId, {
              ...current,
              status: current.status || 'Processing...',
            });
          }
        }
      });
      
      const timeout = setTimeout(() => {
        const current = pullProgress.get(progressId);
        if (current && current.status === 'starting' && current.progress === 0) {
          pullProgress.set(progressId, {
            ...current,
            status: 'Connecting to registry...',
            progress: 1,
          });
        }
      }, 2000);
      
      stream.on('end', () => {
        clearTimeout(timeout);
        const current = pullProgress.get(progressId);
        if (current && current.status !== 'cancelled') {
          pullProgress.set(progressId, {
            status: 'completed',
            progress: 100,
            logs: current.logs || [],
            imageName: current.imageName || imageName,
          });
        }
        pullStreams.delete(progressId);
        
        setTimeout(() => {
          pullProgress.delete(progressId);
        }, 5 * 60 * 1000);
      });
      
      stream.on('error', (err: any) => {
        clearTimeout(timeout);
        const current = pullProgress.get(progressId);
        if (current && current.status !== 'cancelled') {
          pullProgress.set(progressId, {
            status: 'error',
            error: err.message,
            progress: current.progress || 0,
            logs: current.logs || [],
            imageName: current.imageName || imageName,
          });
        }
        pullStreams.delete(progressId);
      });
    });
    
    return { progressId };
  }

  getPullProgress(progressId: string): PullProgress | null {
    return pullProgress.get(progressId) || null;
  }

  cancelPull(progressId: string): { success: boolean; message: string } {
    const progress = pullProgress.get(progressId);
    const stream = pullStreams.get(progressId);
    
    if (!progress) {
      throw new Error('Progress not found');
    }
    
    if (progress.status === 'completed' || progress.status === 'cancelled') {
      return { success: true, message: 'Pull already completed or cancelled' };
    }
    
    pullProgress.set(progressId, {
      ...progress,
      status: 'cancelled',
      error: 'Pull cancelled by user',
    });
    
    if (stream) {
      try {
        if (typeof stream.pause === 'function') stream.pause();
        if (typeof stream.destroy === 'function') stream.destroy();
        if (typeof stream.abort === 'function') stream.abort();
        stream.removeAllListeners('data');
        stream.removeAllListeners('end');
        stream.removeAllListeners('error');
      } catch (e: any) {
        console.warn('Error stopping stream:', e.message);
      }
      pullStreams.delete(progressId);
    }
    
    setTimeout(() => {
      pullProgress.delete(progressId);
    }, 60 * 1000);
    
    return { success: true, message: 'Pull cancelled successfully' };
  }

  async deleteImage(id: string): Promise<void> {
    const image = docker.getImage(id);
    await image.remove();
  }
}

