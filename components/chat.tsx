'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { Message } from '@/types/chat'
import { generateId } from '@/lib/utils'
import { streamChat, getStoredApiKey, setStoredApiKey } from '@/lib/chat'
import { ChatMessage, ThinkingIndicator } from './message'
import { ChatInput } from './chat-input'
import { SettingsDialog } from './settings-dialog'
import { SettingsIcon, PlusIcon, SparklesIcon } from './icons'

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const key = getStoredApiKey()
    setApiKey(key)
    if (!key) setShowSettings(true)
  }, [])

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading || !apiKey) return

    setError(null)
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    }

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages([...updatedMessages, assistantMessage])
    setInput('')
    setIsLoading(true)
    scrollToBottom()

    const abort = new AbortController()
    abortRef.current = abort

    try {
      await streamChat(
        updatedMessages,
        apiKey,
        (chunk) => {
          assistantMessage.content += chunk
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { ...assistantMessage }
            return updated
          })
          scrollToBottom()
        },
        abort.signal,
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        // Remove empty assistant message on error
        if (!assistantMessage.content) {
          setMessages(updatedMessages)
        }
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [input, isLoading, apiKey, messages, scrollToBottom])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsLoading(false)
  }, [])

  const handleNewChat = useCallback(() => {
    if (isLoading) {
      abortRef.current?.abort()
      setIsLoading(false)
    }
    setMessages([])
    setError(null)
    setInput('')
  }, [isLoading])

  const handleSaveApiKey = useCallback((key: string) => {
    setApiKey(key)
    setStoredApiKey(key)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-violet-600 dark:text-violet-400" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Chatbot
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="New chat"
            title="New chat"
          >
            <PlusIcon className="size-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="size-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950">
              <SparklesIcon className="size-8 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                How can I help you today?
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Start a conversation by typing a message below.
              </p>
            </div>
            {!apiKey && (
              <button
                onClick={() => setShowSettings(true)}
                className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
              >
                Set API Key to Get Started
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading &&
              messages.length > 0 &&
              !messages[messages.length - 1]?.content && (
                <ThinkingIndicator />
              )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={handleStop}
          isLoading={isLoading}
          disabled={!apiKey}
        />
        <p className="mt-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          Chatbot can make mistakes. Your API key is stored locally in your browser.
        </p>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        apiKey={apiKey}
        onSave={handleSaveApiKey}
      />
    </div>
  )
}
