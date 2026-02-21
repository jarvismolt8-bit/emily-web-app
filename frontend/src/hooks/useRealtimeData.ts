import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE, SSEEvent } from './useSSE'

interface RealtimeState<T> {
  data: T[]
  loading: boolean
  error: string | null
}

type DataFetcher<T> = () => Promise<T[]>
type GetIdFn<T> = (item: T) => string

export function useRealtimeData<T>(
  fetchData: DataFetcher<T>,
  eventTypes: {
    created: string
    updated: string
    deleted: string
  },
  getId: GetIdFn<T>,
  broadcastChannelName?: string
): RealtimeState<T> {
  const [state, setState] = useState<RealtimeState<T>>({
    data: [],
    loading: true,
    error: null
  })

  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (broadcastChannelName) {
      channelRef.current = new BroadcastChannel(broadcastChannelName)
      
      channelRef.current.onmessage = (event) => {
        const { eventType, payload } = event.data as { eventType: string; payload: SSEEvent }
        handleSSEEvent(eventType, payload)
      }

      return () => {
        channelRef.current?.close()
      }
    }
  }, [broadcastChannelName])

  const handleSSEEvent = useCallback((eventType: string, payload: SSEEvent) => {
    setState(prev => {
      if (eventType === eventTypes.created) {
        const exists = prev.data.some(item => getId(item) === getId(payload.data))
        if (exists) return prev
        return { ...prev, data: [payload.data, ...prev.data] }
      }
      
      if (eventType === eventTypes.updated) {
        return {
          ...prev,
          data: prev.data.map(item => 
            getId(item) === getId(payload.data) ? payload.data : item
          )
        }
      }
      
      if (eventType === eventTypes.deleted) {
        return {
          ...prev,
          data: prev.data.filter(item => getId(item) !== getId(payload.data))
        }
      }
      
      return prev
    })
  }, [eventTypes, getId])

  const handleEvent = useCallback((event: SSEEvent) => {
    const eventType = event.type
    handleSSEEvent(eventType, event)
    
    if (channelRef.current) {
      channelRef.current.postMessage({ eventType, payload: event })
    }
  }, [handleSSEEvent])

  useSSE(handleEvent)

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const data = await fetchData()
      setState({ data, loading: false, error: null })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data'
      }))
    }
  }, [fetchData])

  useEffect(() => {
    load()
  }, [load])

  return {
    ...state,
    refresh: load
  }
}

export function useRealtimeCashflow(
  fetchFn: () => Promise<any[]>,
  broadcastChannelName = 'cashflow-updates'
) {
  return useRealtimeData(
    fetchFn,
    {
      created: 'cashflow:created',
      updated: 'cashflow:updated',
      deleted: 'cashflow:deleted'
    },
    (item) => item.id,
    broadcastChannelName
  )
}

export function useRealtimeTasks(
  fetchFn: () => Promise<any[]>,
  broadcastChannelName = 'tasks-updates'
) {
  return useRealtimeData(
    fetchFn,
    {
      created: 'task:created',
      updated: 'task:updated',
      deleted: 'task:deleted'
    },
    (item) => item.id,
    broadcastChannelName
  )
}
