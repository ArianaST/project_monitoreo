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

    <header class="rounded-b-[3rem] bg-gradient-to-br from-primary via-red-800 to-emerald-700 p-6 pb-20">
      <button type="button" class="mb-6 flex items-center gap-2 text-white" @click="router.push('/inicio')">
        <ArrowLeft class="h-6 w-6" />
        <span class="text-lg">Volver</span>
      </button>

      <div class="text-center">
        <div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg">
          <img :src="logoPatito" alt="PaTITO" class="h-20 w-20 object-contain" />
        </div>
        <h1 class="mb-1 text-2xl font-bold text-white">{{ patientName }}</h1>
        <p class="text-rose-100">Paciente en telemonitoreo PaTITO</p>
      </div>
    </header>

    <main class="mx-auto -mt-10 max-w-2xl px-6">
      <section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-lg font-bold text-gray-900">Información personal</h2>

        <div class="space-y-4">
          <profile-row title="Nombre completo" :value="patientName" color="primary">
            <User class="h-5 w-5 text-primary" />
          </profile-row>

          <profile-row title="Correo electrónico" :value="patientEmail" color="mint">
            <Mail class="h-5 w-5 text-emerald-700" />
          </profile-row>

          <profile-row title="App" value="PaTITO" color="warning">
            <Shield class="h-5 w-5 text-amber-600" />
          </profile-row>
        </div>
      </section>

      <section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Levodopa</h2>
            <p class="text-sm text-gray-500">Configura la primera toma y cada cuántas horas se repite.</p>
          </div>
          <Pill class="h-7 w-7 text-primary" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Primera toma</span>
            <input
              v-model="scheduleForm.startTime"
              type="time"
              class="h-12 w-full rounded-2xl border border-rose-100 bg-rose-50 px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">Intervalo</span>
            <select
              v-model.number="scheduleForm.intervalHours"
              class="h-12 w-full rounded-2xl border border-rose-100 bg-rose-50 px-3 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option v-for="option in intervalOptions" :key="option" :value="option">Cada {{ option }} h</option>
            </select>
          </label>
        </div>

        <div class="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-primary">Horas programadas de hoy</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="label in previewSchedule"
              :key="label"
              class="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary ring-1 ring-rose-100"
            >
              {{ label }}
            </span>
          </div>
        </div>

        <button
          type="button"
          :disabled="isSavingSchedule"
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary p-4 font-semibold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          @click="saveSchedule"
        >
          <Save class="h-5 w-5" />
          {{ isSavingSchedule ? 'Guardando...' : 'Guardar horario' }}
        </button>
      </section>

      <section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Notificaciones</h2>
            <p class="text-sm text-gray-500">Recordatorios locales de medicamento y registro clínico.</p>
          </div>
          <Bell class="h-7 w-7 text-amber-600" />
        </div>

        <div class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-bold text-gray-900">Recordatorios PaTITO</p>
              <p class="text-sm text-gray-600">
                {{ sessionStore.notificationsEnabled ? 'Activos' : 'Desactivados' }} · {{ sessionStore.pendingNotificationCount }} pendientes
              </p>
            </div>
            <button
              type="button"
              :disabled="isTogglingNotifications"
              :class="[
                'relative h-8 w-14 rounded-full transition-colors disabled:opacity-60',
                sessionStore.notificationsEnabled ? 'bg-emerald-500' : 'bg-gray-300',
              ]"
              @click="toggleNotifications"
            >
              <span
                :class="[
                  'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  sessionStore.notificationsEnabled ? 'translate-x-7' : 'translate-x-1',
                ]"
              />
            </button>
          </div>
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            :disabled="isTogglingNotifications"
            class="rounded-2xl border-2 border-amber-200 bg-white p-4 text-left transition-transform active:scale-95 disabled:opacity-60"
            @click="testNotification"
          >
            <p class="font-bold text-gray-900">Probar notificación</p>
            <p class="text-sm text-gray-600">Envía una alerta de prueba al celular.</p>
          </button>

          <button
            type="button"
            :disabled="isTogglingNotifications"
            class="rounded-2xl border-2 border-emerald-200 bg-white p-4 text-left transition-transform active:scale-95 disabled:opacity-60"
            @click="rescheduleNotifications"
          >
            <p class="font-bold text-gray-900">Reprogramar</p>
            <p class="text-sm text-gray-600">Reconstruye recordatorios con el horario actual.</p>
          </button>
        </div>
      </section>

      <section class="mb-6 rounded-3xl bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-lg font-bold text-gray-900">Estado de app híbrida</h2>
        <div class="space-y-3 text-sm text-gray-700">
          <div class="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <span>Plataforma</span>
            <span class="font-bold text-gray-900">{{ platformLabel }}</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <span>Acelerómetro</span>
            <span class="font-bold text-teal-700">Disponible en prueba rápida</span>
          </div>
          <div class="flex items-center justify-between rounded-2xl bg-gray-50 p-4">
            <span>Registro antes/después</span>
            <span class="font-bold text-emerald-700">Activo</span>
          </div>
        </div>
      </section>

      <button
        type="button"
        :disabled="isLoggingOut"
        class="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-5 text-lg font-semibold text-red-600 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        @click="handleLogout"
      >
        <LogOut class="h-6 w-6" />
        {{ isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión' }}
      </button>

      <p class="mt-6 text-center text-sm text-gray-400">Versión 1.1.0 • PaTITO</p>
    </main>

    <nav-bar />
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LogOut,
  Mail,
  Pill,
  Save,
  Shield,
  User,
} from 'lucide-vue-next'
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import logoPatito from '../assets/PATITO_sn.png'
import NavBar from '../components/NavBar.vue'
import { sendTestMedicationNotification } from '../services/notificationService'
import { useSessionStore } from '../stores/sessionStore'

const router = useRouter()
const sessionStore = useSessionStore()
const isLoggingOut = ref(false)
const isSavingSchedule = ref(false)
const isTogglingNotifications = ref(false)

const scheduleForm = reactive({
  startTime: '08:00',
  intervalHours: 6,
})

const intervalOptions = [2, 3, 4, 5, 6, 8, 12]
const patientName = computed(() => sessionStore.patientName || 'Paciente')
const patientEmail = computed(() => sessionStore.patientEmail || 'No configurado')
const platformLabel = computed(() => Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web')

const previewSchedule = computed(() => {
  const [hoursRaw, minutesRaw] = scheduleForm.startTime.split(':').map(Number)
  const interval = Math.min(24, Math.max(1, Number(scheduleForm.intervalHours) || 6))
  const base = new Date()
  base.setHours(Number.isFinite(hoursRaw) ? hoursRaw : 8, Number.isFinite(minutesRaw) ? minutesRaw : 0, 0, 0)
  const end = new Date(base)
  end.setHours(24, 0, 0, 0)

  const labels: string[] = []
  let cursor = new Date(base)
  while (cursor < end && labels.length < 12) {
    labels.push(new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(cursor))
    cursor = new Date(cursor.getTime() + interval * 60 * 60 * 1000)
  }
  return labels
})

function syncFormFromStore() {
  scheduleForm.startTime = sessionStore.levodopaStartTime
  scheduleForm.intervalHours = sessionStore.levodopaIntervalHours
}

async function saveSchedule() {
  isSavingSchedule.value = true
  try {
    await sessionStore.updateMedicationSchedule(scheduleForm.intervalHours, scheduleForm.startTime)
    if (sessionStore.notificationsEnabled) {
      await sessionStore.setMedicationNotificationsEnabled(true)
    }
  } finally {
    isSavingSchedule.value = false
  }
}

async function toggleNotifications() {
  isTogglingNotifications.value = true
  try {
    await sessionStore.setMedicationNotificationsEnabled(!sessionStore.notificationsEnabled)
  } finally {
    isTogglingNotifications.value = false
  }
}

async function rescheduleNotifications() {
  isTogglingNotifications.value = true
  try {
    await sessionStore.setMedicationNotificationsEnabled(true)
  } finally {
    isTogglingNotifications.value = false
  }
}

async function testNotification() {
  isTogglingNotifications.value = true
  try {
    const result = await sendTestMedicationNotification()
    sessionStore.lastNotification = {
      type: result.enabled ? 'success' : 'warning',
      message: result.message,
    }
  } finally {
    isTogglingNotifications.value = false
  }
}

onMounted(async () => {
  await sessionStore.loadPatientName()
  await sessionStore.loadNotificationSettings()
  try {
    await sessionStore.loadProfileFromBackend()
  } catch (error) {
    console.error('No se pudo cargar perfil desde backend:', error)
  }
  syncFormFromStore()
})

async function handleLogout() {
  isLoggingOut.value = true
  try {
    await sessionStore.logout()
    router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}

const colorMap: Record<string, string> = {
  primary: 'bg-rose-100',
  mint: 'bg-emerald-100',
  warning: 'bg-amber-100',
  gray: 'bg-gray-100',
}

const ProfileRow = defineComponent({
  name: 'ProfileRow',
  props: {
    title: { type: String, required: true },
    value: { type: String, required: true },
    color: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'flex items-center gap-4 rounded-2xl bg-gray-50 p-4' }, [
      h('div', { class: `rounded-xl p-3 ${colorMap[props.color] || colorMap.gray}` }, slots.default?.()),
      h('div', { class: 'flex-1' }, [
        h('p', { class: 'text-sm text-gray-600' }, props.title),
        h('p', { class: 'font-semibold text-gray-900' }, props.value),
      ]),
      h(ChevronRight, { class: 'h-5 w-5 text-gray-400' }),
    ])
  },
})
</script>