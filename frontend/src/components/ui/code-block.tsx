import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
}

export function CodeBlock({ code, language = 'json', className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      import('highlight.js').then((hljs) => {
        if (codeRef.current) {
          codeRef.current.textContent = code
          hljs.default.highlightElement(codeRef.current)
        }
      }).catch(() => {
        if (codeRef.current) {
          codeRef.current.textContent = code
        }
      })
    }
  }, [code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }

  return (
    <div className={cn('relative group rounded-md bg-zinc-900 dark:bg-zinc-950 overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 dark:bg-zinc-900 text-xs text-zinc-400">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm">
        <code
          ref={codeRef}
          className={`language-${language} text-zinc-100`}
        >
          {code}
        </code>
      </pre>
    </div>
  )
}
