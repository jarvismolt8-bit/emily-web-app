import { fetchWithAuth, getAccessToken } from '../api/auth'

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
  limit?: number
  offset?: number
}

interface ActivityLogsData {
  logs: ActivityLog[]
  total_count: number
  limit: number
  offset: number
  has_more: boolean
  last_cleanup: string | null
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
  'Authorization': `Bearer ${getAccessToken()}`,
  'X-Source': 'web_app'
})

export const activityAPI = {
  getAll: async (params: ActivityLogParams = {}): Promise<ActivityLogsData> => {
    const queryParams = new URLSearchParams()
    
    if (params.search) queryParams.set('search', params.search)
    if (params.action_type) queryParams.set('action_type', params.action_type)
    if (params.status) queryParams.set('status', params.status)
    if (params.source) queryParams.set('source', params.source)
    if (params.date_from) queryParams.set('date_from', params.date_from)
    if (params.date_to) queryParams.set('date_to', params.date_to)
    if (params.limit) queryParams.set('limit', params.limit.toString())
    if (params.offset) queryParams.set('offset', params.offset.toString())
    
    const queryString = queryParams.toString()
    const response = await fetchWithAuth(`${API_BASE}/activity-logs${queryString ? '?' + queryString : ''}`, {
      headers: headers()
    })
    return unwrapResponse<ActivityLogsData>(response)
  },

  getStats: async (): Promise<ActivityStats> => {
    const response = await fetchWithAuth(`${API_BASE}/activity-logs/stats`, {
      headers: headers()
    })
    return unwrapResponse<ActivityStats>(response)
  },

  add: async (log: Partial<ActivityLog>): Promise<ActivityLog> => {
    const response = await fetchWithAuth(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(log)
    })
    return unwrapResponse<ActivityLog>(response)
  }
}

export type { ActivityLog, ActivityLogsData, ActivityStats, ActivityLogParams }
