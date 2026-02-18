import { useState, useEffect } from 'react'
import { format, parse } from 'date-fns'
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
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

const STATUSES = ['active', 'done']
const PRIORITIES = ['low', 'medium', 'high']

interface Task {
  id?: string
  name?: string
  date?: string
  time?: string
  status?: string
  priority?: string
}

interface TaskFormData {
  name: string
  date: string
  time: string
  status: string
  priority: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (formData: TaskFormData) => void
  task: Task | null
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    date: '',
    time: '',
    status: 'active',
    priority: 'medium'
  })

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
        date: dateValue,
        time: task.time || '',
        status: task.status || 'active',
        priority: task.priority || 'medium'
      })
    } else {
      setFormData({
        name: '',
        date: '',
        time: '',
        status: 'active',
        priority: 'medium'
      })
    }
  }, [task, isOpen])

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add Task'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
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

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <div className="mt-2">
                <DatePicker
                  value={formData.date}
                  onChange={(val) => setFormData({ ...formData, date: val })}
                  placeholder="Select date"
                />
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Time</Label>
              <div className="mt-2">
                <TimePicker
                  value={formData.time}
                  onChange={(val) => setFormData({ ...formData, time: val })}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger className="mt-2">
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {task ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
