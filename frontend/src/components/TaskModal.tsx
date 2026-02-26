import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Loader2 } from 'lucide-react'

const STATUSES = ['backlog', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = {
  'backlog': 'Backlog',
  'in_progress': 'In Progress',
  'done': 'Done'
}
const PRIORITIES = ['low', 'medium', 'high']

interface Task {
  id?: string
  name?: string
  description?: string
  date?: string
  time?: string
  status?: string
  priority?: string
}

interface TaskFormData {
  name: string
  description: string
  date: string
  time: string
  status: string
  priority: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (formData: TaskFormData) => void
  onDelete?: (id: string) => void
  task: Task | null
}

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function TaskModal({ isOpen, onClose, onSave, onDelete, task }: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    date: '',
    time: '',
    status: 'backlog',
    priority: 'medium'
  })
  const [docContent, setDocContent] = useState('')
  const [docLoading, setDocLoading] = useState(false)

  useEffect(() => {
    if (task) {
      let dateValue = ''
      if (task.date) {
        try {
          const parsedDate = parse(task.date, 'MMM d yyyy', new Date())
          dateValue = format(parsedDate, 'yyyy-MM-dd')
        } catch {
          dateValue = task.date
        }
      }
      
      setFormData({
        name: task.name || '',
        description: task.description || '',
        date: dateValue,
        time: task.time || '',
        status: task.status || 'backlog',
        priority: task.priority || 'medium'
      })
    } else {
      setFormData({
        name: '',
        description: '',
        date: '',
        time: '',
        status: 'backlog',
        priority: 'medium'
      })
    }
  }, [task, isOpen])

  useEffect(() => {
    if (task && task.id && isOpen) {
      fetchDocumentation(task.id)
    }
  }, [task?.id, isOpen])

  const fetchDocumentation = async (taskId: string) => {
    setDocLoading(true)
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}/documentation`, {
        headers: {
          'X-Password': '10716255',
          'X-Source': 'web_app'
        }
      })
      const data = await response.json()
      if (data.success && data.data.content) {
        setDocContent(data.data.content)
      } else {
        setDocContent('')
      }
    } catch (error) {
      console.error('Failed to fetch documentation:', error)
      setDocContent('')
    } finally {
      setDocLoading(false)
    }
  }

  const handleDateTimeChange = (field: 'date' | 'time', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    let displayDate = formData.date
    if (formData.date) {
      try {
        const parsedDate = parse(formData.date, 'yyyy-MM-dd', new Date())
        displayDate = format(parsedDate, 'MMM d yyyy')
      } catch {
        // keep original
      }
    }
    
    onSave({
      ...formData,
      date: displayDate
    })
    onClose()
  }

  const showDocPanel = task && task.id

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size={showDocPanel ? "full" : "default"} className={showDocPanel ? "max-h-[90vh]" : ""}>
        <DialogHeader>
          <DialogTitle>{task ? `Edit Task #${task.id}` : 'Add Task'}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-muted-foreground">Task Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter task name..."
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-muted-foreground">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details about this task..."
                className="mt-2 min-h-[100px]"
                rows={3}
              />
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <Label htmlFor="datetime" className="text-muted-foreground">Date & Time</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={formData.date && formData.time ? `${formData.date}T${formData.time}` : ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value) {
                      const [d, t] = value.split('T')
                      setFormData({ ...formData, date: d, time: t })
                    } else {
                      setFormData({ ...formData, date: '', time: '' })
                    }
                  }}
                  className="mt-2"
                />
              </div>
              <div className="min-w-[100px]">
                <Label className="text-muted-foreground">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(status => (
                      <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[100px]">
                <Label className="text-muted-foreground">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => setFormData({ ...formData, priority: val })}
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {task && task.id && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onDelete(task.id!)
                    onClose()
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {task ? 'Update' : 'Add'}
              </Button>
            </div>
          </form>

          {showDocPanel && (
            <div className="mt-6 pt-6 border-t">
              {docLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : docContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{docContent}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documentation found.</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
