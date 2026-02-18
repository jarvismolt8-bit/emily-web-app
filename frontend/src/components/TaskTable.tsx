import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

const PRIORITY_COLORS: Record<string, string> = {
  'high': 'text-rose-500',
  'medium': 'text-amber-500',
  'low': 'text-emerald-500'
}

interface Task {
  id: string
  name: string
  date?: string
  time?: string
  status: string
  priority: string
}

type SortField = 'id' | 'date' | 'priority'
type SortOrder = 'asc' | 'desc'

interface TaskTableProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  sortBy?: SortField | null
  sortOrder?: SortOrder
  onSort?: (field: SortField) => void
}

function SortIndicator({ field, currentField, currentOrder }: { field: SortField; currentField?: SortField | null; currentOrder?: SortOrder }) {
  if (currentField !== field) {
    return <span className="ml-1 text-muted-foreground/50">▼</span>
  }
  return <span className="ml-1">{currentOrder === 'asc' ? '▲' : '▼'}</span>
}

export default function TaskTable({ tasks, onEdit, onDelete, sortBy, sortOrder, onSort }: TaskTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 w-[60px] cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('id')}>
              ID<SortIndicator field="id" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('date')}>
              Due<SortIndicator field="date" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => onSort?.('priority')}>
              Priority<SortIndicator field="priority" currentField={sortBy} currentOrder={sortOrder} />
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No tasks found
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-mono text-muted-foreground">{task.id}</TableCell>
                <TableCell className="font-medium">{task.name}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {task.date ? `${task.date}${task.time ? ` ${task.time}` : ''}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={task.status === 'done' ? 'default' : 'outline'} className="font-normal">
                    {task.status}
                  </Badge>
                </TableCell>
                <TableCell className={`capitalize font-medium ${PRIORITY_COLORS[task.priority] || 'text-muted-foreground'}`}>
                  {task.priority}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(task.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
