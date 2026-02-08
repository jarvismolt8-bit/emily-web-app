const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const cashflowAPI = {
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/cashflow${queryString ? '?' + queryString : ''}`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to fetch entries');
    return response.json();
  },

  getSummary: async () => {
    const response = await fetch(`${API_BASE}/summary`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  add: async (entry) => {
    const response = await fetch(`${API_BASE}/cashflow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to add entry');
    return response.json();
  },

  update: async (id, entry) => {
    const response = await fetch(`${API_BASE}/cashflow/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(entry)
    });
    if (!response.ok) throw new Error('Failed to update entry');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE}/cashflow/${id}`, {
      method: 'DELETE',
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to delete entry');
  }
};
