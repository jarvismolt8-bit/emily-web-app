const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const tasksAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/tasks`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  },

  add: async (task) => {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to add task');
    return response.json();
  },

  update: async (id, task) => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  },

  delete: async (id) => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    });
    if (!response.ok) throw new Error('Failed to delete task');
  }
};
