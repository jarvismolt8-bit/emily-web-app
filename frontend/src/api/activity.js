const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const activityAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/activity-logs${queryString ? '?' + queryString : ''}`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to fetch activity logs');
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE}/activity-logs/stats`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to fetch activity stats');
    return response.json();
  },

  add: async (log) => {
    const response = await fetch(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(log)
    });
    if (!response.ok) throw new Error('Failed to add activity log');
    return response.json();
  }
};
