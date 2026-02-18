const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ActivityLogParams {
  search?: string
  action_type?: string
  status?: string
  source?: string
  date_from?: string
  date_to?: string
}

interface ActivityLog {
  id: string
  date: string
  time: string
  source: string
  action_type: string
  description: string
  status: string
  error_message?: string
}

interface ActivityStats {
  total_logs: number
  success_count: number
  failed_count: number
  last_cleanup?: string
}

interface ActivityLogsResponse {
  logs: ActivityLog[]
}

export const activityAPI = {
  getAll: async (params: ActivityLogParams = {}): Promise<ActivityLogsResponse> => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const response = await fetch(`${API_BASE}/activity-logs${queryString ? '?' + queryString : ''}`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to fetch activity logs')
    return response.json()
  },

  getStats: async (): Promise<ActivityStats> => {
    const response = await fetch(`${API_BASE}/activity-logs/stats`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to fetch activity stats')
    return response.json()
  },

  add: async (log: Partial<ActivityLog>): Promise<ActivityLog> => {
    const response = await fetch(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(log)
    })
    if (!response.ok) throw new Error('Failed to add activity log')
    return response.json()
  }
}
