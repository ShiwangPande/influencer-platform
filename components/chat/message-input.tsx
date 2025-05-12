"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Mic, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatAudioTime } from "@/lib/utils"

interface MessageInputProps {
  conversationId: string
  onSendMessage: (content: string, voiceMemoFile?: File) => Promise<void>
  isInfluencer: boolean
  hasCredits?: boolean
}

export function MessageInput({ conversationId, onSendMessage, isInfluencer, hasCredits = true }: MessageInputProps) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [voiceMemoFile, setVoiceMemoFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mpeg" })
        const audioFile = new File([audioBlob], "voice-memo.mp3", { type: "audio/mpeg" })
        setVoiceMemoFile(audioFile)

        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)

        // Limit recording to 2 minutes
        if (seconds >= 120) {
          stopRecording()
        }
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please check your permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setIsRecording(false)
  }

  const cancelVoiceMemo = () => {
    setVoiceMemoFile(null)
  }

  const handleSubmit = async () => {
    if ((!message.trim() && !voiceMemoFile) || isSubmitting) return

    try {
      setIsSubmitting(true)
      await onSendMessage(message.trim(), voiceMemoFile || undefined)
      setMessage("")
      setVoiceMemoFile(null)
      router.refresh()
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t p-4">
      {!hasCredits && !isInfluencer && (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-md mb-4 text-sm">
          You don't have enough credits to send a message.
          <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/dashboard/credits/buy")}>
            Buy credits
          </Button>
        </div>
      )}

      {voiceMemoFile && (
        <div className="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <Mic className="h-4 w-4 mr-2" />
            <span className="text-sm">Voice memo ready to send</span>
          </div>
          <Button variant="ghost" size="sm" onClick={cancelVoiceMemo}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isRecording && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse" />
            <span className="text-sm">Recording: {formatAudioTime(recordingTime)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={stopRecording}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={hasCredits || isInfluencer ? "Type a message..." : "Buy credits to send messages..."}
          className="flex-1 min-h-[80px] resize-none"
          disabled={!hasCredits && !isInfluencer}
        />
        <div className="flex flex-col gap-2">
          {isInfluencer && !isRecording && !voiceMemoFile && (
            <Button variant="outline" size="icon" onClick={startRecording} disabled={isSubmitting}>
              <Mic className="h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={(!message.trim() && !voiceMemoFile) || isSubmitting || (!hasCredits && !isInfluencer)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
