export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export interface ChatState {
  messages: Message[]
  isLoading: boolean
  error: string | null
}
