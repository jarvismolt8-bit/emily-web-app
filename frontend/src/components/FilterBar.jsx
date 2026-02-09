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
            className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 pr-8 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
          >
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Currency</label>
          <select
            value={currency}
            onChange={(e) => { setCurrency(e.target.value); onFilterChange({ category, currency: e.target.value, search }); }}
            className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 pr-8 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm appearance-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
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
