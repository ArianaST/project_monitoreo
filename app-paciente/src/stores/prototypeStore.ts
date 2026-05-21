import { Preferences } from '@capacitor/preferences'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type StepKey =
  | 'antes_sintomas'
  | 'antes_tapping'
  | 'antes_acelerometro'
  | 'toma'
  | 'despues_sintomas'
  | 'despues_tapping'
  | 'despues_acelerometro'

export type FlowPhase = 'antes' | 'despues'

export interface SymptomRecord {
  id: string
  estado: 'verde' | 'amarillo' | 'rojo'
  sintomas: string[]
  phase: FlowPhase
  timestamp: Date
}

export interface TappingRecord {
  id: string
  taps: number
  phase: FlowPhase
  timestamp: Date
}

export interface AccelerometerSummary {
  durationMs: number
  samples: number
  averageMagnitude: number
  peakMagnitude: number
  tremorScore: number
  variabilityRms: number
  level: 'bajo' | 'medio' | 'alto'
}

export interface AccelerometerRecord {
  id: string
  phase: FlowPhase
  timestamp: Date
  result: AccelerometerSummary
}

interface PersistedPrototypeRecords {
  symptomRecords: Array<Omit<SymptomRecord, 'timestamp'> & { timestamp: string }>
  tappingRecords: Array<Omit<TappingRecord, 'timestamp'> & { timestamp: string }>
  accelerometerRecords?: Array<Omit<AccelerometerRecord, 'timestamp'> & { timestamp: string }>
}

const PROTOTYPE_RECORDS_KEY = 'prototype_records_v3'

export const usePrototypeStore = defineStore('prototypeFlow', () => {
  const totalPasos = 7
  const tomado = ref(false)
  const tomaDecidida = ref(false)
  const completados = ref<StepKey[]>([])
  const symptomRecords = ref<SymptomRecord[]>([])
  const tappingRecords = ref<TappingRecord[]>([])
  const accelerometerRecords = ref<AccelerometerRecord[]>([])
  const lastTaps = ref<number | null>(null)
  const lastTappingAt = ref<Date | null>(null)
  const lastAccelerometerResult = ref<AccelerometerSummary | null>(null)
  const lastAccelerometerAt = ref<Date | null>(null)

  const completadosCount = computed(() => completados.value.length)
  const progreso = computed(() => Math.round((completadosCount.value / totalPasos) * 100))

  const parseDateOrNull = (value?: string | null) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const persistPrototypeRecords = async () => {
    const payload: PersistedPrototypeRecords = {
      symptomRecords: symptomRecords.value.slice(-120).map((record) => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
      })),
      tappingRecords: tappingRecords.value.slice(-120).map((record) => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
      })),
      accelerometerRecords: accelerometerRecords.value.slice(-120).map((record) => ({
        ...record,
        timestamp: record.timestamp.toISOString(),
      })),
    }

    await Preferences.set({
      key: PROTOTYPE_RECORDS_KEY,
      value: JSON.stringify(payload),
    })
  }

  const loadPrototypeRecords = async () => {
    try {
      const result = await Preferences.get({ key: PROTOTYPE_RECORDS_KEY })
      if (!result.value) return

      const payload = JSON.parse(result.value) as PersistedPrototypeRecords

      symptomRecords.value = Array.isArray(payload.symptomRecords)
        ? payload.symptomRecords
            .map((record) => ({
              ...record,
              timestamp: parseDateOrNull(record.timestamp) || new Date(),
            }))
            .filter((record) => record.phase === 'antes' || record.phase === 'despues')
        : []

      tappingRecords.value = Array.isArray(payload.tappingRecords)
        ? payload.tappingRecords
            .map((record) => ({
              ...record,
              timestamp: parseDateOrNull(record.timestamp) || new Date(),
            }))
            .filter((record) => record.phase === 'antes' || record.phase === 'despues')
        : []

      accelerometerRecords.value = Array.isArray(payload.accelerometerRecords)
        ? payload.accelerometerRecords
            .map((record) => ({
              ...record,
              timestamp: parseDateOrNull(record.timestamp) || new Date(),
            }))
            .filter((record) => record.phase === 'antes' || record.phase === 'despues')
        : []

      const lastTapping = tappingRecords.value[tappingRecords.value.length - 1]
      lastTaps.value = lastTapping?.taps ?? null
      lastTappingAt.value = lastTapping?.timestamp ?? null

      const lastAccelerometer = accelerometerRecords.value[accelerometerRecords.value.length - 1]
      lastAccelerometerResult.value = lastAccelerometer?.result ?? null
      lastAccelerometerAt.value = lastAccelerometer?.timestamp ?? null
    } catch (error) {
      console.error('Error cargando registros del prototipo:', error)
    }
  }

  const isCompleted = (key: StepKey) => completados.value.includes(key)

  const marcarCompletado = (key: StepKey) => {
    if (!completados.value.includes(key)) {
      completados.value = [...completados.value, key]
    }
  }

  const stepFromPhase = (phase: FlowPhase, kind: 'sintomas' | 'tapping' | 'acelerometro'): StepKey => {
    if (phase === 'despues') {
      if (kind === 'sintomas') return 'despues_sintomas'
      if (kind === 'tapping') return 'despues_tapping'
      return 'despues_acelerometro'
    }

    if (kind === 'sintomas') return 'antes_sintomas'
    if (kind === 'tapping') return 'antes_tapping'
    return 'antes_acelerometro'
  }

  const setMedicationDecision = (wasTaken: boolean) => {
    tomado.value = wasTaken
    tomaDecidida.value = true
    marcarCompletado('toma')
  }

  const setTomado = (value: boolean) => {
    setMedicationDecision(value)
  }

  const guardarSintomas = (
    estado: 'verde' | 'amarillo' | 'rojo',
    sintomas: string[],
    phase: FlowPhase
  ) => {
    const record: SymptomRecord = {
      id: `${Date.now()}-${phase}-${estado}`,
      estado,
      sintomas,
      phase,
      timestamp: new Date(),
    }

    symptomRecords.value = [...symptomRecords.value, record].slice(-120)
    marcarCompletado(stepFromPhase(phase, 'sintomas'))
    void persistPrototypeRecords()

    return record
  }

  const guardarTapping = (taps: number, phase: FlowPhase) => {
    const timestamp = new Date()
    const record: TappingRecord = {
      id: `${timestamp.getTime()}-${phase}-tapping`,
      taps,
      phase,
      timestamp,
    }

    lastTaps.value = taps
    lastTappingAt.value = timestamp
    tappingRecords.value = [...tappingRecords.value, record].slice(-120)
    marcarCompletado(stepFromPhase(phase, 'tapping'))
    void persistPrototypeRecords()

    return record
  }

  const guardarAcelerometro = (result: AccelerometerSummary, phase: FlowPhase) => {
    const timestamp = new Date()
    const record: AccelerometerRecord = {
      id: `${timestamp.getTime()}-${phase}-acelerometro`,
      phase,
      timestamp,
      result,
    }

    lastAccelerometerResult.value = result
    lastAccelerometerAt.value = timestamp
    accelerometerRecords.value = [...accelerometerRecords.value, record].slice(-120)
    marcarCompletado(stepFromPhase(phase, 'acelerometro'))
    void persistPrototypeRecords()

    return record
  }

  const reiniciarFlujo = () => {
    tomado.value = false
    tomaDecidida.value = false
    completados.value = []
    lastTaps.value = null
    lastTappingAt.value = null
    lastAccelerometerResult.value = null
    lastAccelerometerAt.value = null
  }

  return {
    totalPasos,
    tomado,
    tomaDecidida,
    completados,
    completadosCount,
    progreso,
    symptomRecords,
    tappingRecords,
    accelerometerRecords,
    lastTaps,
    lastTappingAt,
    lastAccelerometerResult,
    lastAccelerometerAt,
    isCompleted,
    marcarCompletado,
    setMedicationDecision,
    setTomado,
    guardarSintomas,
    guardarTapping,
    guardarAcelerometro,
    loadPrototypeRecords,
    persistPrototypeRecords,
    reiniciarFlujo,
  }
})
