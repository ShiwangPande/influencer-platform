"use client"

import { useEffect, useRef } from "react"
import { formatTime } from "@/lib/utils"
import { VoiceMemoPlayer } from "./voice-memo-player"

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: Date
  isRead: boolean
  voiceMemo?: {
    id: string
    fileUrl: string
    duration: number
    isRead: boolean
  } | null
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  otherUser: {
    id: string
    firstName: string | null
    lastName: string | null
    imageUrl: string | null
  }
}

export function MessageList({ messages, currentUserId, otherUser }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.senderId === currentUserId

          return (
            <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <div className="flex max-w-[80%]">
                {!isOwnMessage && (
                  <div className="h-8 w-8 rounded-full overflow-hidden mr-2 flex-shrink-0">
                    <img
                      src={otherUser.imageUrl || "/placeholder.svg?height=32&width=32"}
                      alt={`${otherUser.firstName} ${otherUser.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className={`rounded-lg p-3 ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="text-sm">{message.content}</p>
                    {message.voiceMemo && (
                      <div className="mt-2">
                        <VoiceMemoPlayer url={message.voiceMemo.fileUrl} duration={message.voiceMemo.duration} />
                      </div>
                    )}
                  </div>
                  <div className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? "text-right" : "text-left"}`}>
                    {formatTime(message.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
