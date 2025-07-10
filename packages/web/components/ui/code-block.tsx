"use client"

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"

export type CodeBlockProps = {
  children?: React.ReactNode
  className?: string
} & React.HTMLProps<HTMLDivElement>

function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "not-prose flex max-w-full flex-col overflow-hidden border",
        "border-border bg-card text-card-foreground rounded-xl my-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type CodeBlockCodeProps = {
  code: string
  language?: string
  theme?: string
  className?: string
  showHeader?: boolean
} & React.HTMLProps<HTMLDivElement>

function CodeBlockCode({
  code,
  language = "tsx",
  theme,
  className,
  showHeader = true,
  ...props
}: CodeBlockCodeProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { theme: currentTheme } = useTheme()

  // Auto-select theme based on current theme if not specified
  const selectedTheme = theme || (currentTheme === 'dark' ? 'github-dark' : 'github-light')

  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("<pre><code></code></pre>")
        return
      }

      try {
        const html = await codeToHtml(code, { 
          lang: language, 
          theme: selectedTheme 
        })
        setHighlightedHtml(html)
      } catch (error) {
        console.warn(`Failed to highlight code with language "${language}", falling back to plaintext:`, error)
        // Fallback to plaintext if language is not supported
        const html = await codeToHtml(code, { 
          lang: 'plaintext', 
          theme: selectedTheme 
        })
        setHighlightedHtml(html)
      }
    }
    highlight()
  }, [code, language, selectedTheme])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const getLanguageDisplayName = (lang: string) => {
    const langMap: Record<string, string> = {
      'tsx': 'TypeScript React',
      'ts': 'TypeScript',
      'js': 'JavaScript',
      'jsx': 'JavaScript React',
      'python': 'Python',
      'py': 'Python',
      'css': 'CSS',
      'html': 'HTML',
      'json': 'JSON',
      'bash': 'Bash',
      'sh': 'Shell',
      'sql': 'SQL',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'plaintext': 'Plain Text',
    }
    return langMap[lang.toLowerCase()] || lang.toUpperCase()
  }

  const codeContent = (
    <div
      className={cn(
        "w-full max-w-full overflow-x-auto text-[13px] leading-relaxed",
        "[&>pre]:px-6 [&>pre]:py-5 [&>pre]:m-0 [&>pre]:bg-transparent",
        "[&>pre]:max-w-full [&>pre]:overflow-x-auto",
        "[&_code]:bg-transparent [&_code]:p-0",
        className
      )}
      {...props}
    >
      {highlightedHtml ? (
        <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        <pre className="px-6 py-5 m-0 bg-transparent max-w-full overflow-x-auto">
          <code className="bg-transparent p-0">{code}</code>
        </pre>
      )}
    </div>
  )

  if (!showHeader) {
    return codeContent
  }

  return (
    <>
      <CodeBlockGroup className="border-border border-b py-2 pr-2 pl-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary rounded px-2 py-1 text-xs font-medium">
            {getLanguageDisplayName(language)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCopy}
        >
          {copied ? (
            // @ts-expect-error - Lucide icon types
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            // @ts-expect-error - Lucide icon types  
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </CodeBlockGroup>
      {codeContent}
    </>
  )
}

export type CodeBlockGroupProps = React.HTMLAttributes<HTMLDivElement>

function CodeBlockGroup({
  children,
  className,
  ...props
}: CodeBlockGroupProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { CodeBlockGroup, CodeBlockCode, CodeBlock }
