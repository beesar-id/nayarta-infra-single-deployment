import { docker } from '../config/docker';
import { PROFILE_KEYWORDS } from '../config/constants';
import type { Container, ContainerDetail, ContainerStats, Profile } from '../types';

export class ContainerService {
  async getContainersByProfile(profile?: Profile): Promise<Container[]> {
    try {
      const containers = await docker.listContainers({ all: true });
      
      const projectContainers = containers.filter((container) => {
        const names = container.Names || [];
        const image = container.Image || '';
        
        const isProjectContainer = 
          names.some((name: string | string[]) => name.toString().includes('nayarta')) ||
          image.includes('nayarta');
        
        if (!profile) {
          return isProjectContainer;
        }

        const keywords = PROFILE_KEYWORDS[profile] || [];
        return isProjectContainer && keywords.some(keyword => 
          names.some(name => name.toLowerCase().includes(keyword)) ||
          image.toLowerCase().includes(keyword)
        );
      });

      return projectContainers.map((container) => ({
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
      }));
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

  async getContainerStats(id: string): Promise<ContainerStats> {
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
      } catch (error) {
        console.warn(`Failed to get stats for container ${id}:`, error);
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
}

