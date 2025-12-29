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
      status: 'Connecting to registry...', 
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
      
      // Update status immediately when stream is ready
      pullProgress.set(progressId, {
        status: 'Checking for updates...',
        progress: 5,
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
          
          // Handle multiple JSON objects in buffer (newline-separated)
          const dataStr = data.toString();
          const lines = dataStr.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const json = JSON.parse(line);
              
              // Check for "Image is up to date" or "already exists" messages
              const statusText = json.status || '';
              const isUpToDate = statusText.includes('Image is up to date') || 
                                statusText.includes('already exists') ||
                                statusText.includes('already up to date') ||
                                statusText.includes('Status: Image is up to date');
              
              if (isUpToDate) {
                // Image is already up to date, mark as completed immediately
                const updatedCurrent = pullProgress.get(progressId);
                if (updatedCurrent && updatedCurrent.status !== 'cancelled') {
                  pullProgress.set(progressId, {
                    status: 'Image is up to date',
                    progress: 100,
                    logs: [...(updatedCurrent.logs || []), json],
                    id: json.id || updatedCurrent.id,
                    progressDetail: json.progressDetail || updatedCurrent.progressDetail,
                    imageName: updatedCurrent.imageName || imageName,
                  });
                }
                // Complete the pull immediately
                setTimeout(() => {
                  const finalCurrent = pullProgress.get(progressId);
                  if (finalCurrent && finalCurrent.status !== 'cancelled') {
                    pullProgress.set(progressId, {
                      ...finalCurrent,
                      status: 'completed',
                      progress: 100,
                    });
                    pullStreams.delete(progressId);
                  }
                }, 500);
                continue;
              }
              
              let progress = current.progress || 0;
              if (json.progressDetail && json.progressDetail.current && json.progressDetail.total) {
                progress = Math.round((json.progressDetail.current / json.progressDetail.total) * 100);
              } else if (json.status) {
                if (json.status.includes('Downloading') || json.status.includes('Pulling')) {
                  progress = Math.min((current.progress || 0) + 1, 99);
                } else if (json.status.includes('Extracting') || json.status.includes('Verifying')) {
                  progress = Math.min((current.progress || 0) + 2, 99);
                } else if (json.status.includes('Pull complete') || json.status.includes('Download complete')) {
                  progress = Math.min((current.progress || 0) + 10, 99);
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
              
              const updatedCurrent = pullProgress.get(progressId);
              if (updatedCurrent && updatedCurrent.status !== 'cancelled') {
                pullProgress.set(progressId, {
                  status: status,
                  progress: progress,
                  logs: [...(updatedCurrent.logs || []), json],
                  id: json.id || updatedCurrent.id,
                  progressDetail: json.progressDetail || updatedCurrent.progressDetail,
                  imageName: updatedCurrent.imageName || imageName,
                });
              }
            } catch (parseError: any) {
              // Silently skip invalid JSON lines (common with Docker stream)
              // Only log if it's not a JSON parse error (which is expected)
              if (!parseError.message?.includes('JSON') && !parseError.message?.includes('parse')) {
                console.warn('Error processing pull progress line:', parseError.message);
              }
              // Continue processing other lines
              continue;
            }
          }
        } catch (e: any) {
          // Silently ignore parsing errors - they're common with Docker streams
          // Only update status if we have a current progress
          const current = pullProgress.get(progressId);
          if (current && current.status !== 'cancelled' && current.status !== 'Processing...') {
            pullProgress.set(progressId, {
              ...current,
              status: current.status || 'Processing...',
            });
          }
        }
      });
      
      stream.on('end', () => {
        const current = pullProgress.get(progressId);
        if (current && current.status !== 'cancelled') {
          // If status is already "Image is up to date", keep it, otherwise mark as completed
          const finalStatus = current.status === 'Image is up to date' 
            ? 'completed' 
            : 'completed';
          
          // Add completion log entry
          const completionLog = {
            status: finalStatus === 'completed' ? 'Pull complete' : 'Image is up to date',
            id: current.id,
          };
          
          pullProgress.set(progressId, {
            status: finalStatus,
            progress: 100,
            logs: [...(current.logs || []), completionLog],
            imageName: current.imageName || imageName,
          });
        }
        pullStreams.delete(progressId);
        
        // Keep progress for a bit longer so frontend can fetch final status
        setTimeout(() => {
          pullProgress.delete(progressId);
        }, 10 * 1000); // 10 seconds instead of 5 minutes
      });
      
      stream.on('error', (err: any) => {
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

