import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

const CATEGORIES = ['All', 'Income', 'Investment', 'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Other']
const CURRENCIES = ['All', 'PHP', 'USD', 'EUR']
const DATE_RANGES = ['This month', 'Last month', 'Date range']

interface Filters {
  category: string
  currency: string
  search: string
  dateRange: string
  startDate?: string
  endDate?: string
}

interface FilterBarProps {
  onFilterChange: (filters: Filters) => void
  onAddClick: () => void
}

function getDateRangeValues(range: string): { startDate: string; endDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (range === 'This month') {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }
  } else if (range === 'Last month') {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    }
  }
  return { startDate: '', endDate: '' }
}

export default function FilterBar({ onFilterChange, onAddClick }: FilterBarProps) {
  const [category, setCategory] = useState('All')
  const [currency, setCurrency] = useState('All')
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('This month')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    if (dateRange !== 'Date range') {
      const { startDate: start, endDate: end } = getDateRangeValues(dateRange)
      setStartDate(start)
      setEndDate(end)
    }
  }, [dateRange])

  const emitChange = (newFilters: Partial<Filters>) => {
    const updated = { 
      category, 
      currency, 
      search, 
      dateRange,
      startDate,
      endDate,
      ...newFilters 
    }
    onFilterChange(updated)
  }

  const handleDateRangeChange = (val: string) => {
    setDateRange(val)
    if (val !== 'Date range') {
      const { startDate: start, endDate: end } = getDateRangeValues(val)
      setStartDate(start)
      setEndDate(end)
      emitChange({ dateRange: val, startDate: start, endDate: end })
    } else {
      setStartDate('')
      setEndDate('')
      emitChange({ dateRange: val, startDate: '', endDate: '' })
    }
  }

  const handleStartDateChange = (val: string | undefined) => {
    const newStart = val || ''
    setStartDate(newStart)
    emitChange({ startDate: newStart })
  }

  const handleEndDateChange = (val: string | undefined) => {
    const newEnd = val || ''
    setEndDate(newEnd)
    emitChange({ endDate: newEnd })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={dateRange}
        onValueChange={handleDateRangeChange}
      >
        <SelectTrigger className="w-[140px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map(range => (
            <SelectItem key={range} value={range}>{range}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dateRange === 'Date range' && (
        <>
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            placeholder="Start date"
          />
          <span className="text-muted-foreground">to</span>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            placeholder="End date"
          />
        </>
      )}
      
      <Select
        value={category}
        onValueChange={(val) => { setCategory(val); emitChange({ category: val }) }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(cat => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={currency}
        onValueChange={(val) => { setCurrency(val); emitChange({ currency: val }) }}
      >
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map(curr => (
            <SelectItem key={curr} value={curr}>{curr}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); emitChange({ search: e.target.value }) }}
          placeholder="Search transactions..."
          className="pl-9"
        />
      </div>
      
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
  )
}
