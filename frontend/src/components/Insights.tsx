import { useState, useEffect } from 'react'
import { insightsAPI, type InsightSession } from '@/api/insights'
import InsightChartComponent from './InsightChart'
import { BarChart2, Trash2, Loader2 } from 'lucide-react'
import { Button } from './ui/button'

export default function Insights() {
  const [sessions, setSessions] = useState<InsightSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const data = await insightsAPI.getAll()
      setSessions(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()

    const accessToken = localStorage.getItem('cashflow_access_token')
    if (!accessToken) {
      console.warn('[Insights] No access token for SSE')
      return
    }

    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL || '/api/v1'}/events?token=${encodeURIComponent(accessToken)}`)

    eventSource.addEventListener('insights:created', () => {
      fetchSessions()
    })

    return () => {
      eventSource.close()
    }
  }, [])

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Delete this insight session?')) return

    setDeleting(sessionId)
    try {
      await insightsAPI.deleteSession(sessionId)
      setSessions(sessions.filter(s => s.id !== sessionId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Error: {error}</p>
        <Button variant="link" onClick={fetchSessions} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <BarChart2 className="h-8 w-8 opacity-30" />
        <p className="text-sm">No insights yet. Ask Emily on Telegram to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sessions.map((session) => (
        <div key={session.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">{session.prompt}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(session.generated_at)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(session.id)}
              disabled={deleting === session.id}
            >
              {deleting === session.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              )}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {session.charts.map((chart) => (
              <InsightChartComponent key={chart.id} chart={chart} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
