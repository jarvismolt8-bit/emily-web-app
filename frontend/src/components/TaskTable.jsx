const PRIORITY_COLORS = {
  'high': 'text-red-400',
  'medium': 'text-yellow-400',
  'low': 'text-green-400'
};

const STATUS_COLORS = {
  'active': 'bg-blue-900/30 text-blue-300 border-blue-700',
  'completed': 'bg-green-900/30 text-green-300 border-green-700'
};

export default function TaskTable({ tasks, onEdit, onDelete }) {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">ID</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Name</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Date</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Time</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Status</th>
            <th className="px-4 py-3 text-left text-gray-300 text-sm">Priority</th>
            <th className="px-4 py-3 text-center text-gray-300 text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                No tasks found
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 text-gray-400 text-sm">{task.id}</td>
                <td className="px-4 py-3 text-white">{task.name}</td>
                <td className="px-4 py-3 text-gray-300 text-sm">{task.date || '-'}</td>
                <td className="px-4 py-3 text-gray-300 text-sm">{task.time || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[task.status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                    {task.status}
                  </span>
                </td>
                <td className={`px-4 py-3 font-medium capitalize ${PRIORITY_COLORS[task.priority] || 'text-gray-300'}`}>
                  {task.priority}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(task)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(task.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
