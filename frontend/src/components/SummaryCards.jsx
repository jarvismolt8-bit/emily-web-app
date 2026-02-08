export default function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-green-900/30 border border-green-700 p-4 rounded-lg">
        <p className="text-green-400 text-sm">Total Income</p>
        <p className="text-2xl font-bold text-green-300">
          +{summary.totalIncome.toFixed(2)}
        </p>
      </div>
      <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg">
        <p className="text-red-400 text-sm">Total Expenses</p>
        <p className="text-2xl font-bold text-red-300">
          -{summary.totalExpenses.toFixed(2)}
        </p>
      </div>
      <div className={`${summary.balance >= 0 ? 'bg-blue-900/30 border-blue-700' : 'bg-orange-900/30 border-orange-700'} border p-4 rounded-lg`}>
        <p className={`${summary.balance >= 0 ? 'text-blue-400' : 'text-orange-400'} text-sm`}>Balance</p>
        <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>
          {summary.balance >= 0 ? '+' : ''}{summary.balance.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
