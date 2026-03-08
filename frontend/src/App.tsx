import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import PasswordGate from './components/PasswordGate'
import SummaryCards from './components/SummaryCards'
import FilterBar from './components/FilterBar'
import CashflowTable from './components/CashflowTable'
import Tasks from './components/Tasks'
import ActivityLogs from './components/ActivityLogs'
import ImageRenamer from './components/ImageRenamer'
import ChatWidget from './components/ChatWidget'
import CashflowFormModal from './components/CashflowFormModal'
import { cashflowAPI } from './api/cashflow'
import { useRealtimeCashflow } from './hooks/useRealtimeData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import { LogOut, Wallet, ListTodo, Activity, Image, MessageCircle } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'

interface Filters {
  category: string
  currency: string
  search: string
  dateRange: string
  startDate?: string
  endDate?: string
}

type CashflowSortField = 'date' | 'category' | 'amount'
type SortOrder = 'asc' | 'desc'

interface CashflowEntry {
  id: string
  date: string
  time: string
  item: string
  notes?: string
  category: string
  currency: string
  amount: number
}

interface Summary {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
}

function CashflowApp() {
  const { logout } = useAuth()
  const [activeTab, setActiveTab] = useState('cashflow')
  const [chatOpen, setChatOpen] = useState(false)
  const [cashflowModalOpen, setCashflowModalOpen] = useState(false)
  const [editingCashflow, setEditingCashflow] = useState<CashflowEntry | null>(null)
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 })
  const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDefaultDateRange = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay)
  }
}

const defaultDateRange = getDefaultDateRange()
const [filters, setFilters] = useState<Filters>({ 
  category: 'All', 
  currency: 'All', 
  search: '',
  dateRange: 'This month',
  startDate: defaultDateRange.startDate,
  endDate: defaultDateRange.endDate
})
  const [cashflowSortBy, setCashflowSortBy] = useState<CashflowSortField | null>(null)
  const [cashflowSortOrder, setCashflowSortOrder] = useState<SortOrder>('asc')

  const fetchCashflow = useCallback(async () => {
    const { dateRange, startDate, endDate, ...filterParams } = filters
    return cashflowAPI.getAll({ 
      ...filterParams,
      startDate,
      endDate,
      ...(cashflowSortBy && { sortBy: cashflowSortBy, sortOrder: cashflowSortOrder }) 
    })
  }, [filters, cashflowSortBy, cashflowSortOrder])

  const handleCashflowFilter = useCallback((newFilters: Record<string, any> | null) => {
    if (newFilters) {
      setFilters({
        category: newFilters.category || 'All',
        currency: newFilters.currency || 'All',
        search: newFilters.search || '',
        dateRange: newFilters.dateRange || 'This month',
        startDate: newFilters.startDate || '',
        endDate: newFilters.endDate || ''
      })
    } else {
      const defaultRange = getDefaultDateRange()
      setFilters({ 
        category: 'All', 
        currency: 'All', 
        search: '',
        dateRange: 'This month',
        startDate: defaultRange.startDate,
        endDate: defaultRange.endDate
      })
    }
  }, [])

  const { data: entries, loading, refresh } = useRealtimeCashflow(fetchCashflow, 'cashflow-updates', handleCashflowFilter)

  useEffect(() => {
    cashflowAPI.getSummary({ startDate: filters.startDate, endDate: filters.endDate }).then(setSummary).catch(console.error)
  }, [entries, filters.startDate, filters.endDate])

  useEffect(() => {
    refresh()
  }, [filters, cashflowSortBy, cashflowSortOrder, refresh])

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters)
  }

  const handleCashflowSort = (field: CashflowSortField) => {
    if (cashflowSortBy === field) {
      if (cashflowSortOrder === 'asc') {
        setCashflowSortOrder('desc')
      } else {
        setCashflowSortBy(null)
      }
    } else {
      setCashflowSortBy(field)
      setCashflowSortOrder('asc')
    }
  }

  const getFilteredSummary = () => {
    return cashflowAPI.getSummary({ startDate: filters.startDate, endDate: filters.endDate }).then(setSummary).catch(console.error)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await cashflowAPI.delete(id)
        refresh()
        getFilteredSummary()
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
    }
  }

  const handleAddCashflow = async (entry: Partial<CashflowEntry>) => {
    try {
      await cashflowAPI.add(entry)
      refresh()
      getFilteredSummary()
    } catch (error) {
      console.error('Error adding entry:', error)
    }
  }

  const handleEditCashflow = async (entry: Partial<CashflowEntry>) => {
    if (!entry.id) return
    try {
      await cashflowAPI.update(entry.id, entry)
      refresh()
      getFilteredSummary()
    } catch (error) {
      console.error('Error updating entry:', error)
    }
  }

  const handleCashflowSave = (entry: Partial<CashflowEntry>) => {
    if (editingCashflow?.id) {
      handleEditCashflow(entry)
    } else {
      handleAddCashflow(entry)
    }
    setEditingCashflow(null)
  }

  const handleOpenAddModal = () => {
    setEditingCashflow(null)
    setCashflowModalOpen(true)
  }

  const handleOpenEditModal = (entry: CashflowEntry) => {
    setEditingCashflow(entry)
    setCashflowModalOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4 lg:px-6">
              <div className="flex items-center gap-3">
                <span className="text-xl">🥖</span>
                <h1 className="text-base font-semibold">Emily's Web App</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setChatOpen(!chatOpen)}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-1.5" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="cashflow" className="gap-2">
                  <Wallet className="h-4 w-4" />
                  Cashflow
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2">
                  <ListTodo className="h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cashflow" className="mt-6 space-y-6">
                <SummaryCards summary={summary} />
                <FilterBar onFilterChange={handleFilterChange} onAddClick={handleOpenAddModal} />
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
                ) : (
                  <CashflowTable entries={entries} onDelete={handleDelete} onEdit={handleOpenEditModal} sortBy={cashflowSortBy} sortOrder={cashflowSortOrder} onSort={handleCashflowSort} />
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-6">
                <Tasks />
              </TabsContent>

              <TabsContent value="logs" className="mt-6">
                <ActivityLogs />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <ChatWidget isExpanded={chatOpen} setIsExpanded={setChatOpen} />
        
        <CashflowFormModal 
          open={cashflowModalOpen} 
          onOpenChange={(open) => {
            setCashflowModalOpen(open)
            if (!open) setEditingCashflow(null)
          }} 
          onSave={handleCashflowSave}
          initialData={editingCashflow}
        />
      </div>
    </TooltipProvider>
  )
}

export default function App() {
  const { isAuthenticated, login, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuth={login} />
  }

  return (
    <Routes>
      <Route path="/" element={<CashflowApp />} />
      <Route path="/image-renamer" element={<ImageRenamer />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
