const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface Task {
  id: string
  name: string
  date?: string
  time?: string
  status: string
  priority: string
}

interface TaskFormData {
  name: string
  date: string
  time: string
  status: string
  priority: string
}

export const tasksAPI = {
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(`${API_BASE}/tasks`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to fetch tasks')
    return response.json()
  },

  add: async (task: TaskFormData): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(task)
    })
    if (!response.ok) throw new Error('Failed to add task')
    return response.json()
  },

  update: async (id: string, task: TaskFormData): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(task)
    })
    if (!response.ok) throw new Error('Failed to update task')
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to delete task')
  }
}
