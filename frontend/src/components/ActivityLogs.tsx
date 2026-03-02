import { useState, useEffect, useCallback } from 'react'
import { activityAPI } from '../api/activity'
import ActivityLogTable from './ActivityLogTable'
import ActivityLogSearch from './ActivityLogSearch'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  limit?: number
  offset?: number
}

const ROWS_OPTIONS = [20, 50, 100]

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ActivityStats | null>(null)
  const [searchParams, setSearchParams] = useState<SearchParams>({
    limit: 20,
    offset: 0
  })
  const [totalCount, setTotalCount] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  const currentPage = Math.floor((searchParams.offset || 0) / rowsPerPage) + 1
  const totalPages = Math.ceil(totalCount / rowsPerPage)
  const hasMore = (searchParams.offset || 0) + logs.length < totalCount

  const fetchLogs = useCallback(async (params: SearchParams = {}) => {
    setLoading(true)
    try {
      const mergedParams = { ...searchParams, ...params }
      const logsData = await activityAPI.getAll(mergedParams)
      const statsData = await activityAPI.getStats()
      setLogs(logsData.logs)
      setTotalCount(logsData.total_count)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    }
    setLoading(false)
  }, [searchParams])

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSearch = (params: SearchParams) => {
    const newParams = {
      ...params,
      limit: rowsPerPage,
      offset: 0
    }
    setSearchParams(newParams)
    fetchLogs(newParams)
  }

  const handleRefresh = () => {
    fetchLogs(searchParams)
  }

  const handleRowsPerPageChange = (value: string) => {
    const newLimit = parseInt(value, 10)
    setRowsPerPage(newLimit)
    const newParams = {
      ...searchParams,
      limit: newLimit,
      offset: 0
    }
    setSearchParams(newParams)
    fetchLogs(newParams)
  }

  const handlePageChange = (newOffset: number) => {
    const newParams = {
      ...searchParams,
      offset: newOffset
    }
    setSearchParams(newParams)
    fetchLogs(newParams)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange((currentPage - 2) * rowsPerPage)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage * rowsPerPage)
    }
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

      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={rowsPerPage.toString()} onValueChange={handleRowsPerPageChange}>
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROWS_OPTIONS.map(option => (
                  <SelectItem key={option} value={option.toString()}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages || !hasMore}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {stats?.last_cleanup && (
        <p className="text-xs text-muted-foreground">
          Last cleanup: {new Date(stats.last_cleanup).toLocaleString()}
        </p>
      )}
    </div>
  )
}
