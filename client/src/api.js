// client/src/api.js
export const API_BASE = '/api';

export const customFetch = (endpoint, options = {}) => {
  return fetch(`${API_BASE}${endpoint}`, options);
};