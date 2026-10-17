import { useEffect, useState } from 'react'
import { ref, onValue } from 'firebase/database'
import { rtdb } from '../lib/firebase'
import { DEMO_MODE, mockLiveReading } from '../lib/demo'

export interface LiveReading {
  power: number
  voltage?: number
  current?: number
  energy?: number
  frequency?: number
  power_factor?: number
  timestamp: string
}

export function useLiveReading(deviceId: string | null) {
  const [reading, setReading] = useState<LiveReading | null>(null)

  useEffect(() => {
    if (!deviceId) return

    if (DEMO_MODE) {
      let tick = 0
      setReading(mockLiveReading(tick))
      const interval = setInterval(() => {
        tick += 1
        setReading(mockLiveReading(tick))
      }, 3000)
      return () => clearInterval(interval)
    }

    const dbRef = ref(rtdb, `/devices/${deviceId}/live`)
    const unsub = onValue(dbRef, (snapshot) => {
      setReading(snapshot.val() as LiveReading | null)
    })
    return unsub
  }, [deviceId])

  return reading
}
