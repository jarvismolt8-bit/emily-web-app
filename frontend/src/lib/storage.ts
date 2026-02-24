const CACHE_KEY = 'emily_chat_cache'
const MAX_CACHED_MESSAGES = 50

export interface CachedMessage {
  type: string
  sender: 'user' | 'emily' | 'system' | 'error'
  content: string
  timestamp: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  thinking?: string
}

export interface ToolCall {
  name: string
  args?: Record<string, unknown>
}

export interface ToolResult {
  name: string
  output?: string
  success?: boolean
}

export function getCachedMessages(): CachedMessage[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.error('[Storage] Failed to read cache:', e)
  }
  return []
}

export function setCachedMessages(messages: CachedMessage[]): void {
  try {
    const trimmed = messages.slice(-MAX_CACHED_MESSAGES)
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('[Storage] Failed to write cache:', e)
  }
}

export function clearCachedMessages(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (e) {
    console.error('[Storage] Failed to clear cache:', e)
  }
}

export function addToCache(message: CachedMessage): void {
  const cached = getCachedMessages()
  cached.push(message)
  setCachedMessages(cached)
}
