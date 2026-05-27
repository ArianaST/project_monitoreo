import { Network } from '@capacitor/network'
import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  cancelMedicationNotifications,
  getNotificationsEnabledPreference,
  getPendingMedicationNotificationCount,
  scheduleMedicationNotifications,
} from '../services/notificationService'

export type MedicationState = 'ON' | 'OFF'
export type MedicationEventKind = 'toma_confirmada' | 'toma_no_realizada' | 'cambio_estado'

interface MedicationEvent {
  id?: string
  type: MedicationState
  timestamp: Date
  horaFin?: Date | null
  duracionSegundos?: number | null
  tipoEvento?: MedicationEventKind
  horaProgramada?: Date | null
  symptoms?: string
}

interface PendingEvent {
  type: MedicationState
  timestamp: string
  fechaLocal: string
  pacienteId: string
  tipoEvento: MedicationEventKind
  horaProgramada?: string | null
}

interface BackendResumenEvento {
  id: string
  estado: MedicationState
  horaInicio: string
  horaFin: string | null
  duracionSegundos: number | null
  tipoEvento?: MedicationEventKind | null
  horaProgramada?: string | null
}

export type ActivityKind = 'sintomas' | 'tapping' | 'acelerometro'
export type ActivityPhase = 'antes' | 'despues'

export interface BackendActivityEvent {
  id: string
  tipo: ActivityKind
  fase: ActivityPhase
  horaRegistro: string
  estadoSintomas?: 'verde' | 'amarillo' | 'rojo' | null
  sintomas?: string[] | null
  taps?: number | null
  estadoMedicacion?: MedicationState | null
  metadata?: Record<string, unknown> | null
}

export interface BackendCalendarDay {
  dia: number
  totalEventos: number
  totalMedicacion: number
  totalActividad: number
  tieneOn: boolean
  tieneOff: boolean
}

export interface DayMedicationSummary {
  totalOnSegundos: number
  totalOffSegundos: number
  totalEventos: number
  tiempoOnFormateado: string
  tiempoOffFormateado: string
  ultimoEstado: MedicationState | null
  horaUltimoEstado: string | null
  eventos: BackendResumenEvento[]
  actividades: BackendActivityEvent[]
}

export interface ActivityPayload {
  tipo: ActivityKind
  fase: ActivityPhase
  timestamp?: Date
  estadoSintomas?: 'verde' | 'amarillo' | 'rojo' | null
  sintomas?: string[]
  taps?: number | null
  metadata?: Record<string, unknown> | null
}

interface LocalSnapshot {
  fechaLocal: string
  medicationState: MedicationState | null
  lastEventTime: string | null
  summaryLoadedAt: string | null
  totalOnSecondsBase: number
  totalOffSecondsBase: number
  totalEventsCount: number
  levodopaIntervalHours: number
  levodopaStartTime: string
  medicationEvents: Array<{
    id?: string
    type: MedicationState
    timestamp: string
    horaFin?: string | null
    duracionSegundos?: number | null
    tipoEvento?: MedicationEventKind
    horaProgramada?: string | null
  }>
}

export interface StoreNotification {
  type: 'success' | 'error' | 'warning'
  message: string
}

interface SetMedicationStateOptions {
  timestamp?: Date
  tipoEvento?: MedicationEventKind
  horaProgramada?: Date | null
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
const SNAPSHOT_KEY = 'session_state_snapshot'
const LEVODOPA_INTERVAL_KEY = 'levodopa_interval_hours'
const LEVODOPA_START_KEY = 'levodopa_start_time'

export const useSessionStore = defineStore('session', () => {
  const patientName = ref<string>('')
  const patientEmail = ref<string>('')
  const patientId = ref<string>('')
  const medicationState = ref<MedicationState | null>(null)
  const medicationEvents = ref<MedicationEvent[]>([])
  const lastEventTime = ref<Date | null>(null)
  const currentOnStartTime = ref<Date | null>(null)
  const updateTrigger = ref<number>(0)
  const isLoading = ref<boolean>(false)
  const isProcessing = ref<boolean>(false)
  const processingState = ref<MedicationState | null>(null)
  const lastNotification = ref<StoreNotification | null>(null)
  const notificationsEnabled = ref<boolean>(false)
  const pendingNotificationCount = ref<number>(0)

  const totalOnSecondsBase = ref<number>(0)
  const totalOffSecondsBase = ref<number>(0)
  const totalEventsCount = ref<number>(0)
  const summaryLoadedAt = ref<Date | null>(null)

  const levodopaIntervalHours = ref<number>(6)
  const levodopaStartTime = ref<string>('08:00')
  const levodopaDoseLabel = ref<string>('Levodopa/Carbidopa 25/100 mg')

  let isOnline = true
  let timerId: number | null = null
  let clearNotificationTimer: number | null = null

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDuration = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds))
    const hours = Math.floor(safeSeconds / 3600)
    const minutes = Math.floor((safeSeconds % 3600) / 60)
    const secs = safeSeconds % 60

    const parts: string[] = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    if (secs > 0 && hours === 0) parts.push(`${secs}s`)

    return parts.length > 0 ? parts.join(' ') : '0s'
  }

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)

  const parseDateOrNull = (value?: string | null) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const normalizeInterval = (value: unknown) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 6
    return Math.min(24, Math.max(1, Math.round(parsed)))
  }

  const normalizeTime = (value: unknown) => {
    if (typeof value !== 'string') return '08:00'
    const match = value.match(/^(\d{2}):(\d{2})/)
    if (!match) return '08:00'
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '08:00'
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  const buildDateFromTime = (time: string, base = new Date()) => {
    const [hoursRaw, minutesRaw] = normalizeTime(time).split(':')
    const date = new Date(base)
    date.setHours(Number(hoursRaw), Number(minutesRaw), 0, 0)
    return date
  }

  const startTimer = () => {
    if (timerId !== null) return

    timerId = window.setInterval(() => {
      updateTrigger.value++
    }, 1000)
  }

  const initNetworkListener = async () => {
    try {
      const status = await Network.getStatus()
      isOnline = status.connected

      await Network.addListener('networkStatusChange', async (statusValue) => {
        isOnline = statusValue.connected
        if (isOnline) {
          await syncPendingEvents()
        }
      })
    } catch (error) {
      console.error('Error inicializando listener de red:', error)
    }
  }

  const notify = (type: 'success' | 'error' | 'warning', message: string) => {
    lastNotification.value = { type, message }

    if (clearNotificationTimer !== null) {
      window.clearTimeout(clearNotificationTimer)
    }

    clearNotificationTimer = window.setTimeout(() => {
      lastNotification.value = null
      clearNotificationTimer = null
    }, 3000)
  }

  const secondsSinceSummaryLoad = computed(() => {
    updateTrigger.value

    if (!summaryLoadedAt.value || !medicationState.value) return 0

    return Math.max(
      0,
      Math.floor((Date.now() - summaryLoadedAt.value.getTime()) / 1000)
    )
  })

  const totalOnSecondsToday = computed(() => {
    return (
      totalOnSecondsBase.value +
      (medicationState.value === 'ON' ? secondsSinceSummaryLoad.value : 0)
    )
  })

  const totalOffSecondsToday = computed(() => {
    return (
      totalOffSecondsBase.value +
      (medicationState.value === 'OFF' ? secondsSinceSummaryLoad.value : 0)
    )
  })

  const totalOnTimeToday = computed(() => formatDuration(totalOnSecondsToday.value))
  const totalOffTimeToday = computed(() => formatDuration(totalOffSecondsToday.value))

  const currentStatus = computed(() => {
    if (medicationState.value === 'ON') return 'Con medicación'
    if (medicationState.value === 'OFF') return 'Sin medicación'
    return 'Sin registros'
  })

  const currentPeriodSeconds = computed(() => {
    updateTrigger.value
    if (!lastEventTime.value || !medicationState.value) return 0
    return Math.max(0, Math.floor((Date.now() - lastEventTime.value.getTime()) / 1000))
  })

  const currentPeriodTime = computed(() => formatDuration(currentPeriodSeconds.value))

  const statusStartTime = computed(() => {
    updateTrigger.value

    if (!lastEventTime.value) return 'Sin registros'
    return formatTime(lastEventTime.value)
  })

  const totalEvents = computed(() => totalEventsCount.value)

  const recentEvents = computed(() => {
    return medicationEvents.value.slice().reverse().slice(0, 8)
  })

  const getAnchorForNextDose = () => {
    // La próxima toma visible en Inicio debe salir del horario configurado
    // en Perfil/Registro, no quedarse anclada a un evento viejo.
    const startToday = buildDateFromTime(levodopaStartTime.value)
    const now = new Date()
    const intervalMs = levodopaIntervalHours.value * 60 * 60 * 1000

    if (startToday.getTime() > now.getTime()) {
      return new Date(startToday.getTime() - intervalMs)
    }

    const intervalsElapsed = Math.floor((now.getTime() - startToday.getTime()) / intervalMs)
    return new Date(startToday.getTime() + intervalsElapsed * intervalMs)
  }

  const nextDoseTime = computed(() => {
    updateTrigger.value
    const intervalMs = levodopaIntervalHours.value * 60 * 60 * 1000
    let next = new Date(getAnchorForNextDose().getTime() + intervalMs)
    const now = new Date()

    while (next.getTime() <= now.getTime()) {
      next = new Date(next.getTime() + intervalMs)
    }

    return next
  })

  const scheduledDoseTime = computed(() => {
    updateTrigger.value
    return nextDoseTime.value
  })

  const doseScheduleToday = computed(() => {
    updateTrigger.value

    const intervalMs = levodopaIntervalHours.value * 60 * 60 * 1000
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const doses: Date[] = []
    let next = buildDateFromTime(levodopaStartTime.value, dayStart)

    while (next.getTime() < dayEnd.getTime()) {
      if (next.getTime() >= dayStart.getTime()) {
        doses.push(new Date(next))
      }
      next = new Date(next.getTime() + intervalMs)
    }

    return doses
  })

  const doseScheduleLabelsToday = computed(() => doseScheduleToday.value.map((dose) => formatTime(dose)))
  const nextDoseLabel = computed(() => formatTime(nextDoseTime.value))
  const scheduledDoseLabel = computed(() => formatTime(scheduledDoseTime.value))

  const timeUntilNextDose = computed(() => {
    updateTrigger.value
    const seconds = Math.max(0, Math.floor((nextDoseTime.value.getTime() - Date.now()) / 1000))
    return formatDuration(seconds)
  })

  const isMedicationOn = computed(() => medicationState.value === 'ON')
  const isMedicationOff = computed(() => medicationState.value === 'OFF')
  const canRegisterBeforeDose = computed(() => medicationState.value !== 'ON')
  const canRegisterAfterDose = computed(() => medicationState.value === 'ON')

  const getAuthToken = async () => {
    const tokenResult = await Preferences.get({ key: 'auth_token' })
    return tokenResult.value
  }

  const saveLevodopaSchedule = async (intervalHours: number, startTime: string) => {
    levodopaIntervalHours.value = normalizeInterval(intervalHours)
    levodopaStartTime.value = normalizeTime(startTime)

    await Preferences.set({
      key: LEVODOPA_INTERVAL_KEY,
      value: String(levodopaIntervalHours.value),
    })
    await Preferences.set({
      key: LEVODOPA_START_KEY,
      value: levodopaStartTime.value,
    })

    await persistLocalSnapshot()

    if (notificationsEnabled.value) {
      await syncNotificationsFromSchedule()
    }
  }

  const loadLevodopaSchedule = async () => {
    try {
      const [intervalResult, startResult] = await Promise.all([
        Preferences.get({ key: LEVODOPA_INTERVAL_KEY }),
        Preferences.get({ key: LEVODOPA_START_KEY }),
      ])

      if (intervalResult.value) {
        levodopaIntervalHours.value = normalizeInterval(intervalResult.value)
      }

      if (startResult.value) {
        levodopaStartTime.value = normalizeTime(startResult.value)
      }
    } catch (error) {
      console.error('Error cargando horario de levodopa:', error)
    }
  }

  const refreshPendingNotificationCount = async () => {
    try {
      pendingNotificationCount.value = await getPendingMedicationNotificationCount()
    } catch (error) {
      console.error('Error consultando notificaciones pendientes:', error)
      pendingNotificationCount.value = 0
    }
  }

  const loadNotificationSettings = async () => {
    notificationsEnabled.value = await getNotificationsEnabledPreference()

    if (notificationsEnabled.value) {
      const pendingCount = await getPendingMedicationNotificationCount()
      pendingNotificationCount.value = pendingCount

      // Las notificaciones locales deben seguir activas aunque no haya sesión abierta.
      // Si Android las limpió o el APK se reinstaló, se vuelven a programar al abrir la app.
      if (pendingCount === 0) {
        await syncNotificationsFromSchedule()
      }

      return
    }

    await refreshPendingNotificationCount()
  }

  const syncNotificationScheduleToBackend = async (enabled: boolean, scheduledCount: number) => {
    try {
      const token = await getAuthToken()
      if (!token || !patientId.value) return

      await fetch(`${backendUrl}/api/sesiones/notificaciones/programacion`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pacienteId: patientId.value,
          activo: enabled,
          levodopaIntervaloHoras: levodopaIntervalHours.value,
          levodopaHoraInicio: levodopaStartTime.value,
          recordatorioSintomasCadaHoras: 2,
          notificacionesProgramadas: scheduledCount,
        }),
      })
    } catch (error) {
      console.error('No se pudo sincronizar configuración de notificaciones:', error)
    }
  }

  const syncNotificationsFromSchedule = async () => {
    const result = await scheduleMedicationNotifications({
      intervalHours: levodopaIntervalHours.value,
      startTime: levodopaStartTime.value,
      doseLabel: levodopaDoseLabel.value,
    })
    notificationsEnabled.value = result.enabled
    await refreshPendingNotificationCount()
    await syncNotificationScheduleToBackend(result.enabled, result.scheduledCount)
    return result
  }

  const setMedicationNotificationsEnabled = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await cancelMedicationNotifications()
        notificationsEnabled.value = false
        pendingNotificationCount.value = 0
        await syncNotificationScheduleToBackend(false, 0)
        notify('success', 'Notificaciones desactivadas')
        return { enabled: false, scheduledCount: 0, message: 'Notificaciones desactivadas' }
      }

      const result = await syncNotificationsFromSchedule()
      notify(result.enabled ? 'success' : 'warning', result.message)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron configurar notificaciones'
      notify('error', message)
      throw error
    }
  }

  const applyUserMedicationConfig = async (usuario?: {
    levodopaIntervaloHoras?: number | string | null
    levodopaHoraInicio?: string | null
  }) => {
    if (!usuario) return
    await saveLevodopaSchedule(
      normalizeInterval(usuario.levodopaIntervaloHoras ?? levodopaIntervalHours.value),
      normalizeTime(usuario.levodopaHoraInicio ?? levodopaStartTime.value)
    )
  }

  const persistLocalSnapshot = async () => {
    try {
      const snapshot: LocalSnapshot = {
        fechaLocal: getLocalDateString(),
        medicationState: medicationState.value,
        lastEventTime: lastEventTime.value?.toISOString() || null,
        summaryLoadedAt: summaryLoadedAt.value?.toISOString() || null,
        totalOnSecondsBase: totalOnSecondsBase.value,
        totalOffSecondsBase: totalOffSecondsBase.value,
        totalEventsCount: totalEventsCount.value,
        levodopaIntervalHours: levodopaIntervalHours.value,
        levodopaStartTime: levodopaStartTime.value,
        medicationEvents: medicationEvents.value.slice(-30).map((event) => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp.toISOString(),
          horaFin: event.horaFin?.toISOString() || null,
          duracionSegundos: event.duracionSegundos ?? null,
          tipoEvento: event.tipoEvento,
          horaProgramada: event.horaProgramada?.toISOString() || null,
        })),
      }

      await Preferences.set({
        key: SNAPSHOT_KEY,
        value: JSON.stringify(snapshot),
      })
    } catch (error) {
      console.error('Error guardando snapshot local:', error)
    }
  }

  const loadLocalSnapshot = async () => {
    try {
      await loadLevodopaSchedule()

      const result = await Preferences.get({ key: SNAPSHOT_KEY })
      if (!result.value) return

      const snapshot = JSON.parse(result.value) as LocalSnapshot
      const isToday = snapshot.fechaLocal === getLocalDateString()

      levodopaIntervalHours.value = normalizeInterval(
        snapshot.levodopaIntervalHours || levodopaIntervalHours.value
      )
      levodopaStartTime.value = normalizeTime(snapshot.levodopaStartTime || levodopaStartTime.value)

      medicationState.value = snapshot.medicationState || null
      lastEventTime.value = parseDateOrNull(snapshot.lastEventTime)
      currentOnStartTime.value =
        snapshot.medicationState === 'ON' ? lastEventTime.value : null

      if (isToday) {
        totalOnSecondsBase.value = Number(snapshot.totalOnSecondsBase || 0)
        totalOffSecondsBase.value = Number(snapshot.totalOffSecondsBase || 0)
        totalEventsCount.value = Number(snapshot.totalEventsCount || 0)
        summaryLoadedAt.value = parseDateOrNull(snapshot.summaryLoadedAt) || new Date()
        medicationEvents.value = Array.isArray(snapshot.medicationEvents)
          ? snapshot.medicationEvents
              .map((event) => ({
                id: event.id,
                type: event.type,
                timestamp: parseDateOrNull(event.timestamp) || new Date(),
                horaFin: parseDateOrNull(event.horaFin),
                duracionSegundos: event.duracionSegundos ?? null,
                tipoEvento: event.tipoEvento || 'cambio_estado',
                horaProgramada: parseDateOrNull(event.horaProgramada),
              }))
              .filter((event) => event.type === 'ON' || event.type === 'OFF')
          : []
      } else {
        totalOnSecondsBase.value = 0
        totalOffSecondsBase.value = 0
        totalEventsCount.value = 0
        summaryLoadedAt.value = new Date()
        medicationEvents.value = []
        medicationState.value = null
        lastEventTime.value = null
        currentOnStartTime.value = null
      }
    } catch (error) {
      console.error('Error cargando snapshot local:', error)
    }
  }

  const loadPatientName = async () => {
    try {
      const result = await Preferences.get({ key: 'user_name' })
      if (result.value) {
        patientName.value = result.value
      }

      await loadLevodopaSchedule()

      const token = await getAuthToken()
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]))
            patientId.value = payload.id || payload.usuarioId
          } catch (decodeErr) {
            console.error('Error decodificando JWT:', decodeErr)
          }
        }
      }
    } catch (error) {
      console.error('Error cargando nombre del paciente:', error)
      patientName.value = 'Paciente'
    }
  }

  const setPatientName = async (nombre: string) => {
    try {
      patientName.value = nombre
      await Preferences.set({ key: 'user_name', value: nombre })
    } catch (error) {
      console.error('Error guardando nombre del paciente:', error)
    }
  }

  const commitElapsedToBase = (timestamp: Date) => {
    if (!summaryLoadedAt.value || !medicationState.value) {
      summaryLoadedAt.value = timestamp
      return
    }

    const elapsed = Math.max(
      0,
      Math.floor((timestamp.getTime() - summaryLoadedAt.value.getTime()) / 1000)
    )

    if (medicationState.value === 'ON') {
      totalOnSecondsBase.value += elapsed
    }

    if (medicationState.value === 'OFF') {
      totalOffSecondsBase.value += elapsed
    }

    summaryLoadedAt.value = timestamp
  }

  const mapBackendEvents = (events: BackendResumenEvento[]) => {
    return events
      .slice()
      .reverse()
      .map((event) => ({
        id: event.id,
        type: event.estado,
        timestamp: parseDateOrNull(event.horaInicio) || new Date(),
        horaFin: parseDateOrNull(event.horaFin),
        duracionSegundos: event.duracionSegundos ?? null,
        tipoEvento: event.tipoEvento || 'cambio_estado',
        horaProgramada: parseDateOrNull(event.horaProgramada),
      }))
  }

  const emptySummary = (): DayMedicationSummary => ({
    totalOnSegundos: 0,
    totalOffSegundos: 0,
    totalEventos: 0,
    tiempoOnFormateado: '0s',
    tiempoOffFormateado: '0s',
    ultimoEstado: null,
    horaUltimoEstado: null,
    eventos: [],
    actividades: [],
  })

  const fetchResumenFecha = async (fechaLocal: string): Promise<DayMedicationSummary> => {
    const token = await getAuthToken()
    if (!token || !patientId.value) return emptySummary()

    const response = await fetch(
      `${backendUrl}/api/sesiones/resumen/${patientId.value}/${fechaLocal}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error?.message || 'Error al cargar resumen')
    }

    const data = await response.json()
    const resumen = data.resumen || data

    return {
      totalOnSegundos: Number(resumen.totalOnSegundos || 0),
      totalOffSegundos: Number(resumen.totalOffSegundos || 0),
      totalEventos: Number(resumen.totalEventos || 0),
      tiempoOnFormateado: String(resumen.tiempoOnFormateado || '0s'),
      tiempoOffFormateado: String(resumen.tiempoOffFormateado || '0s'),
      ultimoEstado:
        resumen.ultimoEstado === 'ON' || resumen.ultimoEstado === 'OFF'
          ? resumen.ultimoEstado
          : null,
      horaUltimoEstado: resumen.horaUltimoEstado || null,
      eventos: Array.isArray(resumen.eventos) ? resumen.eventos : [],
      actividades: Array.isArray(resumen.actividades) ? resumen.actividades : [],
    }
  }

  const getResumenPorFecha = async (fechaLocal: string) => fetchResumenFecha(fechaLocal)

  const loadResumenDia = async (options?: { preserveCurrentStateOnEmpty?: boolean }) => {
    try {
      isLoading.value = true

      if (!patientId.value) {
        const token = await getAuthToken()
        if (token) {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]))
            patientId.value = payload.id || payload.usuarioId || ''
          }
        }
      }

      const today = getLocalDateString()
      const resumen = await fetchResumenFecha(today)
      const backendEvents = Array.isArray(resumen.eventos)
        ? mapBackendEvents(resumen.eventos)
        : []
      const backendTotalEventos = Number(resumen.totalEventos ?? backendEvents.length ?? 0)
      const backendLastEventTime = parseDateOrNull(resumen.horaUltimoEstado)
      const hasBackendEvents = backendTotalEventos > 0 || backendEvents.length > 0

      totalOnSecondsBase.value = Number(resumen.totalOnSegundos || 0)
      totalOffSecondsBase.value = Number(resumen.totalOffSegundos || 0)
      totalEventsCount.value = backendTotalEventos
      summaryLoadedAt.value = new Date()

      if (backendEvents.length > 0) {
        medicationEvents.value = backendEvents
      }

      if (hasBackendEvents) {
        medicationState.value = resumen.ultimoEstado
        lastEventTime.value = backendLastEventTime
        currentOnStartTime.value =
          medicationState.value === 'ON' ? lastEventTime.value : null
      } else if (!options?.preserveCurrentStateOnEmpty) {
        medicationState.value = null
        lastEventTime.value = null
        currentOnStartTime.value = null
        medicationEvents.value = []
      }

      await persistLocalSnapshot()
    } catch (error) {
      console.error('Error cargando resumen del día:', error)
      notify('error', error instanceof Error ? error.message : 'Error al cargar resumen')
    } finally {
      isLoading.value = false
    }
  }

  const sendMedicationStateToBackend = async (
    state: MedicationState,
    timestamp: Date,
    pacienteIdValue: string,
    fechaLocalValue = getLocalDateString(timestamp),
    tipoEvento: MedicationEventKind = 'cambio_estado',
    horaProgramada?: Date | null
  ) => {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('No hay autenticación')
    }

    const response = await fetch(`${backendUrl}/api/sesiones/estado`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pacienteId: pacienteIdValue,
        estado: state,
        timestamp: timestamp.toISOString(),
        fechaLocal: fechaLocalValue,
        tipoEvento,
        horaProgramada: horaProgramada?.toISOString() || null,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message = errorData?.error?.message || 'Error al cambiar estado'
      throw new Error(message)
    }

    return response.json()
  }

  const updateLocalState = async (
    state: MedicationState,
    timestamp: Date,
    tipoEvento: MedicationEventKind = 'cambio_estado',
    horaProgramada?: Date | null
  ) => {
    commitElapsedToBase(timestamp)

    medicationState.value = state
    lastEventTime.value = timestamp
    currentOnStartTime.value = state === 'ON' ? timestamp : null
    summaryLoadedAt.value = timestamp
    totalEventsCount.value += 1

    medicationEvents.value.push({
      type: state,
      timestamp,
      tipoEvento,
      horaProgramada: horaProgramada || null,
    })

    await persistLocalSnapshot()
  }

  const setMedicationState = async (state: MedicationState, options: SetMedicationStateOptions = {}) => {
    const timestamp = options.timestamp || new Date()
    const tipoEvento = options.tipoEvento || (state === 'ON' ? 'toma_confirmada' : 'toma_no_realizada')
    const horaProgramada = options.horaProgramada ?? scheduledDoseTime.value

    try {
      isProcessing.value = true
      processingState.value = state

      const token = await getAuthToken()
      if (!token || !patientId.value) {
        throw new Error('No hay autenticación')
      }

      if (isOnline) {
        await sendMedicationStateToBackend(
          state,
          timestamp,
          patientId.value,
          getLocalDateString(timestamp),
          tipoEvento,
          horaProgramada
        )

        await updateLocalState(state, timestamp, tipoEvento, horaProgramada)
        await loadResumenDia({ preserveCurrentStateOnEmpty: true })

        notify(
          'success',
          state === 'ON'
            ? `Toma registrada. Estado ON desde ${formatTime(timestamp)}`
            : `No toma registrada. Estado OFF desde ${formatTime(timestamp)}`
        )
      } else {
        await savePendingEvent(state, timestamp, tipoEvento, horaProgramada)
        await updateLocalState(state, timestamp, tipoEvento, horaProgramada)
        notify('warning', 'Modo offline: cambio guardado localmente')
      }
    } catch (error: unknown) {
      if (!isOnline) {
        await savePendingEvent(state, timestamp, tipoEvento, horaProgramada)
        await updateLocalState(state, timestamp, tipoEvento, horaProgramada)
      }

      const message = error instanceof Error ? error.message : 'No se pudo cambiar el estado'
      notify('error', `Error: ${message}`)
      throw error
    } finally {
      isProcessing.value = false
      processingState.value = null
    }
  }

  const registrarActividad = async (payload: ActivityPayload) => {
    try {
      const token = await getAuthToken()
      if (!token || !patientId.value) return

      const timestamp = payload.timestamp || new Date()
      const response = await fetch(`${backendUrl}/api/sesiones/actividad`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pacienteId: patientId.value,
          tipo: payload.tipo,
          fase: payload.fase,
          timestamp: timestamp.toISOString(),
          fechaLocal: getLocalDateString(timestamp),
          estadoSintomas: payload.estadoSintomas || null,
          sintomas: payload.sintomas || [],
          taps: payload.taps ?? null,
          estadoMedicacion: medicationState.value,
          metadata: payload.metadata || {},
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || 'Error al sincronizar actividad')
      }
    } catch (error) {
      console.error('Error registrando actividad:', error)
      notify('warning', 'Registro guardado localmente; no se pudo sincronizar con backend')
    }
  }

  const loadCalendarioMes = async (year: number, month: number): Promise<BackendCalendarDay[]> => {
    try {
      const token = await getAuthToken()
      if (!token || !patientId.value) return []

      const response = await fetch(
        `${backendUrl}/api/sesiones/calendario/${patientId.value}/${year}/${month}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.error?.message || 'Error al cargar calendario')
      }

      const data = await response.json()
      return Array.isArray(data.dias) ? data.dias : []
    } catch (error) {
      console.error('Error cargando calendario:', error)
      return []
    }
  }

  const savePendingEvent = async (
    state: MedicationState,
    timestamp = new Date(),
    tipoEvento: MedicationEventKind = 'cambio_estado',
    horaProgramada?: Date | null
  ) => {
    try {
      const result = await Preferences.get({ key: 'pending_events' })
      const pendingEvents: PendingEvent[] = result.value ? JSON.parse(result.value) : []

      pendingEvents.push({
        type: state,
        timestamp: timestamp.toISOString(),
        fechaLocal: getLocalDateString(timestamp),
        pacienteId: patientId.value,
        tipoEvento,
        horaProgramada: horaProgramada?.toISOString() || null,
      })

      await Preferences.set({
        key: 'pending_events',
        value: JSON.stringify(pendingEvents),
      })
    } catch (error) {
      console.error('Error guardando evento pendiente:', error)
    }
  }

  const syncPendingEvents = async () => {
    try {
      const result = await Preferences.get({ key: 'pending_events' })

      if (!result.value) return

      const pendingEvents: PendingEvent[] = JSON.parse(result.value)
      if (pendingEvents.length === 0) return

      const remainingEvents: PendingEvent[] = []
      let successCount = 0

      for (const event of pendingEvents) {
        try {
          await sendMedicationStateToBackend(
            event.type,
            new Date(event.timestamp),
            event.pacienteId,
            event.fechaLocal,
            event.tipoEvento,
            parseDateOrNull(event.horaProgramada)
          )
          successCount++
        } catch (error) {
          console.error(`Error sincronizando evento ${event.type}:`, error)
          remainingEvents.push(event)
        }
      }

      if (remainingEvents.length > 0) {
        await Preferences.set({
          key: 'pending_events',
          value: JSON.stringify(remainingEvents),
        })
      } else {
        await Preferences.remove({ key: 'pending_events' })
      }

      if (successCount > 0) {
        notify('success', `${successCount} evento(s) sincronizado(s)`)
        await loadResumenDia({ preserveCurrentStateOnEmpty: true })
      }
    } catch (error) {
      console.error('Error sincronizando eventos pendientes:', error)
    }
  }

  const loadProfileFromBackend = async () => {
    const token = await getAuthToken()
    if (!token) return null

    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // Si el backend que está corriendo todavía no tiene /api/auth/me,
      // no bloqueamos Perfil ni Inicio. Se conserva el horario local.
      if (response.status === 404) {
        await loadLevodopaSchedule()
        await loadNotificationSettings()
        notify('warning', 'Perfil backend no disponible; usando datos locales')
        return null
      }

      throw new Error(errorData?.error || 'No se pudo cargar perfil')
    }

    const data = await response.json()
    const usuario = data.usuario || data

    if (usuario?.id) patientId.value = usuario.id
    if (usuario?.nombre) await setPatientName(usuario.nombre)
    if (usuario?.email) patientEmail.value = usuario.email
    await applyUserMedicationConfig(usuario)
    await loadNotificationSettings()

    return usuario
  }

  const updateMedicationSchedule = async (intervalHours: number, startTime: string) => {
    const intervalo = normalizeInterval(intervalHours)
    const horaInicio = normalizeTime(startTime)
    const token = await getAuthToken()

    // Primero actualizamos el estado local. Esto hace que Inicio cambie al instante:
    // próxima toma, horario de hoy, intervalo y notificaciones locales.
    await saveLevodopaSchedule(intervalo, horaInicio)

    if (!token) {
      notify('warning', 'Horario actualizado localmente; inicia sesión para sincronizarlo')
      return
    }

    try {
      const response = await fetch(`${backendUrl}/api/auth/me/medicacion`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          levodopaIntervaloHoras: intervalo,
          levodopaHoraInicio: horaInicio,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 404) {
          notify('warning', 'Horario actualizado en la app; backend pendiente de recompilar')
          return
        }

        throw new Error(errorData?.error || 'No se pudo actualizar medicación')
      }

      const data = await response.json()
      await applyUserMedicationConfig(data.usuario || {
        levodopaIntervaloHoras: intervalo,
        levodopaHoraInicio: horaInicio,
      })
      notify('success', 'Horario de levodopa actualizado')
    } catch (error) {
      console.error('No se pudo sincronizar medicación con backend:', error)
      notify('warning', 'Horario actualizado en la app; no se pudo sincronizar backend')
    }
  }

  const logout = async () => {
    try {
      await Preferences.remove({ key: 'auth_token' })
      await Preferences.remove({ key: 'user_name' })
      await Preferences.remove({ key: 'user_email' })
      await Preferences.remove({ key: 'pending_events' })
      await Preferences.remove({ key: SNAPSHOT_KEY })
      await Preferences.set({ key: 'biometric_enabled', value: 'false' })

      // No cancelamos las notificaciones al cerrar sesión.
      // Son recordatorios locales del tratamiento y deben seguir funcionando sin sesión abierta.

      patientName.value = ''
      patientEmail.value = ''
      patientId.value = ''
      medicationState.value = null
      medicationEvents.value = []
      lastEventTime.value = null
      currentOnStartTime.value = null
      totalOnSecondsBase.value = 0
      totalOffSecondsBase.value = 0
      totalEventsCount.value = 0
      summaryLoadedAt.value = null
      isLoading.value = false
      isProcessing.value = false
      lastNotification.value = null
      notificationsEnabled.value = false
      pendingNotificationCount.value = 0

      notify('success', 'Sesión cerrada correctamente')
    } catch (error) {
      console.error('Error durante logout:', error)
      notify('error', 'Error al cerrar sesión')
      throw error
    }
  }

  return {
    patientName,
    patientEmail,
    patientId,
    medicationState,
    medicationEvents,
    lastEventTime,
    currentOnStartTime,
    currentStatus,
    currentPeriodTime,
    statusStartTime,
    totalOnTimeToday,
    totalOffTimeToday,
    totalEvents,
    recentEvents,
    isLoading,
    isProcessing,
    processingState,
    lastNotification,
    notificationsEnabled,
    pendingNotificationCount,
    levodopaIntervalHours,
    levodopaStartTime,
    levodopaDoseLabel,
    scheduledDoseTime,
    scheduledDoseLabel,
    doseScheduleToday,
    doseScheduleLabelsToday,
    nextDoseTime,
    nextDoseLabel,
    timeUntilNextDose,
    isMedicationOn,
    isMedicationOff,
    canRegisterBeforeDose,
    canRegisterAfterDose,
    setMedicationState,
    setPatientName,
    saveLevodopaSchedule,
    loadLevodopaSchedule,
    applyUserMedicationConfig,
    updateMedicationSchedule,
    loadProfileFromBackend,
    loadNotificationSettings,
    setMedicationNotificationsEnabled,
    refreshPendingNotificationCount,
    loadPatientName,
    loadLocalSnapshot,
    loadResumenDia,
    getResumenPorFecha,
    registrarActividad,
    loadCalendarioMes,
    startTimer,
    initNetworkListener,
    syncPendingEvents,
    logout,
  }
})
