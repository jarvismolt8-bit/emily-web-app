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
    <div className="border border-slate-700 bg-gray-900 p-3 md:p-4 mb-4 md:mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div>
          <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); onFilterChange({ category: e.target.value, currency, search }); }}
            className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border-r-8 border-transparent outline outline-1 outline-slate-600 focus:border-slate-400 focus:outline-none text-sm"
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Currency</label>
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); onFilterChange({ category, currency: e.target.value, search }); }}
            className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border-r-8 border-transparent outline outline-1 outline-slate-600 focus:border-slate-400 focus:outline-none text-sm"
          >
            {CURRENCIES.map(curr => <option key={curr} value={curr}>{curr}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); onFilterChange({ category, currency, search: e.target.value }); }}
            placeholder="Search..."
            className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
          />
        </div>
      </div>
    </div>
  );
}
