const STATUS_COLORS = {
  'success': 'border-green-500 text-green-400 bg-green-500/10',
  'failed': 'border-red-500 text-red-400 bg-red-500/10'
};

const ACTION_TYPE_COLORS = {
  'cashflow_add': 'text-blue-400',
  'cashflow_update': 'text-blue-400',
  'cashflow_delete': 'text-blue-400',
  'task_create': 'text-purple-400',
  'task_update': 'text-purple-400',
  'task_delete': 'text-purple-400',
  'todo_add': 'text-yellow-400',
  'todo_delete': 'text-yellow-400',
  'todo_complete': 'text-yellow-400',
  'report_generate': 'text-cyan-400',
  'query_answered': 'text-pink-400'
};

const SOURCE_ICONS = {
  'telegram': '📱',
  'web_app': '💻',
  'system': '⚙️'
};

export default function ActivityLogTable({ logs }) {
  if (logs.length === 0) {
    return (
      <div className="border border-slate-700 bg-gray-900 p-8 text-center">
        <p className="text-slate-500">No activity logs found</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-700 bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Date/Time</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Source</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Type</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold">Description</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-center text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr 
                key={log.id} 
                className={`hover:bg-slate-800/30 ${index !== logs.length - 1 ? 'border-b border-slate-800' : ''}`}
              >
                <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm whitespace-nowrap">
                  <div>{log.date}</div>
                  <div className="text-slate-500 text-xs">{log.time}</div>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                  <span className="text-lg" title={log.source}>
                    {SOURCE_ICONS[log.source] || '📋'}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 whitespace-nowrap">
                  <span className={`text-xs font-medium ${ACTION_TYPE_COLORS[log.action_type] || 'text-slate-400'}`}>
                    {log.action_type}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm">
                  <div className="max-w-[200px] md:max-w-md truncate" title={log.description}>
                    {log.description}
                  </div>
                  {log.error_message && (
                    <div className="text-red-400 text-xs mt-1 truncate" title={log.error_message}>
                      Error: {log.error_message}
                    </div>
                  )}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                  <span className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs border ${STATUS_COLORS[log.status] || 'border-slate-600 text-slate-400'}`}>
                    <span className="md:hidden">{log.status === 'success' ? '✓' : '✕'}</span>
                    <span className="hidden md:inline">{log.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
