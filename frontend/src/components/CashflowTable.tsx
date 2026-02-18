import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2 } from 'lucide-react'

const CATEGORY_EMOJIS: Record<string, string> = {
  'Income': '💰',
  'Food': '🍔',
  'Transport': '🚗',
  'Utilities': '⚡',
  'Shopping': '🛒',
  'Entertainment': '🎬',
  'Health': '💊',
  'Airbnb': '🛌',
  'Other': '📦'
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  'PHP': '₱',
  'USD': '$',
  'EUR': '€'
}

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

type SortField = 'date' | 'category' | 'amount'
type SortOrder = 'asc' | 'desc'

interface CashflowTableProps {
  entries: CashflowEntry[]
  onDelete: (id: string) => void
  sortBy?: SortField | null
  sortOrder?: SortOrder
  onSort?: (field: SortField) => void
}

function SortIndicator({ field, currentField, currentOrder }: { field: SortField; currentField?: SortField | null; currentOrder?: SortOrder }) {
  if (currentField !== field) {
    return <span className="ml-1 text-muted-foreground/50">▼</span>
  }
  return <span className="ml-1">{currentOrder === 'asc' ? '▲' : '▼'}</span>
}

export default function CashflowTable({ entries, onDelete, sortBy, sortOrder, onSort }: CashflowTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('date')}>
              Date<SortIndicator field="date" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('category')}>
              Category<SortIndicator field="category" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead className="text-right cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('amount')}>
              Amount<SortIndicator field="amount" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium">{entry.date}</div>
                  <div className="text-xs text-muted-foreground">{entry.time}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{entry.item}</div>
                  {entry.notes && <div className="text-xs text-muted-foreground">{entry.notes}</div>}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="mr-1.5">{CATEGORY_EMOJIS[entry.category] || '📦'}</span>
                  {entry.category}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <span className={`font-medium ${entry.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {entry.amount >= 0 ? '+' : '-'}{CURRENCY_SYMBOLS[entry.currency] || entry.currency}{Math.abs(entry.amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
