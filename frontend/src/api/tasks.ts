const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
  error?: { code: string; message: string }
}

async function unwrapResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}`)
  }
  const envelope: ApiEnvelope<T> = await response.json()
  if (!envelope.success) {
    throw new Error(envelope.error?.message || 'Request failed')
  }
  return envelope.data
}

interface TaskFilters {
  sortBy?: 'id' | 'date' | 'priority'
  sortOrder?: 'asc' | 'desc'
  status?: string
}

interface Task {
  id: string
  name: string
  description?: string
  date?: string
  time?: string
  status: 'backlog' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
}

interface TaskFormData {
  name: string
  description: string
  date: string
  time: string
  status: string
  priority: string
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Password': import.meta.env.VITE_PASSWORD,
  'X-Source': 'web_app'
})

export const tasksAPI = {
  getAll: async (filters?: TaskFilters): Promise<Task[]> => {
    const queryString = filters ? new URLSearchParams(filters as Record<string, string>).toString() : ''
    const response = await fetch(`${API_BASE}/tasks${queryString ? '?' + queryString : ''}`, {
      headers: headers()
    })
    return unwrapResponse<Task[]>(response)
  },

  getById: async (id: string): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      headers: headers()
    })
    return unwrapResponse<Task>(response)
  },

  add: async (task: TaskFormData): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(task)
    })
    return unwrapResponse<Task>(response)
  },

  update: async (id: string, task: TaskFormData): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(task)
    })
    return unwrapResponse<Task>(response)
  },

  updateStatus: async (id: string, status: 'backlog' | 'in_progress' | 'done'): Promise<Task> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ status })
    })
    return unwrapResponse<Task>(response)
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: headers()
    })
    await unwrapResponse<{ id: string }>(response)
  },

  deleteByName: async (name: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/tasks?name=${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: headers()
    })
    await unwrapResponse<{ id: string }>(response)
  }
}

export type { Task, TaskFormData }
