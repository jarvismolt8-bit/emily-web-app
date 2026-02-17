import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import PasswordGate from './components/PasswordGate';
import SummaryCards from './components/SummaryCards';
import FilterBar from './components/FilterBar';
import CashflowTable from './components/CashflowTable';
import ActivityManager from './components/ActivityManager';
import ChatWidget from './components/ChatWidget';
import { cashflowAPI } from './api/cashflow';

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('cashflow');
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
    <div className="min-h-screen bg-gray-950">
      {/* Full width container - no max-width, no borders */}
      <div className="w-full">
        {/* Main wrapper - no border */}
        <div className="bg-gray-900">
          {/* Main Content Area - Row 2 with Two Columns */}
          <div className="flex flex-col lg:flex-row">
            {/* Left Column - Tabs & Content (3/4 width on desktop) - scrollable */}
            <div className="w-full lg:w-3/4">
              {/* Header section - Row 1 */}
              <div className="border-b border-slate-700 p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="text-xl md:text-3xl font-bold text-white tracking-wide">🥖 Emily's web app</h1>
                    <p className="text-slate-400 mt-1 text-sm md:text-base">Manage your cashflow and activities</p>
                  </div>
                  <button
                    onClick={logout}
                    className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-3 py-1.5 md:px-4 md:py-2 transition-colors text-sm md:text-base w-full md:w-auto"
                  >
                    Logout
                  </button>
                </div>
              </div>
              {/* Tab Navigation */}
              <div className="border-b border-slate-700">
                <div className="flex flex-col sm:flex-row">
                  <button
                    onClick={() => setActiveTab('cashflow')}
                    className={`px-4 py-3 md:px-6 md:py-4 font-medium transition-colors border-b sm:border-b-0 sm:border-r border-slate-700 text-sm md:text-base ${
                      activeTab === 'cashflow'
                        ? 'text-white bg-slate-800'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    Cashflow Manager
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-3 md:px-6 md:py-4 font-medium transition-colors text-sm md:text-base ${
                      activeTab === 'activity'
                        ? 'text-white bg-slate-800'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    Activity Manager
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-3 md:p-6">
                {activeTab === 'cashflow' ? (
                  <div>
                    <SummaryCards summary={summary} />
                    <div className="border-t border-slate-700 my-4 md:my-6"></div>
                    <FilterBar onFilterChange={handleFilterChange} />
                    {loading ? (
                      <div className="text-center text-slate-400 py-8">Loading...</div>
                    ) : (
                      <CashflowTable entries={entries} onDelete={handleDelete} />
                    )}
                  </div>
                ) : (
                  <ActivityManager />
                )}
              </div>
            </div>
            
            {/* Right Column - Chat Widget (1/4 width on desktop) - sticky/persistent */}
            <div className="hidden lg:block lg:w-1/4 lg:border-l lg:border-slate-700 lg:sticky lg:top-0 lg:h-screen">
              {isAuthenticated && <ChatWidget desktopMode={true} />}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Floating Chat - Hidden on desktop */}
      <div className="lg:hidden">
        {isAuthenticated && <ChatWidget desktopMode={false} />}
      </div>
    </div>
  );
}
