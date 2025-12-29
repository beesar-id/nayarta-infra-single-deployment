export type Profile = 'appstack' | 'analytics-tools' | 'app' | 'stream' | 'stream-camera';

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    private: number;
    public?: number;
    type: string;
  }>;
  created: number;
  profile?: Profile | 'unknown';
}

export interface ContainerDetail extends Container {
  started?: string;
  env?: string[];
  State?: any;
  Mounts?: any[];
}

export interface Image {
  id: string;
  tags: string[];
  size: number;
  created: number;
  parentId: string;
  repoDigests: string[];
}

export interface PullProgress {
  status: string;
  progress: number;
  logs: any[];
  id?: string;
  progressDetail?: any;
  error?: string;
  imageName?: string;
}

export interface ComposeResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface ContainerStats {
  cpu: number;
  memory: {
    usage: number;
    limit: number;
  };
  disk: {
    read: number;
    write: number;
  };
  network: {
    rx: number;
    tx: number;
  };
}

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  created: number;
  scope: string;
  labels: Record<string, string>;
  options: Record<string, string>;
  status?: Record<string, any>;
  usageData?: {
    size: number;
    refCount: number;
  };
}

