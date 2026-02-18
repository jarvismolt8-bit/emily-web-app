import { CheckCircle, XCircle, Smartphone, Monitor, Settings } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  'telegram': <Smartphone className="h-4 w-4" />,
  'web_app': <Monitor className="h-4 w-4" />,
  'system': <Settings className="h-4 w-4" />
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  'cashflow_add': 'text-blue-500',
  'cashflow_update': 'text-blue-500',
  'cashflow_delete': 'text-blue-500',
  'task_create': 'text-purple-500',
  'task_update': 'text-purple-500',
  'task_delete': 'text-purple-500',
  'todo_add': 'text-amber-500',
  'todo_delete': 'text-amber-500',
  'todo_complete': 'text-amber-500',
  'report_generate': 'text-cyan-500',
  'query_answered': 'text-pink-500'
}

interface ActivityLog {
  id: string
  date: string
  time: string
  source: string
  action_type: string
  description: string
  status: string
  error_message?: string
}

interface ActivityLogTableProps {
  logs: ActivityLog[]
}

export default function ActivityLogTable({ logs }: ActivityLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No activity logs found
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11">Date</TableHead>
              <TableHead className="w-[60px]">Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium">{log.date}</div>
                  <div className="text-xs text-muted-foreground">{log.time}</div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="flex justify-center text-muted-foreground">
                        {SOURCE_ICONS[log.source] || '📋'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{log.source}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className={`text-sm font-medium ${ACTION_TYPE_COLORS[log.action_type] || 'text-muted-foreground'}`}>
                    {log.action_type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate">{log.description}</div>
                  {log.error_message && (
                    <div className="text-xs text-rose-500 truncate">
                      {log.error_message}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="flex justify-center">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{log.status}</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
