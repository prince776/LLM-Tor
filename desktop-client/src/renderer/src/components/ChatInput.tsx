import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Image as ImageIcon, X } from 'lucide-react'

interface ImageAttachment {
  name: string
  mime: string
  dataUrl: string
  size: number
}

interface ChatInputProps {
  // Updated to send rich payload including images
  onSendMessage: (payload: {
    text: string
    images?: ImageAttachment[]
    displayText?: string
  }) => void
  disabled?: boolean
  isLoading?: boolean
  disabledText?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  isLoading = false,
  disabledText
}) => {
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const hasContent = message.trim().length > 0 || attachments.length > 0
    if (!hasContent || disabled || isLoading) return

    const text = message.trim()
    const images = attachments

    // Build display text for chat history (embed images as markdown for rendering)
    const imageMarkdown = images.map((img) => `![image](${img.dataUrl})`).join('\n')
    const displayText = [text, imageMarkdown]
      .filter(Boolean)
      .join(text && imageMarkdown ? '\n\n' : '')

    onSendMessage({ text, images, displayText })
    setMessage('')
    setAttachments([])
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const onPickFiles = (): void => fileInputRef.current?.click()

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files) return
    const newAttachments: ImageAttachment[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      // Limit single image size to ~5MB to avoid huge payloads
      if (file.size > 5 * 1024 * 1024) continue
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (err) => reject(err)
        reader.readAsDataURL(file)
      })
      newAttachments.push({ name: file.name, mime: file.type, dataUrl, size: file.size })
    }

    if (newAttachments.length) setAttachments((prev) => [...prev, ...newAttachments])
  }

  const onRemoveAttachment = (idx: number): void => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    const items = e.clipboardData?.items
    if (!items) return
    const files: File[] = []
    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && file.type.startsWith('image/')) files.push(file)
      }
    }
    if (files.length) {
      e.preventDefault()
      const dt = new DataTransfer()
      files.forEach((f) => dt.items.add(f))
      handleFiles(dt.files)
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    handleFiles(e.dataTransfer?.files || null)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
  }

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled && !isLoading

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="relative max-w-4xl mx-auto">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {attachments.map((att, idx) => (
              <div
                key={`${att.name}-${idx}`}
                className="relative w-16 h-16 rounded overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveAttachment(idx)}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative" onDrop={onDrop} onDragOver={onDragOver}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={disabled && disabledText ? disabledText : 'Type your message here...'}
            disabled={disabled || isLoading}
            rows={1}
            className={`
              w-full px-12 py-3 pr-12 rounded-xl border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              placeholder-gray-500 dark:placeholder-gray-400
              focus:ring-2 focus:ring-blue-500 focus:border-transparent
              resize-none transition-all duration-200
              ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
              scrollbar-hide
            `}
            style={{ minHeight: '48px' }}
          />
          {/* Attach button */}
          <button
            type="button"
            onClick={onPickFiles}
            disabled={disabled || isLoading}
            className={`absolute left-2 top-2 p-2 rounded-lg transition-all duration-200 ${
              !disabled && !isLoading ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : 'opacity-50'
            }`}
            title="Attach image"
          >
            <ImageIcon size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="submit"
            disabled={!canSend}
            className={`
              absolute right-2 top-2 p-2 rounded-lg transition-all duration-200
              ${
                canSend
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line. You can paste, drag & drop, or attach
          images.
        </div>
      </div>
    </form>
  )
}
