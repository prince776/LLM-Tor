import React, { useState, useRef, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ModelSelector } from './ModelSelector'
import { Chat, Message } from '../types'
import { useError } from '@renderer/contexts/ErrorContext'
import { LLMProxyReq, LLMProxyResp } from '../../../types/ipc'
import { useSettings } from '../contexts/SettingsContext'
import { useUser } from '../contexts/UserContext'

interface ChatInterfaceProps {
  chat: Chat | undefined
  onSendMessage: (message: string, role: 'user' | 'assistant') => void
  onToggleSidebar: () => void
  onEditChatTitle?: (chatId: string, newTitle: string) => void
}

interface LoadingState {
  isLoading: boolean
  message: string
}

// Local type mirroring ChatInput's image attachment (only fields we need)
interface ImageAttachment {
  dataUrl: string
  name: string
  mime: string
  size: number
}

// Extract image data URLs from markdown and return content parts for OpenAI
function toOpenAIContentFromMarkdown(md: string): Array<any> | string {
  // Match markdown images: ![alt](url)
  const regex = /!\[[^\]]*\]\(([^\)]+)\)/g
  const imageUrls: string[] = []
  let match
  while ((match = regex.exec(md)) !== null) {
    const url = match[1]
    if (url.startsWith('data:image/')) imageUrls.push(url)
  }
  // Remove image tags from text for the text part
  const textOnly = md.replace(regex, '').trim()

  if (imageUrls.length === 0) {
    return md
  }

  const parts: any[] = []
  if (textOnly) parts.push({ type: 'text', text: textOnly })
  for (const url of imageUrls) {
    parts.push({ type: 'image_url', image_url: { url } })
  }
  return parts
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chat,
  onSendMessage,
  onToggleSidebar,
  onEditChatTitle
}) => {
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false, message: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { systemPrompt } = useSettings()
  const { showError } = useError()
  const { user, decrementToken } = useUser()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(chat?.title || '')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat?.messages])

  useEffect(() => {
    setEditedTitle(chat?.title || '')
  }, [chat?.title])

  const handleSendMessage = async (payload: {
    text: string
    images?: ImageAttachment[]
    displayText?: string
  }) => {
    try {
      // 1. Add the user's message to UI (embed images as markdown so ChatMessage shows them)
      const displayText = payload.displayText ?? payload.text
      onSendMessage(displayText, 'user')

      // 2. Get auth token.
      setLoadingState({ isLoading: true, message: 'Generating Anonymous Token...' })
      const blindedToken = await window.api.generateToken({
        modelName: selectedModel
      })
      if (blindedToken.error) {
        throw blindedToken.error
      }

      if (blindedToken.isNew) {
        decrementToken(selectedModel)
      }

      // 3. Get LLM response.
      setLoadingState({ isLoading: true, message: 'Getting LLM Response Anonymously...' })

      // Build messages for LLM, converting markdown image tags into image_url content items
      const historyMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...((chat?.messages ?? []) as Message[])
      ]

      // Convert history messages
      const mappedHistory = historyMessages.map((m: any) => {
        // m may be system prompt object or Message
        const role = m.role
        const content =
          typeof m.content === 'string' ? toOpenAIContentFromMarkdown(m.content) : m.content
        return { role, content }
      })

      // Current user message with potential inline images
      const currentUserContentParts: any[] = []
      if (payload.text && payload.text.trim()) {
        currentUserContentParts.push({ type: 'text', text: payload.text.trim() })
      }
      if (payload.images && payload.images.length) {
        for (const img of payload.images) {
          currentUserContentParts.push({ type: 'image_url', image_url: { url: img.dataUrl } })
        }
      }

      const allMessages = [
        ...mappedHistory,
        {
          role: 'user',
          content: currentUserContentParts.length ? currentUserContentParts : payload.text
        }
      ]

      const llmsProxyReq: LLMProxyReq = {
        token: blindedToken.token || '',
        signedToken: blindedToken.signedToken || '',
        modelName: selectedModel,
        messages: allMessages as any
      }

      const llmResp: LLMProxyResp = await window.api.llmProxy(llmsProxyReq)
      console.log('Got LLM response', llmResp)
      if (llmResp.blocked) {
        showError(`Request Blocked: ${llmResp.blockReason ?? 'Unknown reason'}`)
        return
      }
      if (llmResp.error || !llmResp.data) {
        throw llmResp.error
      }

      // 4. Process response and update chat.
      const aiMsg = llmResp.data.choices[0].message.content as unknown as string
      onSendMessage(aiMsg, 'assistant')
    } catch (e) {
      showError('Error generating chat response', e)
    } finally {
      setLoadingState({ isLoading: false, message: '' })
    }
  }

  // Add regenerate response handler
  const handleRegenerateResponse = async () => {
    if (!chat || chat.messages.length === 0) return
    // Find the last user message
    const lastUserMsgIdx = [...chat.messages].map((m) => m.role).lastIndexOf('user')
    if (lastUserMsgIdx === -1) return
    // Store the last user message before updating chat.messages
    const lastUserMsg = chat.messages[lastUserMsgIdx]
    // Remove the last assistant message (the response) along with the last user message
    const newMessages = chat.messages.slice(0, lastUserMsgIdx)
    if (chat) {
      chat.messages = newMessages
    }

    // Parse images from markdown in last user message
    const regex = /!\[[^\]]*\]\(([^\)]+)\)/g
    const images: ImageAttachment[] = []
    let match
    while ((match = regex.exec(lastUserMsg.content)) !== null) {
      const url = match[1]
      if (url.startsWith('data:image/')) {
        images.push({ dataUrl: url, name: 'image', mime: 'image/*', size: 0 })
      }
    }
    const textOnly = lastUserMsg.content.replace(regex, '').trim()

    await handleSendMessage({ text: textOnly, images, displayText: lastUserMsg.content })
  }

  const handleTitleSave = () => {
    if (chat && editedTitle.trim() && editedTitle !== chat.title) {
      if (onEditChatTitle) {
        onEditChatTitle(chat.id, editedTitle.trim())
      }
      setIsEditingTitle(false)
    } else {
      setIsEditingTitle(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  className="text-lg font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  autoFocus
                />
                <button
                  className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={handleTitleSave}
                >
                  Save
                </button>
                <button
                  className="px-2 py-1 text-xs rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600"
                  onClick={() => {
                    setIsEditingTitle(false)
                    setEditedTitle(chat?.title || '')
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {chat?.title || 'Select a chat'}
                </h1>
                {chat && (
                  <button
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setIsEditingTitle(true)}
                    title="Edit chat title"
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-500 dark:text-gray-400"
                    >
                      <path d="M12 2l2 2-8 8-2 2H2v-2l2-2 8-8z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chat?.messages.length || 0} messages
            </p>
          </div>
        </div>

        <ModelSelector
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          numActiveToken={user?.numActiveToken}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {chat?.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                {/* Enlarged custom mask SVG for anonymity */}
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 56 56"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse cx="28" cy="28" rx="25" ry="16" fill="#2563eb" fillOpacity="0.15" />
                  <path
                    d="M13 28c0 7.5 6.5 14 15 14s15-6.5 15-14c0-3-1.5-6-4-8.5C36.5 15.5 32 15 28 15s-8.5.5-11 4.5C14.5 22 13 25 13 28z"
                    fill="#2563eb"
                  />
                  <ellipse cx="21.5" cy="30.5" rx="2.2" ry="3" fill="#fff" />
                  <ellipse cx="34.5" cy="30.5" rx="2.2" ry="3" fill="#fff" />
                  <path
                    d="M23 36c1.5.7 3 .7 5 .7s3.5 0 5-.7"
                    stroke="#fff"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Start A New Anonymous Conversation
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Not even LLMMask can see you. No tracking. No records. Cryptographically Secure.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {chat?.messages.map((message, idx) => {
              const isLastAssistant =
                message.role === 'assistant' &&
                idx === chat.messages.length - 1 &&
                !loadingState.isLoading
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLastAssistant={isLastAssistant}
                  onRegenerate={isLastAssistant ? handleRegenerateResponse : undefined}
                />
              )
            })}
            {loadingState.isLoading && (
              <div className="flex gap-4 p-6 bg-gray-50 dark:bg-gray-800/50">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-400 rounded-full animate-pulse" />
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                  </div>
                  {loadingState.message && (
                    <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {loadingState.message}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!chat || !user}
        isLoading={loadingState.isLoading}
        disabledText={!user ? 'You need to sign in to use anonymous chat' : undefined}
      />
    </div>
  )
}
