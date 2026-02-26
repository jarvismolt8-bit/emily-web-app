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
import { cashflowAPI } from './api/cashflow'
import { useRealtimeCashflow } from './hooks/useRealtimeData'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './components/ThemeToggle'
import { LogOut, Wallet, ListTodo, Activity, Image } from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'

interface Filters {
  category: string
  currency: string
  search: string
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
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 })
  const [filters, setFilters] = useState<Filters>({ category: 'All', currency: 'All', search: '' })
  const [cashflowSortBy, setCashflowSortBy] = useState<CashflowSortField | null>(null)
  const [cashflowSortOrder, setCashflowSortOrder] = useState<SortOrder>('asc')

  const fetchCashflow = useCallback(async () => {
    return cashflowAPI.getAll({ 
      ...filters, 
      ...(cashflowSortBy && { sortBy: cashflowSortBy, sortOrder: cashflowSortOrder }) 
    })
  }, [filters, cashflowSortBy, cashflowSortOrder])

  const { data: entries, loading, refresh } = useRealtimeCashflow(fetchCashflow)

  useEffect(() => {
    cashflowAPI.getSummary().then(setSummary).catch(console.error)
  }, [entries])

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await cashflowAPI.delete(id)
        refresh()
        cashflowAPI.getSummary().then(setSummary).catch(console.error)
      } catch (error) {
        console.error('Error deleting entry:', error)
      }
    }
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
                <FilterBar onFilterChange={handleFilterChange} />
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
                ) : (
                  <CashflowTable entries={entries} onDelete={handleDelete} sortBy={cashflowSortBy} sortOrder={cashflowSortOrder} onSort={handleCashflowSort} />
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

        <ChatWidget />
      </div>
    </TooltipProvider>
  )
}

export default function App() {
  const { isAuthenticated, login } = useAuth()

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
