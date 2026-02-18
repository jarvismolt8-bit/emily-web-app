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
  timestamp: string
  date: string
  time: string
  timezone: string
  actor: string
  source: string
  action_type: string
  description: string
  details: Record<string, unknown>
  status: string
  error_message?: string
}

interface ActivityLogsData {
  logs: ActivityLog[]
  total_count: number
  last_cleanup: string | null
}

interface ActivityStats {
  total_logs: number
  success_count: number
  failed_count: number
  action_types: Record<string, number>
  sources: Record<string, number>
  last_cleanup: string | null
}

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Password': import.meta.env.VITE_PASSWORD,
  'X-Source': 'web_app'
})

export const activityAPI = {
  getAll: async (params: ActivityLogParams = {}): Promise<ActivityLogsData> => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const response = await fetch(`${API_BASE}/activity-logs${queryString ? '?' + queryString : ''}`, {
      headers: headers()
    })
    return unwrapResponse<ActivityLogsData>(response)
  },

  getStats: async (): Promise<ActivityStats> => {
    const response = await fetch(`${API_BASE}/activity-logs/stats`, {
      headers: headers()
    })
    return unwrapResponse<ActivityStats>(response)
  },

  add: async (log: Partial<ActivityLog>): Promise<ActivityLog> => {
    const response = await fetch(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(log)
    })
    return unwrapResponse<ActivityLog>(response)
  }
}

export type { ActivityLog, ActivityLogsData, ActivityStats, ActivityLogParams }
