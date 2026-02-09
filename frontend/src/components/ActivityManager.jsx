import { useState, useEffect } from 'react';
import { tasksAPI } from '../api/tasks';
import TaskTable from './TaskTable';
import TaskModal from './TaskModal';
import ActivityLogs from './ActivityLogs';

export default function ActivityManager() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await tasksAPI.getAll();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
  }, [activeTab]);

  const handleAdd = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this task?')) {
      try {
        await tasksAPI.delete(id);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, formData);
      } else {
        await tasksAPI.add(formData);
      }
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div>
      {/* Sub-tabs for Tasks and Activity Logs */}
      <div className="border-b border-slate-700 mb-4 md:mb-6">
        <div className="flex">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 md:px-6 py-2 md:py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'tasks'
                ? 'text-white border-blue-500'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 md:px-6 py-2 md:py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'logs'
                ? 'text-white border-blue-500'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Activity Logs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' ? (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 mb-4 md:mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Tasks</h2>
              <p className="text-slate-400 mt-1 text-sm md:text-base">Manage your tasks</p>
            </div>
            <button
              onClick={handleAdd}
              className="border border-slate-600 hover:bg-slate-800 text-slate-300 px-3 md:px-4 py-1.5 md:py-2 flex items-center gap-2 transition-colors text-sm md:text-base w-full md:w-auto justify-center"
            >
              <span>+</span> <span className="md:hidden">Add</span><span className="hidden md:inline">Add Task</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : (
            <TaskTable tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} />
          )}

          <TaskModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onSave={handleSave}
            task={editingTask}
          />
        </div>
      ) : (
        <ActivityLogs />
      )}
    </div>
  );
}
