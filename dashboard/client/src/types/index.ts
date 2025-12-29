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
}

export type Profile = 'appstack' | 'analytics-tools' | 'app' | 'stream' | 'stream-camera';

export interface ComposeAction {
  profile: Profile;
  action: 'up' | 'down';
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


