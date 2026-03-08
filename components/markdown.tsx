'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-3 list-disc pl-6 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal pl-6 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 last:mb-0">
                <code>{children}</code>
              </pre>
            )
          }
          return (
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
              {children}
            </code>
          )
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
          >
            {children}
          </a>
        ),
        h1: ({ children }) => (
          <h1 className="mb-3 text-2xl font-bold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 text-xl font-bold">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 text-lg font-semibold">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-4 border-zinc-300 pl-4 italic text-zinc-600 dark:border-zinc-600 dark:text-zinc-400">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-600">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-zinc-300 bg-zinc-100 px-3 py-2 text-left font-semibold dark:border-zinc-600 dark:bg-zinc-800">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-zinc-300 px-3 py-2 dark:border-zinc-600">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
