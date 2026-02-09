import { useState, useEffect } from 'react';
import { activityAPI } from '../api/activity';
import ActivityLogTable from './ActivityLogTable';
import ActivityLogSearch from './ActivityLogSearch';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [searchParams, setSearchParams] = useState({});

  const fetchLogs = async (params = {}) => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        activityAPI.getAll(params),
        activityAPI.getStats()
      ]);
      setLogs(logsData.logs);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (params) => {
    setSearchParams(params);
    fetchLogs(params);
  };

  const handleRefresh = () => {
    fetchLogs(searchParams);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Activity Logs</h2>
          <p className="text-slate-400 mt-1 text-sm md:text-base">
            Track everything Emily does
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 transition-colors text-sm md:text-base disabled:opacity-50"
        >
          <span>↻</span> <span className="hidden md:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="border border-slate-700 bg-slate-800/30 p-2 md:p-3 text-center">
            <p className="text-slate-400 text-xs">Total Logs</p>
            <p className="text-lg md:text-xl font-bold text-white">{stats.total_logs}</p>
          </div>
          <div className="border border-green-500/30 bg-green-500/10 p-2 md:p-3 text-center">
            <p className="text-green-400 text-xs">Success</p>
            <p className="text-lg md:text-xl font-bold text-green-300">{stats.success_count}</p>
          </div>
          <div className="border border-red-500/30 bg-red-500/10 p-2 md:p-3 text-center">
            <p className="text-red-400 text-xs">Failed</p>
            <p className="text-lg md:text-xl font-bold text-red-300">{stats.failed_count}</p>
          </div>
        </div>
      )}

      <ActivityLogSearch onSearch={handleSearch} loading={loading} />

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : (
        <ActivityLogTable logs={logs} />
      )}

      {stats?.last_cleanup && (
        <p className="text-slate-500 text-xs mt-4">
          Last cleanup: {new Date(stats.last_cleanup).toLocaleString()}
        </p>
      )}
    </div>
  );
}
