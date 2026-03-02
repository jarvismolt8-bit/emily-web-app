import { useState, FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ACTION_TYPES = [
  { value: 'all', label: 'All Types', apiValue: '' },
  { value: 'cashflow_add', label: 'Cashflow - Add', apiValue: 'cashflow_add' },
  { value: 'cashflow_update', label: 'Cashflow - Update', apiValue: 'cashflow_update' },
  { value: 'cashflow_delete', label: 'Cashflow - Delete', apiValue: 'cashflow_delete' },
  { value: 'task_create', label: 'Task - Create', apiValue: 'task_create' },
  { value: 'task_update', label: 'Task - Update', apiValue: 'task_update' },
  { value: 'task_delete', label: 'Task - Delete', apiValue: 'task_delete' },
  { value: 'report_generate', label: 'Report - Generate', apiValue: 'report_generate' },
  { value: 'query_answered', label: 'Query - Answered', apiValue: 'query_answered' }
]

const STATUSES = [
  { value: 'all', label: 'All', apiValue: '' },
  { value: 'success', label: 'Success', apiValue: 'success' },
  { value: 'failed', label: 'Failed', apiValue: 'failed' }
]

const SOURCES = [
  { value: 'all', label: 'All', apiValue: '' },
  { value: 'telegram', label: 'Telegram', apiValue: 'telegram' },
  { value: 'web_app', label: 'Web App', apiValue: 'web_app' },
  { value: 'system', label: 'System', apiValue: 'system' }
]

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

interface ActivityLogSearchProps {
  onSearch: (params: SearchParams) => void
  loading: boolean
}

export default function ActivityLogSearch({ onSearch, loading }: ActivityLogSearchProps) {
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState('all')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const getApiValue = (items: typeof ACTION_TYPES, value: string) => {
    const item = items.find(i => i.value === value)
    return item?.apiValue ?? ''
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch({
      search: search || undefined,
      action_type: getApiValue(ACTION_TYPES, actionType) || undefined,
      status: getApiValue(STATUSES, status) || undefined,
      source: getApiValue(SOURCES, source) || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      limit: 20,
      offset: 0
    })
  }

  const handleReset = () => {
    setSearch('')
    setActionType('all')
    setStatus('all')
    setSource('all')
    setDateFrom('')
    setDateTo('')
    onSearch({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="pl-9"
          />
        </div>
        
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[140px]"
          placeholder="From"
        />
        
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[140px]"
          placeholder="To"
        />
        
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? '...' : 'Search'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
