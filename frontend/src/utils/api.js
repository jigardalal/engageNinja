/**
 * API Configuration Utility
 * Centralizes API base URL configuration for the frontend
 */

// Get API base URL from environment or detect dynamically
export const getApiBaseUrl = () => {
  // Check environment variable first (Vite injects VITE_ prefixed vars)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // During development: use relative paths (Vite proxy handles routing)
  // During production: use relative paths (proxy/same-origin handles routing)
  return '';
};

// Get full API URL for a path
export const getApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : path;
};

// Standard fetch options with credentials
export const getFetchOptions = (method = 'GET', body = null) => {
  const options = {
    method,
    credentials: 'include', // Include cookies for session auth
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
};

// Convenience method for API calls
export const apiCall = async (path, options = {}) => {
  const url = getApiUrl(path);
  const fetchOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options,
    method: options.method || 'GET'
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  return response;
};

export default {
  getApiBaseUrl,
  getApiUrl,
  getFetchOptions,
  apiCall
};
