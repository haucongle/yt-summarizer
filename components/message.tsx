'use client'

import type { Message } from '@/types/chat'
import { cn } from '@/lib/utils'
import { SparklesIcon, UserIcon } from './icons'
import { Markdown } from './markdown'

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className="group relative flex gap-3 px-4 py-6">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full border',
          isUser
            ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
            : 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950',
        )}
      >
        {isUser ? (
          <UserIcon className="size-4 text-zinc-600 dark:text-zinc-400" />
        ) : (
          <SparklesIcon className="size-4 text-violet-600 dark:text-violet-400" />
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {isUser ? 'You' : 'Assistant'}
        </p>
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <Markdown content={message.content} />
          )}
        </div>
      </div>
    </div>
  )
}

export function ThinkingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-6">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950">
        <SparklesIcon className="size-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Assistant
        </p>
        <div className="flex items-center gap-1 pt-1">
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-zinc-400" />
        </div>
      </div>
    </div>
  )
}
