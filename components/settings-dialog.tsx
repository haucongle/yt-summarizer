'use client'

import { useState, useEffect, useRef } from 'react'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  apiKey: string
  onSave: (key: string) => void
}

export function SettingsDialog({
  isOpen,
  onClose,
  apiKey,
  onSave,
}: SettingsDialogProps) {
  const [value, setValue] = useState(apiKey)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(apiKey)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, apiKey])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(value.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Settings
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Enter your OpenAI API key to start chatting. Your key is stored locally
          in your browser and never sent to any server other than OpenAI.
        </p>

        <div className="mt-4">
          <label
            htmlFor="api-key-input"
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            OpenAI API Key
          </label>
          <input
            ref={inputRef}
            id="api-key-input"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="sk-..."
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
