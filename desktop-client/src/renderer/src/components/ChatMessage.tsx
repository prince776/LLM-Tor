import React, { useEffect, useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { Message } from '../types'
import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { fetchPfpWithCache } from '../utils/pfpCache'

interface ChatMessageProps {
  message: Message
  isLastAssistant?: boolean
  onRegenerate?: () => void
  onEdit?: (newContent: string) => void
  onDelete?: () => void
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onDelete
}) => {
  const isUser = message.role === 'user'
  const { user } = useUser()
  const [pfpUrl, setPfpUrl] = useState<string | undefined>(undefined)
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditingMessage, setIsEditingMessage] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    let isMounted = true
    if (isUser && user?.picture) {
      fetchPfpWithCache(user.picture)
        .then((url) => {
          if (isMounted) setPfpUrl(url)
        })
        .catch(() => setPfpUrl(undefined))
    } else {
      setPfpUrl(undefined)
    }
    return () => {
      isMounted = false
    }
  }, [isUser, user?.picture])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const handleSaveEdit = () => {
    if (editedContent.trim() && editedContent !== message.content && onEdit) {
      onEdit(editedContent.trim())
      setIsEditingMessage(false)
    } else {
      setIsEditingMessage(false)
    }
  }

  const handleDeleteMessage = () => {
    if (onDelete) {
      onDelete()
    }
    setShowDeleteConfirm(false)
  }

  return (
    <div
      className={`flex gap-4 p-6 mb-1 ${isUser ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-800/50'}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-700">
        {isUser ? (
          user?.picture && pfpUrl ? (
            <img src={pfpUrl} alt="User avatar" className="w-8 h-8 object-cover" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 flex items-center justify-center rounded-full">
              <User size={16} className="text-white" />
            </div>
          )
        ) : (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center rounded-full">
            <Bot size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {isEditingMessage ? (
          <div className="mb-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-3 rounded border border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={handleSaveEdit}
              >
                Save
              </button>
              <button
                className="px-3 py-1.5 text-xs rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                onClick={() => {
                  setIsEditingMessage(false)
                  setEditedContent(message.content)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm max-w-full dark:prose-invert mb-4 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              urlTransform={(url) => url}
              components={{
                hr() {
                  return <hr style={{ margin: '1.5em 0' }} />
                },
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        borderRadius: '0.5rem',
                        fontSize: '0.95em',
                        margin: 0,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
                p({ children }) {
                  return <p style={{ margin: '0.3em 0' }}>{children}</p>
                },
                li({ children }) {
                  return <li style={{ margin: '0.2em 0' }}>{children}</li>
                },
                img({ src, alt }) {
                  if (!src) return null
                  return (
                    <img
                      src={src}
                      alt={alt || 'image'}
                      className="rounded-md border border-gray-200 dark:border-gray-700 block my-2 cursor-default object-contain max-w-sm max-h-60"
                    />
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            <div className="flex justify-between items-start">
              <div className="relative flex gap-2">
                <button
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                  title="Copy message"
                  onClick={handleCopy}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="8" height="8" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                {(showTooltip || copied) && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs rounded bg-gray-800 text-white whitespace-nowrap z-10 shadow-lg">
                    {copied ? 'Copied!' : 'Copy'}
                  </div>
                )}
                {/* Edit Button (only for user messages) */}
                {isUser && onEdit && !isEditingMessage && (
                  <button
                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                    title="Edit message"
                    onClick={() => setIsEditingMessage(true)}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2l2 2-8 8-2 2H2v-2l2-2 8-8z" />
                    </svg>
                  </button>
                )}
                {/* Delete Button (for both user and assistant messages) */}
                {onDelete && !isEditingMessage && (
                  <button
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                    title="Delete message"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                )}
                {/* Regenerate Response Button (only for last assistant message) */}
                {isLastAssistant && onRegenerate && (
                  <button
                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors text-xs flex items-center gap-1"
                    title="Regenerate response"
                    onClick={onRegenerate}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 4v4a4 4 0 0 0 4 4h6" />
                      <polyline points="15 9 15 5 11 5" />
                    </svg>
                    Regenerate Response
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Message?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  onClick={handleDeleteMessage}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
