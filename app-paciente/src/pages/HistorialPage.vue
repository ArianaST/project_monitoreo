<template>
  <div class="min-h-screen bg-gradient-to-b from-rose-50 via-white to-emerald-50 pb-40">
    <div class="mx-auto max-w-2xl p-6">
      <header class="mb-6">
        <div class="mb-4 flex items-center gap-3">
          <img :src="logoPatito" alt="PaTITO" class="h-10 w-10 object-contain" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Historial</h1>
            <p class="text-sm text-gray-500">Actividad por día, toma y registros</p>
          </div>
        </div>

        <div class="mb-4 flex rounded-2xl bg-white/80 p-1 shadow-sm ring-1 ring-rose-100">
          <button
            type="button"
            :class="[
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all',
              viewMode === 'timeline' ? 'bg-primary font-semibold text-white shadow-md' : 'text-gray-600',
            ]"
            @click="viewMode = 'timeline'"
          >
            <List class="h-5 w-5" />
            <span>Línea de tiempo</span>
          </button>
          <button
            type="button"
            :class="[
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 transition-all',
              viewMode === 'calendar' ? 'bg-primary font-semibold text-white shadow-md' : 'text-gray-600',
            ]"
            @click="viewMode = 'calendar'"
          >
            <Calendar class="h-5 w-5" />
            <span>Calendario</span>
          </button>
        </div>

        <div class="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
          <button type="button" class="rounded-xl p-2 transition-colors hover:bg-rose-50" @click="previousPeriod">
            <ChevronLeft class="h-6 w-6 text-gray-600" />
          </button>

          <div class="text-center">
            <p class="text-lg font-semibold text-gray-900">
              {{ viewMode === 'calendar' ? monthLabel : selectedDateLabel }}
            </p>
            <p class="text-sm text-gray-600">{{ viewMode === 'calendar' ? 'Selecciona un día' : selectedWeekday }}</p>
          </div>

          <button type="button" class="rounded-xl p-2 transition-colors hover:bg-rose-50" @click="nextPeriod">
            <ChevronRight class="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </header>

      <section v-if="viewMode === 'calendar'" class="mb-6 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-rose-100">
        <div class="mb-3 grid grid-cols-7 gap-2">
          <div v-for="dia in diasSemana" :key="dia" class="py-2 text-center text-xs font-semibold text-gray-500">
            {{ dia }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2">
          <div v-for="empty in primerDiaSemana" :key="`empty-${empty}`" class="aspect-square"></div>
          <button
            v-for="dia in diasMes"
            :key="dia"
            type="button"
            :class="[
              'flex aspect-square flex-col items-center justify-center rounded-2xl transition-all',
              dia === selectedDate
                ? 'scale-105 bg-primary text-white shadow-lg'
                : isToday(dia)
                  ? 'bg-emerald-100 font-bold text-emerald-900'
                  : 'bg-gray-50 text-gray-900 hover:bg-rose-50',
            ]"
            @click="selectDay(dia)"
          >
            <span :class="['text-sm', dia === selectedDate ? 'font-bold' : '']">{{ dia }}</span>
            <div v-if="activityByDay[dia]" class="mt-1 flex gap-0.5">
              <div
                v-if="activityByDay[dia].tieneOn"
                :class="['h-1.5 w-1.5 rounded-full', dia === selectedDate ? 'bg-white' : 'bg-emerald-500']"
              ></div>
              <div
                v-if="activityByDay[dia].tieneOff"
                :class="['h-1.5 w-1.5 rounded-full', dia === selectedDate ? 'bg-white' : 'bg-rose-700']"
              ></div>
              <div
                v-if="activityByDay[dia].totalActividad > 0"
                :class="['h-1.5 w-1.5 rounded-full', dia === selectedDate ? 'bg-white' : 'bg-purple-500']"
              ></div>
            </div>
          </button>
        </div>
      </section>

      <section class="mb-6 grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-rose-50 p-4 text-center shadow-sm ring-1 ring-rose-100">
          <Pill class="mx-auto mb-2 h-6 w-6 text-primary" />
          <p class="text-2xl font-bold text-gray-900">{{ medicationCount }}</p>
          <p class="text-xs text-gray-600">Medicamentos</p>
        </div>
        <div class="rounded-2xl bg-emerald-50 p-4 text-center shadow-sm ring-1 ring-emerald-100">
          <Activity class="mx-auto mb-2 h-6 w-6 text-emerald-600" />
          <p class="text-2xl font-bold text-gray-900">{{ symptomCount }}</p>
          <p class="text-xs text-gray-600">Síntomas</p>
        </div>
        <div class="rounded-2xl bg-purple-50 p-4 text-center shadow-sm ring-1 ring-purple-100">
          <Hand class="mx-auto mb-2 h-6 w-6 text-purple-600" />
          <p class="text-2xl font-bold text-gray-900">{{ exerciseCount }}</p>
          <p class="text-xs text-gray-600">Tapping</p>
        </div>
      </section>

      <section class="mb-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ viewMode === 'calendar' ? `Registros del ${selectedDateLabel}` : 'Línea de tiempo' }}
          </h2>
          <span v-if="historialLoading" class="text-xs font-semibold text-primary">Cargando...</span>
        </div>

        <div v-if="eventosDelDia.length === 0" class="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-8 text-center">
          <Calendar class="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p class="font-semibold text-gray-700">Sin actividad registrada</p>
          <p class="mt-1 text-sm text-gray-500">Cuando registres tomas, síntomas o tapping aparecerán aquí.</p>
        </div>

        <div v-else class="relative">
          <div class="absolute bottom-0 left-6 top-0 w-0.5 bg-rose-100"></div>

          <div class="space-y-4">
            <div v-for="evento in eventosDelDia" :key="evento.id" class="relative pl-16">
              <div :class="['absolute left-4 top-4 h-5 w-5 rounded-full border-4 border-white shadow-md', getColorClasses(evento.color).dot]"></div>
              <div class="absolute left-0 top-4 w-12 pr-6 text-right text-xs font-semibold text-gray-500">
                {{ evento.horaCorta }}
              </div>

              <div :class="['rounded-2xl border-2 p-4', getColorClasses(evento.color).bg, getColorClasses(evento.color).border]">
                <div class="flex items-start gap-3">
                  <div :class="['shrink-0 rounded-xl p-2', getColorClasses(evento.color).dot]">
                    <component :is="evento.icon" class="h-5 w-5 text-white" />
                  </div>
                  <div class="flex-1">
                    <p :class="['mb-1 font-semibold', getColorClasses(evento.color).text]">{{ evento.titulo }}</p>
                    <p class="text-sm text-gray-700">{{ evento.detalle }}</p>
                    <p v-if="evento.extra" class="mt-1 text-xs text-gray-500">{{ evento.extra }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="mb-6 rounded-3xl bg-gradient-to-r from-primary to-danger p-6 text-white">
        <div class="mb-3 flex items-center gap-3">
          <div class="rounded-xl bg-white/20 p-2">
            <Pill class="h-6 w-6" />
          </div>
          <div>
            <p class="text-sm opacity-90">Próximo evento</p>
            <p class="text-xl font-bold">{{ sessionStore.nextDoseLabel }} - Medicamento</p>
          </div>
        </div>
        <p class="text-sm opacity-90">{{ sessionStore.levodopaDoseLabel }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="label in sessionStore.doseScheduleLabelsToday"
            :key="label"
            class="rounded-full bg-white/15 px-3 py-1 text-xs font-bold"
          >
            {{ label }}
          </span>
        </div>
      </section>

      <section class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <div class="mb-4 flex items-center gap-2">
          <span class="text-2xl">💡</span>
          <h3 class="font-semibold text-gray-900">Observaciones del día</h3>
        </div>
        <ul class="space-y-2 text-sm text-gray-700">
          <li class="flex gap-2">
            <span class="text-emerald-600">✓</span>
            <span>Tiempo ON registrado: {{ selectedSummary.tiempoOnFormateado }}.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-rose-700">✓</span>
            <span>Tiempo OFF registrado: {{ selectedSummary.tiempoOffFormateado }}.</span>
          </li>
          <li class="flex gap-2">
            <span class="text-yellow-600">!</span>
            <span>Revisa síntomas persistentes si aparecen después de varias tomas.</span>
          </li>
        </ul>
      </section>
    </div>

    <nav-bar />
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Hand,
  List,
  Pill,
} from 'lucide-vue-next'
import { computed, onMounted, ref, watch, type Component } from 'vue'
import logoPatito from '../assets/PATITO_sn.png'
import NavBar from '../components/NavBar.vue'
import { usePrototypeStore, type FlowPhase } from '../stores/prototypeStore'
import { useSessionStore, type BackendCalendarDay, type DayMedicationSummary } from '../stores/sessionStore'

type ViewMode = 'timeline' | 'calendar'
type ColorKey = 'primary' | 'mint' | 'yellow' | 'purple' | 'off' | 'red'

interface HistorialEvento {
  id: string
  hora: Date
  horaCorta: string
  tipo: 'medicamento' | 'sintoma' | 'ejercicio'
  titulo: string
  detalle: string
  extra?: string
  color: ColorKey
  icon: Component
}

interface ActivityDayInfo {
  totalEventos: number
  totalMedicacion: number
  totalActividad: number
  tieneOn: boolean
  tieneOff: boolean
}

const viewMode = ref<ViewMode>('timeline')
const selectedDateObject = ref(new Date())
const historialLoading = ref(false)
const selectedSummary = ref<DayMedicationSummary>({
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
const calendarDays = ref<BackendCalendarDay[]>([])

const sessionStore = useSessionStore()
const prototypeStore = usePrototypeStore()

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const selectedYear = computed(() => selectedDateObject.value.getFullYear())
const selectedMonth = computed(() => selectedDateObject.value.getMonth())
const selectedDate = computed(() => selectedDateObject.value.getDate())
const primerDiaSemana = computed(() => new Date(selectedYear.value, selectedMonth.value, 1).getDay())
const diasMes = computed(() => Array.from({ length: new Date(selectedYear.value, selectedMonth.value + 1, 0).getDate() }, (_, index) => index + 1))

const monthLabel = computed(() => {
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
    new Date(selectedYear.value, selectedMonth.value, 1)
  )
})

const selectedDateLabel = computed(() => {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(selectedDateObject.value)
})

const selectedWeekday = computed(() => {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(selectedDateObject.value)
})

const selectedFechaLocal = computed(() => getLocalDateString(selectedDateObject.value))

const localSymptomRecords = computed(() => {
  return prototypeStore.symptomRecords.filter((record) => getLocalDateString(record.timestamp) === selectedFechaLocal.value)
})

const localTappingRecords = computed(() => {
  return prototypeStore.tappingRecords.filter((record) => getLocalDateString(record.timestamp) === selectedFechaLocal.value)
})

const eventosDelDia = computed<HistorialEvento[]>(() => {
  const medicationEvents = selectedSummary.value.eventos.map((event, index) => {
    const hora = parseDateOrNull(event.horaInicio) || new Date()
    const horaProgramada = parseDateOrNull(event.horaProgramada)
    return {
      id: event.id || `med-${event.estado}-${hora.getTime()}-${index}`,
      hora,
      horaCorta: formatShortTime(hora),
      tipo: 'medicamento' as const,
      titulo: event.estado === 'ON' ? 'Ya tomó medicamento / ON' : 'Todavía no la tomó / OFF',
      detalle: event.estado === 'ON' ? 'Levodopa registrada; se habilitan mediciones posteriores' : 'Periodo sin medicación activo',
      extra: horaProgramada ? `Hora programada: ${formatShortTime(horaProgramada)}` : undefined,
      color: event.estado === 'ON' ? 'mint' as const : 'off' as const,
      icon: Pill,
    }
  })

  const backendActivityEvents = selectedSummary.value.actividades.map((record) => {
    const hora = parseDateOrNull(record.horaRegistro) || new Date()
    if (record.tipo === 'tapping') {
      return {
        id: record.id,
        hora,
        horaCorta: formatShortTime(hora),
        tipo: 'ejercicio' as const,
        titulo: `Ejercicio de tapping ${phaseLabel(record.fase)}`,
        detalle: `${record.taps || 0} taps - ${Number(record.taps || 0) >= 35 ? 'Buen resultado' : 'Completado'}`,
        color: 'purple' as const,
        icon: Hand,
      }
    }

    return {
      id: record.id,
      hora,
      horaCorta: formatShortTime(hora),
      tipo: 'sintoma' as const,
      titulo: `Registro de síntomas ${phaseLabel(record.fase)}`,
      detalle: `${estadoLabel(record.estadoSintomas || 'verde')} - ${(record.sintomas || []).map(formatSymptom).join(', ') || 'sin detalle'}`,
      color: record.estadoSintomas === 'verde' ? 'mint' as const : record.estadoSintomas === 'amarillo' ? 'yellow' as const : 'red' as const,
      icon: Activity,
    }
  })

  const localSymptomEvents = localSymptomRecords.value.map((record) => ({
    id: `local-${record.id}`,
    hora: record.timestamp,
    horaCorta: formatShortTime(record.timestamp),
    tipo: 'sintoma' as const,
    titulo: `Registro de síntomas ${phaseLabel(record.phase)}`,
    detalle: `${estadoLabel(record.estado)} - ${record.sintomas.map(formatSymptom).join(', ')}`,
    color: record.estado === 'verde' ? 'mint' as const : record.estado === 'amarillo' ? 'yellow' as const : 'red' as const,
    icon: Activity,
  }))

  const localTappingEvents = localTappingRecords.value.map((record) => ({
    id: `local-${record.id}`,
    hora: record.timestamp,
    horaCorta: formatShortTime(record.timestamp),
    tipo: 'ejercicio' as const,
    titulo: `Ejercicio de tapping ${phaseLabel(record.phase)}`,
    detalle: `${record.taps} taps - ${record.taps >= 35 ? 'Buen resultado' : 'Completado'}`,
    color: 'purple' as const,
    icon: Hand,
  }))

  return dedupeEvents([
    ...medicationEvents,
    ...backendActivityEvents,
    ...localSymptomEvents,
    ...localTappingEvents,
  ]).sort((a, b) => a.hora.getTime() - b.hora.getTime())
})

const medicationCount = computed(() => eventosDelDia.value.filter((evento) => evento.tipo === 'medicamento').length)
const symptomCount = computed(() => eventosDelDia.value.filter((evento) => evento.tipo === 'sintoma').length)
const exerciseCount = computed(() => eventosDelDia.value.filter((evento) => evento.tipo === 'ejercicio').length)

const activityByDay = computed<Record<number, ActivityDayInfo>>(() => {
  const result: Record<number, ActivityDayInfo> = {}

  calendarDays.value.forEach((day) => {
    result[day.dia] = {
      totalEventos: day.totalEventos,
      totalMedicacion: day.totalMedicacion,
      totalActividad: day.totalActividad,
      tieneOn: day.tieneOn,
      tieneOff: day.tieneOff,
    }
  })

  const monthKey = `${selectedYear.value}-${String(selectedMonth.value + 1).padStart(2, '0')}`

  prototypeStore.symptomRecords.forEach((record) => {
    const fecha = getLocalDateString(record.timestamp)
    if (!fecha.startsWith(monthKey)) return
    const day = record.timestamp.getDate()
    result[day] = mergeActivityDay(result[day], { totalActividad: 1 })
  })

  prototypeStore.tappingRecords.forEach((record) => {
    const fecha = getLocalDateString(record.timestamp)
    if (!fecha.startsWith(monthKey)) return
    const day = record.timestamp.getDate()
    result[day] = mergeActivityDay(result[day], { totalActividad: 1 })
  })

  sessionStore.medicationEvents.forEach((event) => {
    const fecha = getLocalDateString(event.timestamp)
    if (!fecha.startsWith(monthKey)) return
    const day = event.timestamp.getDate()
    result[day] = mergeActivityDay(result[day], {
      totalMedicacion: 1,
      tieneOn: event.type === 'ON',
      tieneOff: event.type === 'OFF',
    })
  })

  return result
})

function mergeActivityDay(base: ActivityDayInfo | undefined, patch: Partial<ActivityDayInfo>): ActivityDayInfo {
  return {
    totalEventos: (base?.totalEventos || 0) + (patch.totalEventos || 0) + (patch.totalActividad || 0) + (patch.totalMedicacion || 0),
    totalMedicacion: (base?.totalMedicacion || 0) + (patch.totalMedicacion || 0),
    totalActividad: (base?.totalActividad || 0) + (patch.totalActividad || 0),
    tieneOn: Boolean(base?.tieneOn || patch.tieneOn),
    tieneOff: Boolean(base?.tieneOff || patch.tieneOff),
  }
}

function dedupeEvents(events: HistorialEvento[]) {
  const seen = new Set<string>()
  return events.filter((event) => {
    const key = `${event.tipo}-${event.titulo}-${Math.floor(event.hora.getTime() / 60000)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateOrNull(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatShortTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function estadoLabel(estado: 'verde' | 'amarillo' | 'rojo') {
  if (estado === 'verde') return 'Me siento bien'
  if (estado === 'amarillo') return 'Tengo algo de dificultad'
  return 'Me cuesta mucho'
}

function phaseLabel(phase: FlowPhase) {
  return phase === 'despues' ? 'después de la toma' : 'antes de la toma'
}

function formatSymptom(sintoma: string) {
  const labels: Record<string, string> = {
    temblor: 'temblor',
    rigidez: 'rigidez',
    lentitud: 'lentitud',
    equilibrio: 'equilibrio',
    ninguno: 'sin síntomas',
  }
  return labels[sintoma] || sintoma
}

function getColorClasses(color: ColorKey) {
  const colors: Record<ColorKey, { bg: string; text: string; border: string; dot: string }> = {
    primary: { bg: 'bg-rose-50', text: 'text-primary', border: 'border-rose-200', dot: 'bg-primary' },
    mint: { bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', dot: 'bg-yellow-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', dot: 'bg-purple-500' },
    off: { bg: 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-300', dot: 'bg-rose-700' },
    red: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-200', dot: 'bg-red-500' },
  }
  return colors[color]
}

function previousPeriod() {
  const next = new Date(selectedDateObject.value)
  if (viewMode.value === 'calendar') {
    next.setMonth(next.getMonth() - 1)
  } else {
    next.setDate(next.getDate() - 1)
  }
  selectedDateObject.value = next
}

function nextPeriod() {
  const next = new Date(selectedDateObject.value)
  if (viewMode.value === 'calendar') {
    next.setMonth(next.getMonth() + 1)
  } else {
    next.setDate(next.getDate() + 1)
  }
  selectedDateObject.value = next
}

function selectDay(day: number) {
  selectedDateObject.value = new Date(selectedYear.value, selectedMonth.value, day)
}

function isToday(day: number) {
  const today = new Date()
  return day === today.getDate() && selectedMonth.value === today.getMonth() && selectedYear.value === today.getFullYear()
}

async function loadSelectedDay() {
  historialLoading.value = true
  try {
    selectedSummary.value = await sessionStore.getResumenPorFecha(selectedFechaLocal.value)
  } finally {
    historialLoading.value = false
  }
}

async function loadCalendar() {
  calendarDays.value = await sessionStore.loadCalendarioMes(selectedYear.value, selectedMonth.value + 1)
}

watch(selectedFechaLocal, () => {
  void loadSelectedDay()
})

watch([selectedYear, selectedMonth], () => {
  void loadCalendar()
})

onMounted(async () => {
  await sessionStore.loadPatientName()
  await sessionStore.loadLocalSnapshot()
  await prototypeStore.loadPrototypeRecords()
  await Promise.all([
    loadSelectedDay(),
    loadCalendar(),
  ])
})
</script>
