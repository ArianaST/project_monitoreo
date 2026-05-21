import type { PluginListenerHandle } from '@capacitor/core'
import { Motion } from '@capacitor/motion'
import type { AccelerometerSummary } from '../stores/prototypeStore'

declare global {
  interface Window {
    DeviceMotionEvent?: typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
  }
}

interface AccelSample {
  x: number
  y: number
  z: number
  magnitude: number
  timestamp: number
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getMagnitude(x: number, y: number, z: number) {
  return Math.sqrt(x * x + y * y + z * z)
}

function classifyTremor(score: number): AccelerometerSummary['level'] {
  if (score >= 2.2) return 'alto'
  if (score >= 1.1) return 'medio'
  return 'bajo'
}

function summarize(samples: AccelSample[], durationMs: number): AccelerometerSummary {
  if (samples.length === 0) {
    return {
      durationMs,
      samples: 0,
      averageMagnitude: 0,
      peakMagnitude: 0,
      tremorScore: 0,
      variabilityRms: 0,
      level: 'bajo',
    }
  }

  const magnitudes = samples.map((sample) => sample.magnitude)
  const averageMagnitude = magnitudes.reduce((acc, value) => acc + value, 0) / magnitudes.length
  const peakMagnitude = Math.max(...magnitudes)
  const variance = magnitudes.reduce((acc, value) => acc + Math.pow(value - averageMagnitude, 2), 0) / magnitudes.length
  const variabilityRms = Math.sqrt(variance)
  const tremorScore = Number(variabilityRms.toFixed(2))

  return {
    durationMs,
    samples: samples.length,
    averageMagnitude: Number(averageMagnitude.toFixed(2)),
    peakMagnitude: Number(peakMagnitude.toFixed(2)),
    tremorScore,
    variabilityRms: tremorScore,
    level: classifyTremor(tremorScore),
  }
}

async function requestMotionPermissionIfNeeded() {
  const MotionEventCtor = window.DeviceMotionEvent
  if (MotionEventCtor?.requestPermission) {
    const result = await MotionEventCtor.requestPermission()
    if (result !== 'granted') {
      throw new Error('Permiso de movimiento denegado')
    }
  }
}

export async function runAccelerometerTest(durationMs = 8000): Promise<AccelerometerSummary> {
  await requestMotionPermissionIfNeeded()

  const samples: AccelSample[] = []
  let handler: PluginListenerHandle | null = null

  return new Promise((resolve, reject) => {
    let finished = false
    const startedAt = Date.now()

    const finish = async () => {
      if (finished) return
      finished = true

      try {
        await handler?.remove()
      } catch (error) {
        console.error('No se pudo detener listener de acelerómetro:', error)
      }

      resolve(summarize(samples, Date.now() - startedAt))
    }

    Motion.addListener('accel', (event) => {
      const source = event.accelerationIncludingGravity || event.acceleration
      const x = toNumber(source?.x)
      const y = toNumber(source?.y)
      const z = toNumber(source?.z)

      samples.push({
        x,
        y,
        z,
        magnitude: getMagnitude(x, y, z),
        timestamp: Date.now(),
      })
    })
      .then((listener) => {
        handler = listener
        window.setTimeout(() => {
          void finish()
        }, durationMs)
      })
      .catch((error) => {
        finished = true
        reject(error instanceof Error ? error : new Error('No se pudo acceder al acelerómetro'))
      })
  })
}
