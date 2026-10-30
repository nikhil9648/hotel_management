import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const baseURL = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
console.log('MOBILE API BASE URL:', baseURL);

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API SUCCESS:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.log('API BASE URL:', error.config?.baseURL);
    console.log('API PATH:', error.config?.url);
    console.log('API ERROR:', error.message);
    console.log('API STATUS:', error.response?.status);
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) return String(error.response.data.message);
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error.response) return 'Cannot reach the server. Check API URL and network connection.';
  }
  return 'Something went wrong. Please try again.';
}


export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  const root = baseURL.replace(/\/api\/?$/, '');
  if (!root) return undefined;

  // Backend image URLs may contain localhost.
  if (/^https?:\/\//i.test(path)) {
    try {
      const parsed = new URL(path);

      if (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1'
      ) {
        return `${root}${parsed.pathname}${parsed.search}`;
      }

      return path;
    } catch {
      return path;
    }
  }

  if (path.startsWith('//')) {
    return `http:${path}`;
  }

  if (path.startsWith('data:')) return path;

  return `${root}${path.startsWith('/') ? '' : '/'}${path}`;
}

