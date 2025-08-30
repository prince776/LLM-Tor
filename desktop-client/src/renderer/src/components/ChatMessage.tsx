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
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const { user } = useUser()
  const [pfpUrl, setPfpUrl] = useState<string | undefined>(undefined)
  const [showTooltip, setShowTooltip] = useState(false)
  const [copied, setCopied] = useState(false)

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
        <div
          className="prose prose-sm max-w-none dark:prose-invert mb-4"
          style={{ lineHeight: 1.8 }}
        >
          <div className="flex justify-between items-start">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                hr() {
                  return <hr style={{ margin: '1.5em 0' }} />
                },
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ borderRadius: '0.5rem', fontSize: '0.95em', margin: 0 }}
                      {...props}
                    >
                      {String(children)}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
            <div className="relative">
              <button
                className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
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
            </div>
          </div>
        </div>
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
