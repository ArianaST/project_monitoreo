import type { Router } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'

const PATITO_NOTIFICATION_IDS_KEY = 'patito_notification_ids'
const PATITO_NOTIFICATIONS_ENABLED_KEY = 'patito_notifications_enabled'
const CHANNEL_ID = 'patito-medication-reminders'
const ACTION_TYPE_ID = 'PATITO_REMINDER_ACTIONS'
const SCHEDULE_DAYS = 3
const SYMPTOM_REMINDER_EVERY_HOURS = 2
const NOTIFICATION_GROUP = 'patito-seguimiento'
const SMALL_ICON = 'ic_stat_patito'
const LARGE_ICON = 'ic_patito_large'
const ICON_COLOR = '#840705'

export interface MedicationNotificationConfig {
  intervalHours: number
  startTime: string
  doseLabel?: string
}

export interface NotificationScheduleResult {
  enabled: boolean
  scheduledCount: number
  message: string
}

interface StoredNotificationIds {
  ids: number[]
}

function normalizeInterval(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 6
  return Math.min(24, Math.max(1, Math.round(parsed)))
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string') return '08:00'
  const match = value.match(/^(\d{2}):(\d{2})/)
  if (!match) return '08:00'

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '08:00'

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function buildDateFromTime(time: string, base: Date) {
  const [hours, minutes] = normalizeTime(time).split(':').map(Number)
  const date = new Date(base)
  date.setHours(hours, minutes, 0, 0)
  return date
}

function buildDailyDoseTimes(startTime: string, intervalHours: number, day: Date) {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const doses: Date[] = []
  let cursor = buildDateFromTime(startTime, dayStart)
  const intervalMs = intervalHours * 60 * 60 * 1000

  while (cursor < dayEnd) {
    if (cursor >= dayStart) doses.push(new Date(cursor))
    cursor = new Date(cursor.getTime() + intervalMs)
  }

  return doses
}

function buildFutureDoseTimes(config: MedicationNotificationConfig) {
  const intervalHours = normalizeInterval(config.intervalHours)
  const startTime = normalizeTime(config.startTime)
  const now = new Date()
  const dates: Date[] = []

  for (let offset = 0; offset < SCHEDULE_DAYS; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)

    buildDailyDoseTimes(startTime, intervalHours, day).forEach((dose) => {
      if (dose.getTime() > now.getTime() + 60_000) dates.push(dose)
    })
  }

  return dates
}

function buildSymptomReminderTimes() {
  const now = new Date()
  const dates: Date[] = []

  for (let offset = 0; offset < SCHEDULE_DAYS; offset++) {
    const day = new Date(now)
    day.setDate(now.getDate() + offset)
    day.setHours(7, 0, 0, 0)

    const dayEnd = new Date(day)
    dayEnd.setHours(22, 0, 0, 0)

    let cursor = new Date(day)
    while (cursor <= dayEnd) {
      if (cursor.getTime() > now.getTime() + 60_000) dates.push(new Date(cursor))
      cursor = new Date(cursor.getTime() + SYMPTOM_REMINDER_EVERY_HOURS * 60 * 60 * 1000)
    }
  }

  return dates
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function notificationId(prefix: number, date: Date, index: number) {
  const dayKey = Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  )
  const minuteOfDay = date.getHours() * 60 + date.getMinutes()
  return Number(`${prefix}${String(dayKey).slice(-6)}${String(minuteOfDay + index).padStart(4, '0')}`.slice(0, 9))
}

function withPatitoVisuals<T extends Record<string, unknown>>(notification: T) {
  return {
    ...notification,
    smallIcon: SMALL_ICON,
    largeIcon: LARGE_ICON,
    iconColor: ICON_COLOR,
    group: NOTIFICATION_GROUP,
    actionTypeId: ACTION_TYPE_ID,
  }
}

async function saveScheduledIds(ids: number[]) {
  const payload: StoredNotificationIds = { ids }
  await Preferences.set({ key: PATITO_NOTIFICATION_IDS_KEY, value: JSON.stringify(payload) })
}

async function getScheduledIds() {
  const result = await Preferences.get({ key: PATITO_NOTIFICATION_IDS_KEY })
  if (!result.value) return []

  try {
    const payload = JSON.parse(result.value) as StoredNotificationIds
    return Array.isArray(payload.ids) ? payload.ids.filter((id) => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

export async function getNotificationsEnabledPreference() {
  const result = await Preferences.get({ key: PATITO_NOTIFICATIONS_ENABLED_KEY })
  return result.value === 'true'
}

export async function setNotificationsEnabledPreference(enabled: boolean) {
  await Preferences.set({ key: PATITO_NOTIFICATIONS_ENABLED_KEY, value: enabled ? 'true' : 'false' })
}

export async function ensureNotificationPermission() {
  if (!Capacitor.isNativePlatform()) {
    return { granted: false, message: 'Las notificaciones locales se prueban en Android/iOS, no en navegador.' }
  }

  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return { granted: true, message: 'Permiso concedido.' }

  const requested = await LocalNotifications.requestPermissions()
  if (requested.display === 'granted') return { granted: true, message: 'Permiso concedido.' }

  return { granted: false, message: 'Permiso de notificaciones denegado.' }
}

async function ensureNotificationActions() {
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: ACTION_TYPE_ID,
        actions: [
          { id: 'abrir-registro', title: 'Registrar ahora' },
          { id: 'abrir-inicio', title: 'Ver inicio' },
        ],
      },
    ],
  })
}

async function ensureAndroidChannel() {
  if (!Capacitor.isNativePlatform()) return

  await ensureNotificationActions()

  if (Capacitor.getPlatform() !== 'android') return

  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'PaTITO recordatorios',
    description: 'Recordatorios de levodopa, síntomas y ejercicios.',
    importance: 4 as never,
    visibility: 1 as never,
    vibration: true,
    lights: true,
    lightColor: ICON_COLOR,
  })
}

export async function cancelMedicationNotifications() {
  if (!Capacitor.isNativePlatform()) {
    await saveScheduledIds([])
    await setNotificationsEnabledPreference(false)
    return
  }

  const ids = await getScheduledIds()
  if (ids.length > 0) {
    await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) })
  }

  await saveScheduledIds([])
  await setNotificationsEnabledPreference(false)
}

export async function scheduleMedicationNotifications(
  config: MedicationNotificationConfig
): Promise<NotificationScheduleResult> {
  if (!Capacitor.isNativePlatform()) {
    await setNotificationsEnabledPreference(false)
    return {
      enabled: false,
      scheduledCount: 0,
      message: 'En navegador no se programan notificaciones nativas. Prueba en Android/iOS con Capacitor.',
    }
  }

  const permission = await ensureNotificationPermission()
  if (!permission.granted) {
    await setNotificationsEnabledPreference(false)
    return { enabled: false, scheduledCount: 0, message: permission.message }
  }

  await ensureAndroidChannel()

  const previousIds = await getScheduledIds()
  if (previousIds.length > 0) {
    await LocalNotifications.cancel({ notifications: previousIds.map((id) => ({ id })) })
  }

  const doseLabel = config.doseLabel || 'Levodopa'
  const doseTimes = buildFutureDoseTimes(config)
  const symptomTimes = buildSymptomReminderTimes()
  const notifications = [
    ...doseTimes.map((date, index) =>
      withPatitoVisuals({
        id: notificationId(1, date, index),
        title: 'PaTITO • Hora de levodopa',
        body: `${doseLabel} programada a las ${formatTime(date)}.`,
        largeBody: `Toma programada a las ${formatTime(date)}. Abre PaTITO y registra si ya la tomaste para pasar a ON o si sigues OFF.`,
        summaryText: 'Medicamento programado',
        schedule: { at: date, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        autoCancel: true,
        extra: { patito: true, route: '/registro', modo: 'confirmar' },
      })
    ),
    ...symptomTimes.map((date, index) =>
      withPatitoVisuals({
        id: notificationId(2, date, index),
        title: 'PaTITO • Seguimiento rápido',
        body: 'Registra síntomas o ejercicio de tapping.',
        largeBody: 'Completa un registro corto de síntomas, tapping o acelerómetro antes/después de la toma. Esto mejora tu historial diario.',
        summaryText: 'Registro de síntomas y ejercicio',
        schedule: { at: date, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        autoCancel: true,
        extra: { patito: true, route: '/registro', modo: 'sintomas' },
      })
    ),
  ]

  if (notifications.length === 0) {
    await setNotificationsEnabledPreference(false)
    await saveScheduledIds([])
    return { enabled: false, scheduledCount: 0, message: 'No hay horarios futuros para programar.' }
  }

  await LocalNotifications.schedule({ notifications })
  await saveScheduledIds(notifications.map((notification) => notification.id))
  await setNotificationsEnabledPreference(true)

  return {
    enabled: true,
    scheduledCount: notifications.length,
    message: `Recordatorios PaTITO programados: ${notifications.length}`,
  }
}

export async function sendTestMedicationNotification() {
  if (!Capacitor.isNativePlatform()) {
    return { enabled: false, message: 'La prueba de notificación requiere Android/iOS.' }
  }

  const permission = await ensureNotificationPermission()
  if (!permission.granted) return { enabled: false, message: permission.message }

  await ensureAndroidChannel()
  const at = new Date(Date.now() + 1200)
  await LocalNotifications.schedule({
    notifications: [
      withPatitoVisuals({
        id: notificationId(9, at, 1),
        title: 'PaTITO • Prueba de recordatorio',
        body: 'Tu app ya puede recordarte medicamento y síntomas.',
        largeBody: 'Esta es una notificación de prueba. Las próximas se programarán según tu horario de levodopa y cada 2 horas para seguimiento.',
        summaryText: 'Prueba PaTITO',
        schedule: { at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
        autoCancel: true,
        extra: { patito: true, route: '/registro', modo: 'confirmar' },
      }),
    ],
  })

  return { enabled: true, message: 'Notificación de prueba enviada.' }
}

export async function getPendingMedicationNotificationCount() {
  if (!Capacitor.isNativePlatform()) return 0
  const ids = await getScheduledIds()
  if (ids.length === 0) return 0

  const pending = await LocalNotifications.getPending()
  const ownedIds = new Set(ids)
  return pending.notifications.filter((notification) => ownedIds.has(notification.id)).length
}

export async function initNotificationActionHandlers(router: Router) {
  if (!Capacitor.isNativePlatform()) return

  await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
    const actionId = action.actionId
    const extra = action.notification.extra as { route?: string; modo?: string } | undefined

    if (actionId === 'abrir-inicio') {
      await router.push('/home')
      return
    }

    if (extra?.route) {
      if (extra.modo) {
        await router.push({ path: extra.route, query: { modo: extra.modo } })
        return
      }

      await router.push(extra.route)
      return
    }

    await router.push('/registro')
  })
}
