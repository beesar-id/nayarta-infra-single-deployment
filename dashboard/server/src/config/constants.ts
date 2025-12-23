export const PROFILES = ['appstack', 'analytics-tools', 'app', 'stream', 'stream-camera'] as const;

export const PROJECT_ROOT = process.env.PROJECT_ROOT || '/Users/betuahanugerah/Development/project/project-beesar/nayarta-onprem-compose';

export const PORT = Number.parseInt(process.env.PORT || '3001', 10);

export const PROFILE_KEYWORDS: Record<string, string[]> = {
  appstack: ['nayarta', 'api', 'admin', 'fe', 'frontend', 'stream', 'camera', 'nvr', 'mqtt', 'emqx', 'mediamtx', 'postgres', 'database', 'minio'],
  'analytics-tools': ['rabbitmq', 'clickhouse', 'ch-server', 'analytics', 'ch-web', 'ch-client'],
  app: ['api', 'admin', 'fe', 'frontend', 'sse'],
  stream: ['stream', 'mediamtx', 'nvr'],
  'stream-camera': ['stream-camera', 'cam1', 'cam2', 'cam3', 'cam4'],
};

