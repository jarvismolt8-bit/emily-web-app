import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES = ['All', 'Income', 'Investment', 'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Other']
const CURRENCIES = ['All', 'PHP', 'USD', 'EUR']

interface Filters {
  category: string
  currency: string
  search: string
}

interface FilterBarProps {
  onFilterChange: (filters: Filters) => void
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [category, setCategory] = useState('All')
  const [currency, setCurrency] = useState('All')
  const [search, setSearch] = useState('')

  const emitChange = (newFilters: Partial<Filters>) => {
    const updated = { category, currency, search, ...newFilters }
    onFilterChange(updated)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
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
    </div>
  )
}
