import { useState, useEffect } from 'react'
import { activityAPI } from '../api/activity'
import ActivityLogTable from './ActivityLogTable'
import ActivityLogSearch from './ActivityLogSearch'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, CheckCircle, XCircle } from 'lucide-react'

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

interface SearchParams {
  search?: string
  action_type?: string
  status?: string
  source?: string
  date_from?: string
  date_to?: string
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [searchParams, setSearchParams] = useState<SearchParams>({})

  const fetchLogs = async (params: SearchParams = {}) => {
    setLoading(true)
    try {
      const [logsData, statsData] = await Promise.all([
        activityAPI.getAll(params),
        activityAPI.getStats()
      ])
      setLogs(logsData.logs)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params)
    fetchLogs(params)
  }

  const handleRefresh = () => {
    fetchLogs(searchParams)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-semibold">{stats?.total_logs ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Success</span>
            <span className="font-semibold text-emerald-500">{stats?.success_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-500" />
            <span className="text-sm text-muted-foreground">Failed</span>
            <span className="font-semibold text-rose-500">{stats?.failed_count ?? 0}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <ActivityLogSearch onSearch={handleSearch} loading={loading} />

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <ActivityLogTable logs={logs} />
      )}

      {stats?.last_cleanup && (
        <p className="text-xs text-muted-foreground">
          Last cleanup: {new Date(stats.last_cleanup).toLocaleString()}
        </p>
      )}
    </div>
  )
}
