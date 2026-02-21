import { useState, useEffect, useCallback } from 'react'
import { tasksAPI } from '../api/tasks'
import { useRealtimeTasks } from '../hooks/useRealtimeData'
import TaskTable from './TaskTable'
import TaskModal from './TaskModal'
import TaskKanban from './TaskKanban'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, LayoutGrid, List } from 'lucide-react'

interface Task {
  id: string
  name: string
  description?: string
  date?: string
  time?: string
  status: 'backlog' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
}

interface TaskFormData {
  name: string
  description: string
  date: string
  time: string
  status: string
  priority: string
}

type SortField = 'id' | 'date' | 'priority'
type SortOrder = 'asc' | 'desc'
type ViewMode = 'table' | 'kanban'

interface TasksProps {
  showAddButton?: boolean
}

export default function Tasks({ showAddButton = true }: TasksProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [sortBy, setSortBy] = useState<SortField | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const fetchTasks = useCallback(async () => {
    return tasksAPI.getAll(sortBy ? { sortBy, sortOrder } : undefined)
  }, [sortBy, sortOrder])

  const { data: tasks, loading, refresh: fetchTasksRefresh } = useRealtimeTasks(fetchTasks)

  useEffect(() => {
    fetchTasksRefresh()
  }, [sortBy, sortOrder, fetchTasksRefresh])

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
        fetchTasksRefresh()
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await tasksAPI.updateStatus(taskId, newStatus)
      fetchTasksRefresh()
    } catch (error) {
      console.error('Error updating task status:', error)
      fetchTasksRefresh()
    }
  }

  const handleSave = async (formData: TaskFormData) => {
    try {
      if (editingTask) {
        await tasksAPI.update(editingTask.id, formData)
      } else {
        await tasksAPI.add(formData)
      }
      fetchTasksRefresh()
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
      <div className="flex justify-between items-center mb-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="table" className="gap-1.5">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {showAddButton && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
      ) : viewMode === 'table' ? (
        <TaskTable 
          tasks={tasks} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          sortBy={sortBy} 
          sortOrder={sortOrder} 
          onSort={handleSort} 
        />
      ) : (
        <TaskKanban 
          tasks={tasks} 
          onEdit={handleEdit} 
          onStatusChange={handleStatusChange}
        />
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        onDelete={handleDelete}
        task={editingTask}
      />
    </>
  )
}
