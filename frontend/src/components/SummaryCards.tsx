import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface SummaryCardsProps {
  summary: {
    totalIncome: number
    totalExpenses: number
    balance: number
  }
}

export default function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Income</p>
          <p className="text-xl font-semibold text-emerald-500">
            +{summary.totalIncome.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <TrendingDown className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-xl font-semibold text-rose-500">
            -{summary.totalExpenses.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 rounded-lg border p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Wallet className={`h-5 w-5 ${summary.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className={`text-xl font-semibold ${summary.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
            {summary.balance >= 0 ? '+' : ''}{summary.balance.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  )
}
