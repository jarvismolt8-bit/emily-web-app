const PRIORITY_COLORS = {
  'high': 'text-red-400',
  'medium': 'text-yellow-400',
  'low': 'text-green-400'
};

const STATUS_COLORS = {
  'active': 'border-blue-500 text-blue-400',
  'done': 'border-green-500 text-green-400'
};

export default function TaskTable({ tasks, onEdit, onDelete }) {
  return (
    <div className="border border-slate-700 bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">ID</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold">Name</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Date</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Time</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Status</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-left text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Priority</th>
              <th className="px-2 md:px-4 py-2 md:py-3 text-center text-slate-400 text-xs md:text-sm font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => (
                <tr 
                  key={task.id} 
                  className={`hover:bg-slate-800/30 ${index !== tasks.length - 1 ? 'border-b border-slate-800' : ''}`}
                >
                  <td className="px-2 md:px-4 py-2 md:py-3 text-slate-500 text-xs md:text-sm whitespace-nowrap">{task.id}</td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-white text-xs md:text-sm">
                    <div className="max-w-[120px] md:max-w-none truncate">{task.name}</div>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm whitespace-nowrap">{task.date || '-'}</td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-gray-300 text-xs md:text-sm whitespace-nowrap">{task.time || '-'}</td>
                  <td className="px-2 md:px-4 py-2 md:py-3">
                    <span className={`px-1.5 md:px-2 py-0.5 md:py-1 text-xs border ${STATUS_COLORS[task.status] || 'border-slate-600 text-slate-400'}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className={`px-2 md:px-4 py-2 md:py-3 font-medium capitalize text-xs md:text-sm whitespace-nowrap ${PRIORITY_COLORS[task.priority] || 'text-gray-300'}`}>
                    <span className="md:hidden">{task.priority.charAt(0).toUpperCase()}</span>
                    <span className="hidden md:inline">{task.priority}</span>
                  </td>
                  <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                    <div className="flex justify-center gap-1 md:gap-2">
                      <button
                        onClick={() => onEdit(task)}
                        className="text-slate-300 hover:text-white text-xs md:text-sm border border-slate-600 px-1.5 md:px-3 py-0.5 md:py-1 hover:bg-slate-800 transition-colors"
                      >
                        <span className="md:hidden">✎</span>
                        <span className="hidden md:inline">Edit</span>
                      </button>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="text-red-400 hover:text-red-300 text-xs md:text-sm border border-red-500/50 px-1.5 md:px-3 py-0.5 md:py-1 hover:bg-red-500/10 transition-colors"
                      >
                        <span className="md:hidden">✕</span>
                        <span className="hidden md:inline">Delete</span>
                      </button>
                    </div>
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
