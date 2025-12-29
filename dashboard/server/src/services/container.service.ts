import { docker } from '../config/docker';
import { PROFILE_KEYWORDS, PROFILES } from '../config/constants';
import { DockerComposeService } from './docker-compose.service';
import type { Container, ContainerDetail, ContainerStats, Profile } from '../types';

export class ContainerService {
  async getContainersByProfile(profile?: Profile): Promise<Container[]> {
    try {
      const containers = await docker.listContainers({ all: true });
      
      // Inspect all containers in parallel to get labels
      const inspectPromises = containers.map(async (container) => {
        try {
          const containerInstance = docker.getContainer(container.Id);
          const inspect = await containerInstance.inspect();
          return {
            ...container,
            labels: inspect.Config.Labels || {},
          };
        } catch (error) {
          // If inspect fails, return container without labels
          return {
            ...container,
            labels: {},
          };
        }
      });

      const containersWithLabels = await Promise.all(inspectPromises);
      
      // Filter by label com.project.name=nayarta
      const projectContainers = containersWithLabels.filter((container) => {
        const labels = container.labels || {};
        const projectName = labels['com.project.name'];
        return projectName === 'nayarta';
      });
      
      // If profile is specified, filter by profile keywords
      let filteredContainers = projectContainers;
      if (profile) {
        const keywords = PROFILE_KEYWORDS[profile] || [];
        filteredContainers = projectContainers.filter((container) => {
          const names = container.Names || [];
          const image = container.Image || '';
          const labels = container.labels || {};
          
          // Check in names, image, or labels
          return keywords.some(keyword => 
            names.some((name: string | string[]) => name.toString().toLowerCase().includes(keyword)) ||
            image.toLowerCase().includes(keyword) ||
            Object.values(labels).some((labelValue: string) => labelValue.toLowerCase().includes(keyword))
          );
        });
      }

      return filteredContainers.map((container) => {
        // Determine profile from container
        const containerProfile = this.determineContainerProfile(container);
        
        return {
          id: container.Id,
          name: container.Names?.[0]?.replace('/', '') || 'unknown',
          image: container.Image,
          status: container.Status,
          state: container.State,
          ports: container.Ports?.map(p => ({
            private: p.PrivatePort,
            public: p.PublicPort,
            type: p.Type,
          })) || [],
          created: container.Created,
          profile: containerProfile,
        };
      });
    } catch (error: any) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  }

  async getContainerDetails(id: string): Promise<ContainerDetail> {
    const container = docker.getContainer(id);
    const inspect = await container.inspect();
    
    return {
      id: inspect.Id,
      name: inspect.Name.replace('/', ''),
      image: inspect.Config.Image,
      status: inspect.State.Status,
      state: inspect.State.Status,
      created: new Date(inspect.Created).getTime() / 1000,
      started: inspect.State.StartedAt,
      ports: [],
      env: inspect.Config.Env || [],
      State: inspect.State,
      Mounts: inspect.Mounts || [],
    };
  }

  async getContainerStats(id: string): Promise<ContainerStats | null> {
    try {
      const container = docker.getContainer(id);
      const stats = await container.stats({ stream: false });
      
      // Calculate CPU usage with null checks
      let cpuPercent = 0;
      if (stats.cpu_stats?.cpu_usage?.total_usage && stats.precpu_stats?.cpu_usage?.total_usage) {
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats.system_cpu_usage || 0);
        const numCpus = stats.cpu_stats.online_cpus || 1;
        cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
      }
      
      const memoryUsage = stats.memory_stats?.usage || 0;
      const memoryLimit = stats.memory_stats?.limit || 0;
      
      const blkioStats = stats.blkio_stats?.io_service_bytes_recursive || [];
      const diskRead = blkioStats.find((s: any) => s.op === 'Read')?.value || 0;
      const diskWrite = blkioStats.find((s: any) => s.op === 'Write')?.value || 0;
      
      const networks = stats.networks || {};
      let networkRx = 0;
      let networkTx = 0;
      Object.values(networks).forEach((net: any) => {
        networkRx += net.rx_bytes || 0;
        networkTx += net.tx_bytes || 0;
      });
      
      return {
        cpu: cpuPercent / 100,
        memory: {
          usage: memoryUsage,
          limit: memoryLimit,
        },
        disk: {
          read: diskRead,
          write: diskWrite,
        },
        network: {
          rx: networkRx,
          tx: networkTx,
        },
      };
    } catch (error: any) {
      // Container not found or not running - return null instead of throwing
      if (error.statusCode === 404 || error.message?.includes('no such container')) {
        return null;
      }
      throw error;
    }
  }

  async getAggregateStats(containerIds: string[]): Promise<ContainerStats> {
    let totalCpu = 0;
    let totalMemoryUsage = 0;
    let totalMemoryLimit = 0;
    let totalDiskRead = 0;
    let totalDiskWrite = 0;
    let totalNetworkRx = 0;
    let totalNetworkTx = 0;

    const statsPromises = containerIds.map(async (id: string) => {
      try {
        return await this.getContainerStats(id);
      } catch (error: any) {
        // Silently ignore 404 errors (container not found/removed)
        if (error.statusCode === 404 || error.message?.includes('no such container')) {
          return null;
        }
        // Only log non-404 errors
        console.warn(`Failed to get stats for container ${id.substring(0, 12)}:`, error.message || error);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);
    
    results.forEach((result) => {
      if (result) {
        totalCpu += result.cpu;
        totalMemoryUsage += result.memory.usage;
        totalMemoryLimit += result.memory.limit;
        totalDiskRead += result.disk.read;
        totalDiskWrite += result.disk.write;
        totalNetworkRx += result.network.rx;
        totalNetworkTx += result.network.tx;
      }
    });

    return {
      cpu: totalCpu,
      memory: {
        usage: totalMemoryUsage,
        limit: totalMemoryLimit,
      },
      disk: {
        read: totalDiskRead,
        write: totalDiskWrite,
      },
      network: {
        rx: totalNetworkRx,
        tx: totalNetworkTx,
      },
    };
  }

  async getContainerLogs(id: string, tail: number = 100): Promise<string> {
    const container = docker.getContainer(id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: tail,
      timestamps: true,
    });
    return logs.toString();
  }

  async containerAction(id: string, action: 'start' | 'stop' | 'restart' | 'remove'): Promise<void> {
    const container = docker.getContainer(id);
    
    switch (action) {
      case 'start':
        await container.start();
        break;
      case 'stop':
        await container.stop();
        break;
      case 'restart':
        await container.restart();
        break;
      case 'remove':
        await container.remove({ force: true });
        break;
      default:
        throw new Error('Invalid action');
    }
  }

  /**
   * Determine container profile based on names, image, and labels
   */
  private determineContainerProfile(container: any): Profile | 'unknown' {
    const names = container.Names || [];
    const image = container.Image || '';
    const labels = container.labels || {};
    
    // Check each profile
    for (const [profile, keywords] of Object.entries(PROFILE_KEYWORDS)) {
      const profileKeywords = keywords as string[];
      const matches = profileKeywords.some(keyword => 
        names.some((name: string | string[]) => name.toString().toLowerCase().includes(keyword)) ||
        image.toLowerCase().includes(keyword) ||
        Object.values(labels).some((labelValue: string) => labelValue.toLowerCase().includes(keyword))
      );
      
      if (matches) {
        return profile as Profile;
      }
    }
    
    return 'unknown';
  }

  /**
   * Apply changes by doing docker compose down and up for profiles with running containers
   */
  async applyChanges(): Promise<{ applied: string[]; errors: string[] }> {
    try {
      const containers = await docker.listContainers({ all: false }); // Only running containers
      
      // Filter to only project containers
      const inspectPromises = containers.map(async (container) => {
        try {
          const containerInstance = docker.getContainer(container.Id);
          const inspect = await containerInstance.inspect();
          return {
            ...container,
            labels: inspect.Config.Labels || {},
          };
        } catch (error) {
          return {
            ...container,
            labels: {},
          };
        }
      });

      const containersWithLabels = await Promise.all(inspectPromises);
      
      const projectContainers = containersWithLabels.filter((container) => {
        const labels = container.labels || {};
        return labels['com.project.name'] === 'nayarta';
      });

      // Determine which profiles have running containers
      const profilesWithContainers = new Set<Profile>();
      
      for (const container of projectContainers) {
        const profile = this.determineContainerProfile(container);
        if (profile !== 'unknown' && PROFILES.includes(profile)) {
          profilesWithContainers.add(profile);
        }
      }

      if (profilesWithContainers.size === 0) {
        return { applied: [], errors: ['No running containers found'] };
      }

      const composeService = new DockerComposeService();
      const applied: string[] = [];
      const errors: string[] = [];

      // For each profile, do down then up
      for (const profile of profilesWithContainers) {
        try {
          // First, do down
          const downResult = await composeService.execute(profile, 'down', false);
          if (!downResult.success) {
            errors.push(`Profile ${profile} down failed: ${downResult.error}`);
            continue;
          }

          // Then, do up
          const upResult = await composeService.execute(profile, 'up', true);
          if (!upResult.success) {
            errors.push(`Profile ${profile} up failed: ${upResult.error}`);
            continue;
          }

          applied.push(profile);
        } catch (error: any) {
          errors.push(`Profile ${profile}: ${error.message}`);
        }
      }

      return { applied: Array.from(applied), errors };
    } catch (error: any) {
      throw new Error(`Failed to apply changes: ${error.message}`);
    }
  }
}

