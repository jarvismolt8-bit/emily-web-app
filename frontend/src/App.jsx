import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import PasswordGate from './components/PasswordGate';
import SummaryCards from './components/SummaryCards';
import FilterBar from './components/FilterBar';
import CashflowTable from './components/CashflowTable';
import { cashflowAPI } from './api/cashflow';

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0, transactionCount: 0 });
  const [filters, setFilters] = useState({ category: 'All', currency: 'All', search: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesData, summaryData] = await Promise.all([
        cashflowAPI.getAll(filters),
        cashflowAPI.getSummary()
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this transaction?')) {
      try {
        await cashflowAPI.delete(id);
        fetchData();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  if (!isAuthenticated) {
    return <PasswordGate onAuth={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">💰 Cashflow Manager</h1>
            <p className="text-gray-400">Track your expenses and earnings</p>
          </div>
          <button
            onClick={logout}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>

        <SummaryCards summary={summary} />

        <FilterBar onFilterChange={handleFilterChange} />

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : (
          <CashflowTable entries={entries} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
