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
import { Trash2, Loader2, Pencil, X, Save } from 'lucide-react'

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
  const [isEditingDoc, setIsEditingDoc] = useState(false)
  const [docDraft, setDocDraft] = useState('')
  const [docSaving, setDocSaving] = useState(false)

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
      setIsEditingDoc(false)
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

  const saveDocumentation = async () => {
    if (!task?.id) return
    setDocSaving(true)
    try {
      const response = await fetch(`${API_BASE}/tasks/${task.id}/documentation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Password': '10716255',
          'X-Source': 'web_app'
        },
        body: JSON.stringify({ content: docDraft })
      })
      const data = await response.json()
      if (data.success) {
        setDocContent(docDraft)
        setIsEditingDoc(false)
      }
    } catch (error) {
      console.error('Failed to save documentation:', error)
    } finally {
      setDocSaving(false)
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
                className="mt-2 min-h-[200px]"
                rows={3}
              />
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="w-full">
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
                  className="mt-2 w-full max-w-[180px] text-sm"
                />
              </div>
              <div className="flex gap-2 w-full">
                <div className="flex-1 min-w-[120px]">
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
                <div className="flex-1 min-w-[120px]">
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Documentation</span>
                {!docLoading && (
                  isEditingDoc ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingDoc(false)}
                        disabled={docSaving}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveDocumentation}
                        disabled={docSaving}
                      >
                        {docSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDocDraft(docContent)
                        setIsEditingDoc(true)
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )
                )}
              </div>
              {docLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : isEditingDoc ? (
                <Textarea
                  value={docDraft}
                  onChange={(e) => setDocDraft(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Write markdown documentation here..."
                />
              ) : docContent ? (
                <div className="max-w-none space-y-3 text-sm text-foreground
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2
                  [&_p]:mb-2
                  [&_ul]:list-disc [&_ul]:list-inside [&_ul]:mb-2
                  [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:mb-2
                  [&_li]:mb-1
                  [&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs
                  [&_pre]:bg-muted [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:mb-3
                  [&_a]:text-blue-500 [&_a]:underline
                  [&_strong]:font-semibold
                  [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:italic">
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
