"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { formatAudioTime } from "@/lib/utils"

interface VoiceMemoPlayerProps {
  url: string
  duration: number
}

export function VoiceMemoPlayer({ url, duration }: VoiceMemoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    audioRef.current = new Audio(url)

    const audio = audioRef.current

    audio.addEventListener("ended", () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      audio.pause()
      audio.removeEventListener("ended", () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })
    }
  }, [url])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } else {
      audio.play()
      intervalRef.current = setInterval(() => {
        setCurrentTime(audio.currentTime)
      }, 100)
    }

    setIsPlaying(!isPlaying)
  }

  const handleSliderChange = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = value[0]
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  return (
    <div className="flex items-center space-x-2 bg-black/5 p-2 rounded-md">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1">
        <Slider value={[currentTime]} max={duration} step={0.1} onValueChange={handleSliderChange} />
      </div>
      <div className="text-xs w-16 text-right">
        {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
      </div>
    </div>
  )
}
