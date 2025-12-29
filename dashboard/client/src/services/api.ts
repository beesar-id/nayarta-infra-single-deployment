import axios from 'axios';
import type { Container, ContainerDetail, Profile, Image, PullProgress, Volume } from '../types';

// Use relative path for proxy in development, or full URL if VITE_API_URL is set
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
// api.interceptors.request.use(
//   (config) => {
//     console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
//     return config;
//   },
//   (error) => {
//     console.error('[API Request Error]', error);
//     return Promise.reject(error);
//   }
// );

// Add response interceptor for debugging
// api.interceptors.response.use(
//   (response) => {
//     console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
//     return response;
//   },
//   (error) => {
//     console.error('[API Response Error]', error.response?.status, error.response?.data || error.message);
//     return Promise.reject(error);
//   }
// );

export const apiService = {
  // Get all profiles
  getProfiles: async (): Promise<string[]> => {
    const response = await api.get('/api/profiles');
    return response.data.profiles;
  },

  // Get containers
  getContainers: async (profile?: Profile): Promise<Container[]> => {
    const params = profile ? { profile } : {};
    const response = await api.get('/api/containers', { params });
    return response.data.containers;
  },

  // Get container details
  getContainerDetails: async (id: string): Promise<ContainerDetail> => {
    const response = await api.get(`/api/containers/${id}`);
    return response.data;
  },

  // Execute docker compose command
  executeCompose: async (profile: Profile, action: 'up' | 'down'): Promise<{ success: boolean; message: string; output?: string; error?: string }> => {
    const response = await api.post(`/api/compose/${profile}/${action}`);
    return response.data;
  },

  // Container control
  containerAction: async (id: string, action: 'start' | 'stop' | 'restart' | 'remove'): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/containers/${id}/${action}`);
    return response.data;
  },

  // Apply changes (docker compose down and up)
  applyChanges: async (): Promise<{ success: boolean; message: string; applied: string[]; errors: string[] }> => {
    const response = await api.post('/api/containers/apply');
    return response.data;
  },

  // Get container logs
  getContainerLogs: async (id: string, tail: number = 100): Promise<string> => {
    const response = await api.get(`/api/containers/${id}/logs`, {
      params: { tail },
    });
    return response.data;
  },

  // Get container stats
  getContainerStats: async (id: string): Promise<any> => {
    const response = await api.get(`/api/containers/${id}/stats`);
    return response.data;
  },

  // Get aggregate stats for multiple containers
  getAggregateStats: async (containerIds: string[]): Promise<any> => {
    const response = await api.post('/api/containers/stats/aggregate', {
      containerIds,
    });
    return response.data;
  },

  // Get all images
  getImages: async (): Promise<Image[]> => {
    const response = await api.get('/api/images');
    return response.data.images;
  },

  // Pull image
  pullImage: async (imageName: string): Promise<{ success: boolean; progressId: string }> => {
    const response = await api.post('/api/images/pull', { imageName });
    return response.data;
  },

  // Get pull progress
  getPullProgress: async (progressId: string): Promise<PullProgress> => {
    const response = await api.get(`/api/images/pull/progress/${progressId}`);
    return response.data;
  },

  // Cancel pull
  cancelPull: async (progressId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/images/pull/cancel/${progressId}`);
    return response.data;
  },

  // Delete image
  deleteImage: async (imageId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/images/${imageId}`);
    return response.data;
  },

  // Get all volumes
  getVolumes: async (): Promise<Volume[]> => {
    const response = await api.get('/api/volumes');
    return response.data.volumes;
  },

  // Get volume details
  getVolumeDetails: async (name: string): Promise<Volume> => {
    const response = await api.get(`/api/volumes/${name}`);
    return response.data;
  },

  // Delete volume
  deleteVolume: async (name: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/volumes/${name}`);
    return response.data;
  },

  // Get root .env content
  getEnvConfig: async (): Promise<string> => {
    const response = await api.get('/api/config/env', {
      responseType: 'text',
      transformResponse: (data) => data,
    });
    return response.data;
  },

  // Update root .env content
  updateEnvConfig: async (content: string): Promise<{ success: boolean }> => {
    const response = await api.put('/api/config/env', content, {
      headers: { 'Content-Type': 'text/plain' },
    });
    return response.data;
  },

  // Get MediaMTX config
  getMediamtxConfig: async (): Promise<string> => {
    const response = await api.get('/api/config/mediamtx', {
      responseType: 'text',
      transformResponse: (data) => data,
    });
    return response.data;
  },

  // Update MediaMTX config
  updateMediamtxConfig: async (content: string): Promise<{ success: boolean }> => {
    const response = await api.put('/api/config/mediamtx', content, {
      headers: { 'Content-Type': 'text/plain' },
    });
    return response.data;
  },

  // Update HOST_IP and SSE_ALLOW_ORIGINS
  updateHostIp: async (ip: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.put('/api/config/host-ip', { ip });
    return response.data;
  },

  // Pull Image by IP
  pullImageByIp: async (ip: string, githubToken?: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/config/pull-image', { ip, githubToken });
    return response.data;
  },

  // Reset to Default
  resetToDefault: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/config/reset-default');
    return response.data;
  },
};

