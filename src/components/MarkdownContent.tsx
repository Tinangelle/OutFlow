import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import type { ReactNode } from 'react'

const markdownRemarkPlugins = [remarkGfm, remarkBreaks]

const mdLink = ({
  href,
  children,
}: {
  href?: string
  children?: ReactNode
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="text-violet-600 underline dark:text-violet-400"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    {children}
  </a>
)

export function MarkdownContent({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        components={{ a: mdLink }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
