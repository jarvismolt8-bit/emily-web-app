import { useState } from 'react';

const ACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'cashflow_add', label: '💰 Cashflow - Add' },
  { value: 'cashflow_update', label: '💰 Cashflow - Update' },
  { value: 'cashflow_delete', label: '💰 Cashflow - Delete' },
  { value: 'task_create', label: '📋 Task - Create' },
  { value: 'task_update', label: '📋 Task - Update' },
  { value: 'task_delete', label: '📋 Task - Delete' },
  { value: 'report_generate', label: '📊 Report - Generate' },
  { value: 'query_answered', label: '💬 Query - Answered' }
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' }
];

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'web_app', label: 'Web App' },
  { value: 'system', label: 'System' }
];

export default function ActivityLogSearch({ onSearch, loading }) {
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({
      search,
      action_type: actionType,
      status,
      source,
      date_from: dateFrom,
      date_to: dateTo
    });
  };

  const handleReset = () => {
    setSearch('');
    setActionType('');
    setStatus('');
    setSource('');
    setDateFrom('');
    setDateTo('');
    onSearch({});
  };

  return (
    <div className="border border-slate-700 bg-gray-900 p-3 md:p-4 mb-4 md:mb-6">
      <form onSubmit={handleSubmit}>
        {/* Row 1: Search bar only */}
        <div className="mb-3">
          <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Search</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="flex-1 bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 hover:bg-slate-800 text-slate-300 transition-colors text-xs md:text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? '...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 hover:bg-slate-800 text-slate-300 transition-colors text-xs md:text-sm whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* Row 2: Type, Status, Source, From, To */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-3">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Type</label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 pr-8 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
            >
              {ACTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[100px]">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 pr-8 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[100px]">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 pr-8 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
            >
              {SOURCES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[130px]">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
            />
          </div>
          
          <div className="flex-1 min-w-[130px]">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-800 text-white px-2 md:px-3 py-1.5 md:py-2 border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
