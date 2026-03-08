const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

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

interface User {
  id: string
  username: string
  email: string
  permissions: string[]
}

interface LoginResponse {
  accessToken: string
  user: User
}

interface RefreshResponse {
  accessToken: string
}

const ACCESS_TOKEN_KEY = 'cashflow_access_token';
const REFRESH_COOKIE_NAME = 'refreshToken';

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'web_app'
      },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Login failed')
    }
    
    setAccessToken(data.accessToken)
    return data
  },

  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        credentials: 'include'
      })
    } catch (error) {
      console.warn('[Auth] Logout API call failed:', error)
    } finally {
      setAccessToken(null)
    }
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}`)
    }
    
    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error?.message || 'Refresh failed')
    }
    
    setAccessToken(data.accessToken)
    return data
  },

  isAuthenticated: (): boolean => {
    return !!accessToken
  }
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  }
  
  let response = await fetch(url, { ...options, headers })
  
  if (response.status === 401) {
    try {
      await authAPI.refresh()
      const newToken = getAccessToken()
      headers['Authorization'] = `Bearer ${newToken}`
      response = await fetch(url, { ...options, headers })
    } catch (error) {
      setAccessToken(null)
      window.dispatchEvent(new CustomEvent('auth:logout'))
      throw error
    }
  }
  
  return response
}

export type { User, LoginResponse, RefreshResponse }
