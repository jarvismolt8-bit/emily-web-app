import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Calendar, Filter } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['All', 'Income', 'Investment', 'Food', 'Pet Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Bank', 'Other', 'Clothing']
const CURRENCIES = ['All', 'PHP', 'USD', 'EUR']
const DATE_RANGES = ['This month', 'Last month', 'Custom']

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

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRangeValues(range: string): { startDate: string; endDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  if (range === 'This month') {
    return {
      startDate: formatDate(new Date(year, month, 1)),
      endDate: formatDate(new Date(year, month + 1, 0))
    }
  } else if (range === 'Last month') {
    return {
      startDate: formatDate(new Date(year, month - 1, 1)),
      endDate: formatDate(new Date(year, month, 0))
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
    if (dateRange !== 'Custom') {
      const { startDate: start, endDate: end } = getDateRangeValues(dateRange)
      setStartDate(start)
      setEndDate(end)
    }
  }, [dateRange])

  const currentFilters = (): Filters => ({
    category,
    currency,
    search,
    dateRange,
    startDate,
    endDate,
  })

  const handleDateRangeChange = (val: string) => {
    setDateRange(val)
    if (val !== 'Custom') {
      const { startDate: start, endDate: end } = getDateRangeValues(val)
      setStartDate(start)
      setEndDate(end)
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  const handleCategoryChange = (val: string) => {
    setCategory(val)
  }

  const handleCurrencyChange = (val: string) => {
    setCurrency(val)
  }

  const handleApply = () => {
    onFilterChange(currentFilters())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply()
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] w-full md:w-auto md:flex-none">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search transactions..."
          className="pl-9 w-full"
        />
      </div>

      <Select value={dateRange} onValueChange={handleDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <Calendar className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map(range => (
            <SelectItem key={range} value={range}>{range}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {dateRange === 'Custom' && (
        <>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-[130px]"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-[130px]"
          />
        </>
      )}

      <Select value={category} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map(cat => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currency} onValueChange={handleCurrencyChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="Currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map(curr => (
            <SelectItem key={curr} value={curr}>{curr}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={handleApply}>
        <Filter className="h-4 w-4 mr-2" />
        Filter
      </Button>

      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add
      </Button>
    </div>
  )
}
