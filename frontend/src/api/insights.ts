import { fetchWithAuth } from '../api/auth'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export interface InsightChartData {
  label: string
  value: number
}

export interface InsightChart {
  id: string
  type: 'donut' | 'bar' | 'line' | 'area'
  title: string
  explanation: string
  x_axis_label: string
  y_axis_label: string
  chart_data: InsightChartData[]
  sort_order: number
}

export interface InsightSession {
  id: string
  requested_by: string
  prompt: string
  generated_at: string
  created_at: string
  charts: InsightChart[]
}

async function unwrapResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`)
  }
  if (!data.success) {
    throw new Error(data.error || 'Request failed')
  }
  return data.data
}

export const insightsAPI = {
  getAll: async (): Promise<InsightSession[]> => {
    const response = await fetchWithAuth(`${API_BASE}/insights`)
    return unwrapResponse<InsightSession[]>(response)
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/insights/${sessionId}`, {
      method: 'DELETE'
    })
    await unwrapResponse<void>(response)
  }
}
