import { useState, useEffect } from 'react';

const STATUSES = ['active', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function TaskModal({ isOpen, onClose, onSave, task }) {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    status: 'active',
    priority: 'medium'
  });

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name || '',
        date: task.date || '',
        time: task.time || '',
        status: task.status || 'active',
        priority: task.priority || 'medium'
      });
    } else {
      setFormData({
        name: '',
        date: '',
        time: '',
        status: 'active',
        priority: 'medium'
      });
    }
  }, [task, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="border border-slate-700 bg-gray-900 p-4 md:p-6 shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg md:text-xl font-bold text-white mb-4">
          {task ? 'Edit Task' : 'Add Task'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Task Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
              placeholder="Enter task name..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            <div>
              <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Date</label>
              <input
                type="text"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
                placeholder="Feb 7 2026"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Time</label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-sm"
                placeholder="4:00pm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-sm pr-8 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
              >
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs md:text-sm mb-1 font-semibold">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-sm pr-8 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cbd5e1\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em 1em' }}
              >
                {PRIORITIES.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 md:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 md:px-4 py-2 border border-slate-600 hover:bg-slate-800 text-slate-300 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 md:px-4 py-2 border border-slate-600 hover:bg-slate-800 text-slate-300 transition-colors text-sm"
            >
              {task ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
