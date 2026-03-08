'use client'

import { useRef, useCallback } from 'react'
import { SendIcon, StopIcon } from './icons'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  isLoading: boolean
  disabled: boolean
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (!isLoading && value.trim() && !disabled) {
          onSubmit()
        }
      }
    },
    [isLoading, value, disabled, onSubmit],
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [])

  return (
    <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm transition-colors focus-within:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-zinc-500">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={
          disabled ? 'Enter your API key to start chatting...' : 'Send a message...'
        }
        disabled={disabled}
        rows={1}
        className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      {isLoading ? (
        <button
          onClick={onStop}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          aria-label="Stop generating"
        >
          <StopIcon className="size-4" />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!value.trim() || disabled}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          aria-label="Send message"
        >
          <SendIcon className="size-4" />
        </button>
      )}
    </div>
  )
}
