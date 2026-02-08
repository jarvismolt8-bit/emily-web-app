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
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Date & Time</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Item</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Category</th>
            <th className="px-4 py-3 text-right text-gray-300 text-sm">Amount</th>
            <th className="px-4 py-3 text-center text-gray-300 text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-300 text-sm">
                  <div>{entry.date}</div>
                  <div className="text-gray-500">{entry.time}</div>
                </td>
                <td className="px-4 py-3 text-white">
                  {entry.item}
                  {entry.notes && <div className="text-gray-500 text-sm">{entry.notes}</div>}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {CATEGORY_EMOJIS[entry.category] || '📦'} {entry.category}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${
                  entry.amount >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {entry.amount >= 0 ? '+' : ''}{CURRENCY_SYMBOLS[entry.currency] || entry.currency}{Math.abs(entry.amount).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
