const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface CashflowFilters {
  category?: string
  currency?: string
  search?: string
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

export const cashflowAPI = {
  getAll: async (params: CashflowFilters = {}): Promise<CashflowEntry[]> => {
    const queryString = new URLSearchParams(params as Record<string, string>).toString()
    const response = await fetch(`${API_BASE}/cashflow${queryString ? '?' + queryString : ''}`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to fetch entries')
    return response.json()
  },

  getSummary: async (): Promise<Summary> => {
    const response = await fetch(`${API_BASE}/summary`, {
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to fetch summary')
    return response.json()
  },

  add: async (entry: Partial<CashflowEntry>): Promise<CashflowEntry> => {
    const response = await fetch(`${API_BASE}/cashflow`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(entry)
    })
    if (!response.ok) throw new Error('Failed to add entry')
    return response.json()
  },

  update: async (id: string, entry: Partial<CashflowEntry>): Promise<CashflowEntry> => {
    const response = await fetch(`${API_BASE}/cashflow/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'X-Password': import.meta.env.VITE_PASSWORD
      },
      body: JSON.stringify(entry)
    })
    if (!response.ok) throw new Error('Failed to update entry')
    return response.json()
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/cashflow/${id}`, {
      method: 'DELETE',
      headers: { 'X-Password': import.meta.env.VITE_PASSWORD }
    })
    if (!response.ok) throw new Error('Failed to delete entry')
  }
}
