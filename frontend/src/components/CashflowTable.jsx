const CATEGORY_EMOJIS = {
  'Income': '💰',
  'Food': '🍔',
  'Transport': '🚗',
  'Utilities': '⚡',
  'Shopping': '🛒',
  'Entertainment': '🎬',
  'Health': '💊',
  'Airbnb': '🛌',
  'Other': '📦'
};

const CURRENCY_SYMBOLS = {
  'PHP': '₱',
  'USD': '$',
  'EUR': '€'
};

export default function CashflowTable({ entries, onDelete }) {
  return (
    <div className="border border-slate-700 bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Date & Time</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold">Item</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Category</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-right text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Amount</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-center text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr 
                  key={entry.id} 
                  className={`hover:bg-slate-800/30 ${index !== entries.length - 1 ? 'border-b border-slate-800' : ''}`}
                >
                  <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm whitespace-nowrap">
                    <div>{entry.date}</div>
                    <div className="text-slate-500 text-xs">{entry.time}</div>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-white text-xs md:text-sm">
                    <div className="max-w-[150px] md:max-w-none truncate">{entry.item}</div>
                    {entry.notes && <div className="text-slate-500 text-xs truncate">{entry.notes}</div>}
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm whitespace-nowrap">
                    <span className="hidden md:inline">{CATEGORY_EMOJIS[entry.category] || '📦'} </span>
                    {entry.category}
                  </td>
                  <td className={`px-2 md:px-4 py-2 md:py-3 text-right font-medium text-xs md:text-sm whitespace-nowrap ${
                    entry.amount >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {entry.amount >= 0 ? '+' : ''}{CURRENCY_SYMBOLS[entry.currency] || entry.currency}{Math.abs(entry.amount).toFixed(2)}
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                    <button
                      onClick={() => onDelete(entry.id)}
                      className="text-red-400 hover:text-red-300 text-xs md:text-sm border border-red-500/50 px-2 md:px-3 py-1 hover:bg-red-500/10 transition-colors"
                    >
                      <span className="md:hidden">✕</span>
                      <span className="hidden md:inline">Delete</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
