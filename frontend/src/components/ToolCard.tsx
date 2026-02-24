import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench, FileText, Edit, Globe, Search, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeBlock } from './ui/code-block'

interface ToolCardProps {
  kind: 'call' | 'result'
  name: string
  args?: Record<string, unknown>
  output?: string
  success?: boolean
}

const TOOL_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  bash: { icon: <Wrench className="h-4 w-4" />, label: 'Bash' },
  read: { icon: <FileText className="h-4 w-4" />, label: 'Read' },
  write: { icon: <Edit className="h-4 w-4" />, label: 'Write' },
  edit: { icon: <Edit className="h-4 w-4" />, label: 'Edit' },
  web_fetch: { icon: <Globe className="h-4 w-4" />, label: 'Web Fetch' },
  web_search: { icon: <Search className="h-4 w-4" />, label: 'Web Search' },
  browser: { icon: <Globe className="h-4 w-4" />, label: 'Browser' },
}

function getToolPreview(name: string, args?: Record<string, unknown>): string {
  if (!args) return name
  
  switch (name.toLowerCase()) {
    case 'bash':
      return typeof args.command === 'string' 
        ? args.command.slice(0, 60) + (args.command.length > 60 ? '...' : '')
        : name
    case 'read':
    case 'write':
    case 'edit':
      return typeof args.path === 'string' ? args.path : name
    case 'web_fetch':
    case 'browser':
      return typeof args.url === 'string' ? args.url : name
    case 'web_search':
      return typeof args.query === 'string' ? args.query : name
    default:
      return name
  }
}

function isJsonLike(text: string): boolean {
  return (text.trim().startsWith('{') || text.trim().startsWith('[')) && 
         (text.trim().endsWith('}') || text.trim().endsWith(']'))
}

export function ToolCard({ kind, name, args, output, success }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  const config = TOOL_CONFIG[name.toLowerCase()] || { 
    icon: <Puzzle className="h-4 w-4" />, 
    label: name 
  }
  
  const preview = kind === 'call' ? getToolPreview(name, args) : output?.slice(0, 50)
  const hasOutput = output && output.trim().length > 0
  
  return (
    <div className={cn(
      'rounded-lg border my-1.5 overflow-hidden',
      success === false ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-muted/50'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/80 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{config.icon}</span>
        <span className="font-medium text-sm">{config.label}</span>
        {!expanded && preview && (
          <span className="text-muted-foreground text-xs truncate flex-1">
            {preview}
          </span>
        )}
        {kind === 'result' && success !== undefined && (
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            success ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
          )}>
            {success ? '✓' : '✗'}
          </span>
        )}
      </button>
      
      {expanded && (
        <div className="border-t px-3 py-2">
          {kind === 'call' && args && Object.keys(args).length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-muted-foreground mb-1">Arguments:</div>
              <CodeBlock 
                code={JSON.stringify(args, null, 2)} 
                language="json"
                className="text-xs"
              />
            </div>
          )}
          
          {kind === 'result' && hasOutput && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">Output:</div>
              {isJsonLike(output!) ? (
                <CodeBlock code={output!} language="json" className="text-xs" />
              ) : (
                <pre className="text-xs bg-zinc-900 dark:bg-zinc-950 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                  {output}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ThinkingCardProps {
  thinking: string
}

export function ThinkingCard({ thinking }: ThinkingCardProps) {
  const [expanded, setExpanded] = useState(false)
  
  if (!thinking?.trim()) return null
  
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 my-1.5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-500/10 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
        <span className="text-amber-600 dark:text-amber-400">💭</span>
        <span className="text-sm text-amber-700 dark:text-amber-300 italic">
          Thinking...
        </span>
      </button>
      
      {expanded && (
        <div className="border-t border-amber-500/20 px-3 py-2">
          <div className="text-xs text-amber-700 dark:text-amber-300 italic whitespace-pre-wrap">
            {thinking}
          </div>
        </div>
      )}
    </div>
  )
}
