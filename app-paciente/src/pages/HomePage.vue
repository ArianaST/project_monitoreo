<template>
  <div class="min-h-screen bg-gradient-to-b from-rose-50 via-white to-emerald-50 pb-40">
    <div v-if="sessionStore.lastNotification" class="fixed right-4 top-4 z-50 animate-in">
      <div
        :class="[
          'max-w-xs rounded-2xl border p-4 shadow-lg',
          sessionStore.lastNotification.type === 'success'
            ? 'border-green-300 bg-green-100 text-green-800'
            : sessionStore.lastNotification.type === 'error'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-yellow-300 bg-yellow-100 text-yellow-800',
        ]"
      >
        <p class="text-sm font-semibold">{{ sessionStore.lastNotification.message }}</p>
      </div>
    </div>

    <div class="mx-auto max-w-2xl p-6">
      <header class="mb-6">
        <div class="mb-3 flex items-center gap-3">
          <img :src="logoPatito" alt="PaTITO" class="h-12 w-12 object-contain" />
          <div>
            <h1 class="text-2xl font-bold text-gray-900">PaTITO</h1>
            <p class="text-sm text-gray-500">Tu asistente de medicación</p>
          </div>
        </div>
        <h2 class="text-2xl font-bold text-gray-900">Hola, {{ patientDisplayName }}</h2>
        <p class="mt-1 text-lg text-gray-600">{{ formattedDate }}</p>
      </header>

      <section class="mb-6 rounded-3xl border-4 border-primary bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="rounded-2xl bg-primary p-3">
              <Pill class="h-8 w-8 text-white" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Próxima toma</p>
              <h2 class="text-2xl font-bold text-gray-900">{{ sessionStore.nextDoseLabel }}</h2>
              <p class="text-xs font-semibold text-primary">
                Cada {{ sessionStore.levodopaIntervalHours }} h desde {{ sessionStore.levodopaStartTime }}
              </p>
            </div>
          </div>
          <div
            :class="[
              'rounded-2xl px-3 py-2 text-right text-xs font-bold uppercase tracking-wide',
              sessionStore.medicationState === 'ON'
                ? 'bg-emerald-100 text-emerald-800'
                : sessionStore.medicationState === 'OFF'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-gray-100 text-gray-500',
            ]"
          >
            {{ sessionStore.medicationState || 'SIN ESTADO' }}
            <p class="mt-1 text-[11px] normal-case tracking-normal">{{ sessionStore.currentPeriodTime }}</p>
          </div>
        </div>

        <div class="mb-5 rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p class="text-lg font-semibold text-gray-900">{{ sessionStore.levodopaDoseLabel }}</p>
          <p class="text-gray-600">Tiempo restante: {{ sessionStore.timeUntilNextDose }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="label in sessionStore.doseScheduleLabelsToday"
              :key="label"
              :class="[
                'rounded-full px-3 py-1 text-xs font-bold',
                label === sessionStore.nextDoseLabel
                  ? 'bg-primary text-white'
                  : 'bg-white text-primary ring-1 ring-rose-100',
              ]"
            >
              {{ label }}
            </span>
          </div>
        </div>

        <section-divider label="Tomar medicamento" color="primary" />

        <div class="mb-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            :disabled="sessionStore.isProcessing"
            :class="[
              'flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              sessionStore.medicationState === 'ON'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-emerald-300 bg-white',
            ]"
            @click="abrirConfirmacionToma"
          >
            <div :class="['shrink-0 rounded-xl p-2', sessionStore.medicationState === 'ON' ? 'bg-emerald-500' : 'bg-primary']">
              <CheckCircle2 class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p :class="['text-xs font-bold uppercase tracking-wide', sessionStore.medicationState === 'ON' ? 'text-emerald-700' : 'text-primary']">
              </p>
              <p class="text-base font-bold text-gray-900">Ya la tomé</p>
              <p class="text-xs text-gray-600">Activa medición después de la toma</p>
            </div>
          </button>

          <button
            type="button"
            :disabled="sessionStore.isProcessing"
            :class="[
              'flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              sessionStore.medicationState === 'OFF'
                ? 'border-rose-600 bg-rose-50'
                : 'border-rose-200 bg-white',
            ]"
            @click="registrarNoTomada"
          >
            <div :class="['shrink-0 rounded-xl p-2', sessionStore.medicationState === 'OFF' ? 'bg-rose-700' : 'bg-rose-500']">
              <XCircle class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p :class="['text-xs font-bold uppercase tracking-wide', sessionStore.medicationState === 'OFF' ? 'text-rose-800' : 'text-rose-600']">
              </p>
              <p class="text-base font-bold text-gray-900">Todavía no la tomé</p>
              <p class="text-xs text-gray-600">Suma tiempo sin medicación</p>
            </div>
          </button>
        </div>

        <div class="mb-5">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-500">Progreso de esta toma</span>
            <span class="text-sm font-bold text-primary">
              {{ prototypeStore.completadosCount }}/{{ prototypeStore.totalPasos }}
            </span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-3 rounded-full transition-all duration-500"
              :class="prototypeStore.progreso === 100 ? 'bg-emerald-500' : 'bg-primary'"
              :style="{ width: `${prototypeStore.progreso}%` }"
            />
          </div>
        </div>

        <section-divider label="Antes de tomarla" color="warning" />

        <step-button
          :done="prototypeStore.isCompleted('antes_sintomas')"
          :disabled="!sessionStore.canRegisterBeforeDose"
          color="warning"
          label="Registrar cómo me siento"
          sublabel="Síntomas antes de la toma"
          disabled-label="Bloqueado mientras estás en ON"
          @click="abrirRegistro('sintomas', 'antes')"
        >
          <ClipboardList class="h-6 w-6 text-white" />
        </step-button>

        <step-button
          :done="prototypeStore.isCompleted('antes_tapping')"
          :disabled="!sessionStore.canRegisterBeforeDose"
          color="purple"
          label="Ejercicio de tapping"
          sublabel="Medir velocidad antes de la toma"
          disabled-label="Bloqueado mientras estás en ON"
          @click="abrirRegistro('tapping', 'antes')"
        >
          <Hand class="h-6 w-6 text-white" />
        </step-button>


        <step-button
          :done="prototypeStore.isCompleted('antes_acelerometro')"
          :disabled="!sessionStore.canRegisterBeforeDose"
          color="teal"
          label="Prueba acelerómetro"
          sublabel="Registrar temblor antes de la toma"
          disabled-label="Bloqueado mientras estás en ON"
          @click="abrirRegistro('acelerometro', 'antes')"
        >
          <Activity class="h-6 w-6 text-white" />
        </step-button>

        <section-divider label="Después de tomarla" :color="sessionStore.canRegisterAfterDose ? 'mint' : 'gray'" />

        <div
          v-if="!sessionStore.canRegisterAfterDose"
          class="mb-3 flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4"
        >
          <Lock class="h-5 w-5 shrink-0 text-gray-400" />
          <p class="text-sm font-medium text-gray-400">Se activa solo cuando registres “Ya la tomé” </p>
        </div>
        <template v-else>
          <step-button
            :done="prototypeStore.isCompleted('despues_sintomas')"
            :disabled="false"
            color="mint"
            label="Registrar cómo me siento"
            sublabel="Síntomas después de la toma"
            @click="abrirRegistro('sintomas', 'despues')"
          >
            <ClipboardList class="h-6 w-6 text-white" />
          </step-button>

          <step-button
            :done="prototypeStore.isCompleted('despues_tapping')"
            :disabled="false"
            color="teal"
            label="Ejercicio de tapping"
            sublabel="Medir velocidad después de la toma"
            @click="abrirRegistro('tapping', 'despues')"
          >
            <Hand class="h-6 w-6 text-white" />
          </step-button>


          <step-button
            :done="prototypeStore.isCompleted('despues_acelerometro')"
            :disabled="false"
            color="teal"
            label="Prueba acelerómetro"
            sublabel="Registrar temblor después de la toma"
            @click="abrirRegistro('acelerometro', 'despues')"
          >
            <Activity class="h-6 w-6 text-white" />
          </step-button>
        </template>

        <button
          type="button"
          class="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-500 transition-transform active:scale-95"
          @click="pospuesto = true"
        >
          <Clock class="h-5 w-5" />
          <span>{{ pospuesto ? 'Recordatorio pospuesto' : 'Posponer recordatorio' }}</span>
        </button>
      </section>

      <section class="rounded-2xl bg-white p-6 shadow-md">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">Resumen de hoy</h3>
          <button
            type="button"
            class="flex items-center gap-1 font-semibold text-primary"
            @click="router.push('/historial')"
          >
            Ver más
            <Calendar class="h-5 w-5" />
          </button>
        </div>

        <div class="mb-5 grid grid-cols-3 gap-3">
          <div class="rounded-2xl bg-emerald-50 p-4 text-center">
            <Clock class="mx-auto mb-2 h-6 w-6 text-emerald-600" />
            <p class="text-lg font-bold text-gray-900">{{ sessionStore.totalOnTimeToday }}</p>
            <p class="text-xs text-gray-600">Tiempo ON</p>
          </div>
          <div class="rounded-2xl bg-rose-50 p-4 text-center">
            <Clock class="mx-auto mb-2 h-6 w-6 text-rose-700" />
            <p class="text-lg font-bold text-gray-900">{{ sessionStore.totalOffTimeToday }}</p>
            <p class="text-xs text-gray-600">Tiempo OFF</p>
          </div>
          <div class="rounded-2xl bg-rose-50 p-4 text-center">
            <Activity class="mx-auto mb-2 h-6 w-6 text-primary" />
            <p class="text-lg font-bold text-gray-900">{{ sessionStore.totalEvents }}</p>
            <p class="text-xs text-gray-600">Eventos</p>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="event in resumenEventos"
            :key="event.id"
            class="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0"
          >
            <div :class="['h-3 w-3 shrink-0 rounded-full', event.dot]"></div>
            <span class="text-gray-700">{{ event.label }}</span>
          </div>
        </div>
      </section>
    </div>

    <nav-bar />
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hand,
  Lock,
  Pill,
  XCircle,
} from 'lucide-vue-next'
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoPatito from '../assets/PATITO_sn.png'
import NavBar from '../components/NavBar.vue'
import { usePrototypeStore, type FlowPhase } from '../stores/prototypeStore'
import { useSessionStore } from '../stores/sessionStore'

const router = useRouter()
const sessionStore = useSessionStore()
const prototypeStore = usePrototypeStore()
const pospuesto = ref(false)

const patientDisplayName = computed(() => sessionStore.patientName || 'Paciente')

const formattedDate = computed(() => {
  const now = new Date()
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
})

const resumenEventos = computed(() => {
  const recientes = sessionStore.recentEvents.map((event, index) => ({
    id: event.id || `${event.type}-${event.timestamp.getTime()}-${index}`,
    dot: event.type === 'ON' ? 'bg-emerald-500' : 'bg-rose-700',
    label: `${formatTime(event.timestamp)} · ${event.type === 'ON' ? 'Ya la tomó / ON' : 'Todavía no / OFF'}`,
  }))

  if (recientes.length > 0) return recientes.slice(0, 5)

  return [
    { id: 'empty-state', dot: 'bg-gray-300', label: 'Aún no hay eventos registrados hoy' },
  ]
})

function abrirRegistro(modo: 'sintomas' | 'tapping' | 'acelerometro', fase: FlowPhase) {
  router.push({ path: '/registro', query: { modo, fase } })
}

function abrirConfirmacionToma() {
  router.push({ path: '/registro', query: { modo: 'confirmar' } })
}

async function registrarNoTomada() {
  await sessionStore.setMedicationState('OFF', {
    tipoEvento: 'toma_no_realizada',
    horaProgramada: sessionStore.scheduledDoseTime,
  })
  prototypeStore.setMedicationDecision(false)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

onMounted(async () => {
  await sessionStore.initNetworkListener()
  await sessionStore.loadPatientName()
  await sessionStore.loadLocalSnapshot()
  await prototypeStore.loadPrototypeRecords()
  await sessionStore.loadResumenDia({ preserveCurrentStateOnEmpty: true })
  sessionStore.startTimer()
})

const SectionDivider = defineComponent({
  name: 'SectionDivider',
  props: {
    label: { type: String, required: true },
    color: { type: String, required: true },
  },
  setup(props) {
    const classes: Record<string, { text: string; line: string }> = {
      primary: { text: 'text-primary', line: 'bg-rose-200' },
      warning: { text: 'text-amber-600', line: 'bg-amber-200' },
      mint: { text: 'text-emerald-600', line: 'bg-emerald-200' },
      purple: { text: 'text-purple-600', line: 'bg-purple-200' },
      teal: { text: 'text-teal-600', line: 'bg-teal-200' },
      gray: { text: 'text-gray-400', line: 'bg-gray-200' },
    }

    return () => {
      const current = classes[props.color] || classes.gray
      return h('div', { class: 'mb-2 mt-3 flex items-center gap-2' }, [
        h('div', { class: `h-px flex-1 ${current.line}` }),
        h('span', { class: `px-1 text-xs font-bold uppercase tracking-widest ${current.text}` }, props.label),
        h('div', { class: `h-px flex-1 ${current.line}` }),
      ])
    }
  },
})

const StepButton = defineComponent({
  name: 'StepButton',
  props: {
    done: { type: Boolean, required: true },
    disabled: { type: Boolean, required: false, default: false },
    color: { type: String, required: true },
    label: { type: String, required: true },
    sublabel: { type: String, required: true },
    disabledLabel: { type: String, required: false, default: 'Bloqueado' },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    const colorClasses: Record<string, { bg: string; border: string; icon: string; label: string; dot: string }> = {
      warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-400',
        icon: 'bg-amber-500',
        label: 'text-amber-700',
        dot: 'bg-amber-400',
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-400',
        icon: 'bg-purple-500',
        label: 'text-purple-700',
        dot: 'bg-purple-400',
      },
      mint: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-400',
        icon: 'bg-emerald-500',
        label: 'text-emerald-700',
        dot: 'bg-emerald-400',
      },
      teal: {
        bg: 'bg-teal-50',
        border: 'border-teal-400',
        icon: 'bg-teal-500',
        label: 'text-teal-700',
        dot: 'bg-teal-400',
      },
    }

    return () => {
      const current = colorClasses[props.color] || colorClasses.warning

      if (props.done) {
        return h('div', { class: 'mb-2 flex w-full items-center gap-4 rounded-2xl border-2 border-gray-200 bg-gray-50 p-4' }, [
          h('div', { class: 'shrink-0 rounded-xl bg-gray-300 p-2' }, [h(CheckCircle2, { class: 'h-6 w-6 text-white' })]),
          h('div', { class: 'flex-1 text-left' }, [
            h('p', { class: 'text-sm text-gray-400' }, props.sublabel),
            h('p', { class: 'text-base font-semibold text-gray-400 line-through' }, props.label),
          ]),
          h(CheckCircle2, { class: 'h-6 w-6 shrink-0 text-emerald-500' }),
        ])
      }

      if (props.disabled) {
        return h('div', { class: 'mb-2 flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 opacity-80' }, [
          h('div', { class: 'shrink-0 rounded-xl bg-gray-300 p-2' }, slots.default?.()),
          h('div', { class: 'flex-1 text-left' }, [
            h('p', { class: 'text-xs font-bold uppercase tracking-wide text-gray-400' }, props.disabledLabel),
            h('p', { class: 'text-base font-semibold text-gray-400' }, props.label),
          ]),
          h(Lock, { class: 'h-5 w-5 shrink-0 text-gray-400' }),
        ])
      }

      return h(
        'button',
        {
          type: 'button',
          class: `mb-2 flex w-full items-center gap-4 rounded-2xl border-2 p-4 transition-transform active:scale-95 ${current.bg} ${current.border}`,
          onClick: () => emit('click'),
        },
        [
          h('div', { class: `shrink-0 rounded-xl p-2 ${current.icon}` }, slots.default?.()),
          h('div', { class: 'flex-1 text-left' }, [
            h('p', { class: `text-xs font-bold uppercase tracking-wide ${current.label}` }, props.sublabel),
            h('p', { class: 'text-base font-semibold text-gray-900' }, props.label),
          ]),
          h('div', { class: `h-3 w-3 shrink-0 rounded-full ${current.dot}` }),
        ]
      )
    }
  },
})
</script>
