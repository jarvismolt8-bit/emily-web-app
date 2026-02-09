export default function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
      <div className="border border-green-500/50 bg-green-500/10 p-3 md:p-4">
        <p className="text-green-400 text-xs md:text-sm font-semibold">Total Income</p>
        <p className="text-xl md:text-2xl font-bold text-green-300">
          +{summary.totalIncome.toFixed(2)}
        </p>
      </div>
      <div className="border border-red-500/50 bg-red-500/10 p-3 md:p-4">
        <p className="text-red-400 text-xs md:text-sm font-semibold">Total Expenses</p>
        <p className="text-xl md:text-2xl font-bold text-red-300">
          -{summary.totalExpenses.toFixed(2)}
        </p>
      </div>
      <div className={`border p-3 md:p-4 ${summary.balance >= 0 ? 'border-blue-500/50 bg-blue-500/10' : 'border-orange-500/50 bg-orange-500/10'}`}>
        <p className={`text-xs md:text-sm font-semibold ${summary.balance >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>Balance</p>
        <p className={`text-xl md:text-2xl font-bold ${summary.balance >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>
          {summary.balance >= 0 ? '+' : ''}{summary.balance.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
