import { cn } from "@/lib/utils"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { CodeBlock, CodeBlockCode } from "./code-block"

export type MarkdownProps = {
  children: string
  id?: string
  className?: string
  components?: Partial<Components>
}

function extractLanguage(className?: string): string {
  if (!className) return "plaintext"
  const match = className.match(/language-(\w+)/)
  return match ? match[1] : "plaintext"
}

const INITIAL_COMPONENTS: Partial<Components> = {
  code: function CodeComponent({ className, children, ...props }) {
    const isInline =
      !props.node?.position?.start.line ||
      props.node?.position?.start.line === props.node?.position?.end.line

    if (isInline) {
      return (
        <span
          className={cn(
            "bg-primary-foreground rounded-sm px-1 font-mono text-sm",
            className
          )}
          {...props}
        >
          {children}
        </span>
      )
    }

    const language = extractLanguage(className)

    return (
      <div className="w-full max-w-full overflow-hidden">
        <CodeBlock className="w-full">
          <CodeBlockCode code={children as string} language={language} />
        </CodeBlock>
      </div>
    )
  },
  pre: function PreComponent({ children }) {
    return <>{children}</>
  },
  // Math equation components for better styling
  span: function SpanComponent({ className, children, ...props }) {
    // Handle inline math equations
    if (className?.includes('math-inline')) {
      return (
        <span 
          className={cn('katex-inline', className)} 
          {...props}
        >
          {children}
        </span>
      )
    }
    return <span className={className} {...props}>{children}</span>
  },
  div: function DivComponent({ className, children, ...props }) {
    // Handle display math equations
    if (className?.includes('math-display')) {
      return (
        <div 
          className={cn('katex-display my-4 overflow-x-auto', className)} 
          {...props}
        >
          {children}
        </div>
      )
    }
    return <div className={className} {...props}>{children}</div>
  },
}

export function Markdown({
  children,
  id,
  className,
  components = INITIAL_COMPONENTS,
}: MarkdownProps) {
  return (
    <div className={cn("prose w-full max-w-full min-w-0 overflow-hidden break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
