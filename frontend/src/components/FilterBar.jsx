import { useState } from 'react';

const CATEGORIES = ['All', 'Income', 'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Other'];
const CURRENCIES = ['All', 'PHP', 'USD', 'EUR'];

export default function FilterBar({ onFilterChange }) {
  const [category, setCategory] = useState('All');
  const [currency, setCurrency] = useState('All');
  const [search, setSearch] = useState('');

  const handleChange = () => {
    onFilterChange({ category, currency, search });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); onFilterChange({ category: e.target.value, currency, search }); }}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); onFilterChange({ category, currency: e.target.value, search }); }}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          >
            {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-gray-400 text-sm mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); onFilterChange({ category, currency, search: e.target.value }); }}
            placeholder="Search by item name..."
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
