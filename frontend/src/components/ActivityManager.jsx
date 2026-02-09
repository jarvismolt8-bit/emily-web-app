import { useState, useEffect } from 'react';
import { tasksAPI } from '../api/tasks';
import TaskTable from './TaskTable';
import TaskModal from './TaskModal';

export default function ActivityManager() {
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
    fetchTasks();
  }, []);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Activity Manager</h2>
          <p className="text-gray-400">Manage your tasks and activities</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <span>+</span> Add Task
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
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
  );
}
