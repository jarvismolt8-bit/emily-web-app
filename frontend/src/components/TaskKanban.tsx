import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type TaskStatus = 'backlog' | 'in_progress' | 'done' | 'archive'

interface Task {
  id: string
  name: string
  description?: string
  date?: string
  time?: string
  status: TaskStatus
  priority: 'high' | 'medium' | 'low'
}

interface TaskKanbanProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  showArchive?: boolean
}

interface Column {
  id: TaskStatus
  title: string
}

const COLUMNS: Column[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
  { id: 'archive', title: 'Archive' },
]

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

function TaskCard({ task, onEdit, isOverlay = false }: { task: Task; onEdit: (task: Task) => void; isOverlay?: boolean }) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-2 p-3 border rounded-lg bg-card shadow-sm cursor-grab active:cursor-grabbing ${
        isOverlay ? 'rotate-2 shadow-lg ring-2 ring-primary' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <div
          className="flex-1 min-w-0"
          onClick={() => onEdit(task)}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
            <span className="font-medium text-sm truncate">{task.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">#{task.id}</span>
            {task.date && (
              <span className="text-xs text-muted-foreground">
                {task.date}{task.time ? ` ${task.time}` : ''}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function BoardColumn({ column, tasks, onEdit }: { column: Column; tasks: Task[]; onEdit: (task: Task) => void }) {
  const taskIds = tasks.map(task => task.id)

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-4 bg-muted/30 min-h-[150px] md:min-h-[400px] w-[280px] md:min-w-[320px] md:flex-1 flex-shrink-0 transition-colors ${isOver ? 'ring-2 ring-primary bg-muted/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{column.title}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="space-y-2">
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export default function TaskKanban({ tasks, onEdit, onStatusChange, showArchive = true }: TaskKanbanProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const isDraggingRef = useRef(false)

  // Only sync from props when NOT dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTasks(tasks)
    }
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    isDraggingRef.current = true
    const activeId = event.active.id as string
    const task = localTasks.find(t => t.id === activeId)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTaskData = localTasks.find(t => t.id === activeId)
    if (!activeTaskData) return

    let targetStatus: TaskStatus | null = null

    const overType = over.data.current?.type
    if (overType === 'Column') {
      targetStatus = (over.data.current?.column?.id || overId) as TaskStatus
    } else {
      const isColumn = COLUMNS.find(col => col.id === overId)
      if (isColumn) {
        targetStatus = overId as TaskStatus
      } else {
        const overTask = localTasks.find(t => t.id === overId)
        if (overTask) {
          targetStatus = overTask.status
          
          if (activeTaskData.status === overTask.status) {
            setLocalTasks(prev => {
              const oldIndex = prev.findIndex(t => t.id === activeId)
              const newIndex = prev.findIndex(t => t.id === overId)
              return arrayMove(prev, oldIndex, newIndex)
            })
            return
          }
        }
      }
    }

    if (targetStatus && activeTaskData.status !== targetStatus) {
      setLocalTasks(prev => {
        const oldIndex = prev.findIndex(t => t.id === activeId)
        const updated = [...prev]
        updated[oldIndex] = { ...updated[oldIndex], status: targetStatus! }
        
        const overTask = localTasks.find(t => t.id === overId)
        if (overTask) {
          const overIndex = updated.findIndex(t => t.id === overId)
          return arrayMove(updated, oldIndex, overIndex)
        }
        
        return updated
      })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    isDraggingRef.current = false
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find the original task from props (before any local changes)
    const originalTask = tasks.find(t => t.id === activeId)
    const finalTask = localTasks.find(t => t.id === activeId)

    if (!originalTask || !finalTask) return

    // Only call API if status changed
    if (originalTask.status !== finalTask.status) {
      onStatusChange(activeId, finalTask.status)
    }
  }

  const visibleColumns = showArchive ? COLUMNS : COLUMNS.filter(c => c.id !== 'archive')
  const columnsWithTasks = visibleColumns.map(column => ({
    ...column,
    tasks: localTasks.filter(task => task.status === column.id)
  }))

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columnsWithTasks.map(column => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={column.tasks}
            onEdit={onEdit}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay>
          {activeTask && (
            <div className="p-3 border rounded-lg bg-card shadow-lg ring-2 ring-primary rotate-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[activeTask.priority]}`} />
                    <span className="font-medium text-sm truncate">{activeTask.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{activeTask.id}</span>
                    {activeTask.date && (
                      <span className="text-xs text-muted-foreground">
                        {activeTask.date}{activeTask.time ? ` ${activeTask.time}` : ''}
                      </span>
                    )}
                  </div>
                  {activeTask.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {activeTask.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
      </DndContext>
    </div>
  )
}
