import { useState, useEffect } from 'react'
import { tasksAPI } from '../api/tasks'
import TaskTable from './TaskTable'
import TaskModal from './TaskModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface Task {
  id: string
  name: string
  date?: string
  time?: string
  status: string
  priority: string
}

interface TaskFormData {
  name: string
  date: string
  time: string
  status: string
  priority: string
}

type SortField = 'id' | 'date' | 'priority'
type SortOrder = 'asc' | 'desc'

interface TasksProps {
  showAddButton?: boolean
}

export default function Tasks({ showAddButton = true }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [sortBy, setSortBy] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const data = await tasksAPI.getAll(sortBy ? { sortBy, sortOrder } : undefined)
      setTasks(data)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [sortBy, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else {
        setSortBy(null)
      }
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleAdd = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this task?')) {
      try {
        await tasksAPI.delete(id)
        fetchTasks()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  const handleSave = async (formData: TaskFormData) => {
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, formData)
      } else {
        await tasksAPI.add(formData)
      }
      fetchTasks()
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
  }

  return (
    <>
      {showAddButton && (
        <div className="flex justify-end mb-4">
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <TaskTable tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        task={editingTask}
      />
    </>
  )
}
