import { useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

export function useConfetti() {
  const audioContextRef = useRef<AudioContext | null>(null)

  const playSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    
    const notes = [523.25, 659.25, 783.99]
    const noteDuration = 0.08
    
    notes.forEach((freq, i) => {
      const startTime = ctx.currentTime + i * 0.09
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.value = freq
      
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(startTime)
      osc.stop(startTime + noteDuration)
    })
  }, [])

  const triggerCelebration = useCallback(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.75 },
      colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff']
    })
    playSound()
  }, [playSound])

  return { triggerCelebration }
}
