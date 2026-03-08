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

interface CashflowFilters {
  category?: string
  currency?: string
  search?: string
  startDate?: string
  endDate?: string
  sortBy?: 'date' | 'category' | 'amount'
  sortOrder?: 'asc' | 'desc'
}

interface CashflowEntry {
  id: string
  date: string
  time: string
  item: string
  notes?: string
  category: string
  currency: string
  amount: number
}

interface Summary {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
}

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAccessToken()}`,
  'X-Source': 'web_app'
})

export const cashflowAPI = {
  getAll: async (params: CashflowFilters = {}): Promise<CashflowEntry[]> => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const response = await fetchWithAuth(`${API_BASE}/cashflow${queryString ? '?' + queryString : ''}`, {
      headers: headers()
    })
    return unwrapResponse<CashflowEntry[]>(response)
  },

  getById: async (id: string): Promise<CashflowEntry> => {
    const response = await fetchWithAuth(`${API_BASE}/cashflow/${id}`, {
      headers: headers()
    })
    return unwrapResponse<CashflowEntry>(response)
  },

  getSummary: async (params: { startDate?: string; endDate?: string } = {}): Promise<Summary> => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const response = await fetchWithAuth(`${API_BASE}/cashflow/summary${queryString ? '?' + queryString : ''}`, {
      headers: headers()
    })
    return unwrapResponse<Summary>(response)
  },

  add: async (entry: Partial<CashflowEntry>): Promise<CashflowEntry> => {
    const response = await fetchWithAuth(`${API_BASE}/cashflow`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(entry)
    })
    return unwrapResponse<CashflowEntry>(response)
  },

  update: async (id: string, entry: Partial<CashflowEntry>): Promise<CashflowEntry> => {
    const response = await fetchWithAuth(`${API_BASE}/cashflow/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(entry)
    })
    return unwrapResponse<CashflowEntry>(response)
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE}/cashflow/${id}`, {
      method: 'DELETE',
      headers: headers()
    })
    await unwrapResponse<{ id: string }>(response)
  }
}
