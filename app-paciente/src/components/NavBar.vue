<template>
  <nav class="navbar-container">
    <!-- Botón Logout en la esquina superior derecha -->
    <div class="logout-section">
      <button
        @click="handleLogout"
        :disabled="isLoggingOut"
        class="logout-btn"
        title="Cerrar sesión"
      >
        <LogOut class="logout-icon" />
        <span class="logout-label">{{ isLoggingOut ? 'Cerrando...' : 'Salir' }}</span>
      </button>
    </div>

    <!-- Calendario circular -->
    <div class="calendar-section">
      <div class="calendar-circle">
        <div class="calendar-day">{{ currentDay }}</div>
        <div class="calendar-month-year">{{ monthYear }}</div>
      </div>
    </div>

    <!-- Tabs de navegación -->
    <div class="navbar-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'navbar-tab',
          activeTab === tab.id ? 'active' : 'inactive'
        ]"
        @click="navigateTo(tab.id)"
        :title="tab.label"
      >
        <component :is="tab.icon" class="tab-icon" />
        <span class="tab-label">{{ tab.label }}</span>
        <div v-if="activeTab === tab.id" class="active-indicator"></div>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Calendar, History, Home, LogOut, User } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/sessionStore'

const router = useRouter()
const route = useRoute()
const sessionStore = useSessionStore()
const activeTab = ref<string>('inicio')
const isLoggingOut = ref(false)

// Definición de tabs con iconos Lucide
const tabs = [
  {
    id: 'inicio',
    label: 'Inicio',
    icon: Home,
  },
  {
    id: 'registro',
    label: 'Registro',
    icon: Calendar,
  },
  {
    id: 'historial',
    label: 'Historial',
    icon: History,
  },
  {
    id: 'perfil',
    label: 'Perfil',
    icon: User,
  },
]

// Calendario actual
const currentDate = computed(() => new Date())
const currentDay = computed(() => currentDate.value.getDate())
const monthYear = computed(() => {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]
  return `${months[currentDate.value.getMonth()]} ${currentDate.value.getFullYear()}`
})

// Mapeo de rutas a tabs
const routeToTab: Record<string, string> = {
  'inicio': 'inicio',
  'registro': 'registro',
  'historial': 'historial',
  'perfil': 'perfil',
}

// Mapeo de tabs a rutas
const tabToRoute: Record<string, string> = {
  'inicio': '/inicio',
  'registro': '/registro',
  'historial': '/historial',
  'perfil': '/perfil',
}

// Inicializar tab activo basado en la ruta actual
onMounted(() => {
  const routeName = route.name as string
  if (routeName && routeToTab[routeName]) {
    activeTab.value = routeToTab[routeName]
  }
})

// Navegar cuando cambia el tab
const navigateTo = (tabId: string) => {
  const routePath = tabToRoute[tabId]
  if (routePath) {
    activeTab.value = tabId
    router.push(routePath)
  }
}

// Manejar logout
const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    // Llamar función logout del store
    await sessionStore.logout()
    
    console.log('✅ Sesión cerrada correctamente')
    
    // Redirigir a login
    setTimeout(() => {
      router.push('/login')
    }, 300)
  } catch (error) {
    console.error('❌ Error durante logout:', error)
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.navbar-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1100;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1px solid #e5e7eb;
}

/* Sección de Logout */
.logout-section {
  position: absolute;
  top: 8px;
  right: 12px;
  z-index: 1200;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #840705 0%, #b8423d 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(132, 7, 5, 0.3);
  font-family: 'Inter', sans-serif;
}

.logout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(132, 7, 5, 0.4);
}

.logout-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.logout-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logout-icon {
  width: 14px;
  height: 14px;
}

.logout-label {
  letter-spacing: 0.3px;
}

/* Sección del Calendario */
.calendar-section {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px 0;
}

.calendar-circle {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #840705 0%, #b8423d 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(132, 7, 5, 0.3);
  transition: all 0.3s ease;
}

.calendar-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(132, 7, 5, 0.4);
}

.calendar-day {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.calendar-month-year {
  font-size: 0.6rem;
  font-weight: 600;
  margin-top: 2px;
  opacity: 0.9;
}

/* Tabs de navegación */
.navbar-tabs {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  width: 100%;
  height: 70px;
  padding: 8px 0 12px 0;
}

.navbar-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  gap: 4px;
  position: relative;
  padding-bottom: 4px;
}

.tab-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

.tab-label {
  font-size: 0.7rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.navbar-tab.active {
  color: #840705;
}

.navbar-tab.active .tab-icon {
  transform: scale(1.2);
}

.navbar-tab.active .tab-label {
  font-weight: 600;
  font-size: 0.75rem;
}

.navbar-tab.inactive {
  color: #94a3b8;
}

.navbar-tab:hover:not(.active) {
  color: #b8423d;
  transform: translateY(-2px);
}

/* Indicador activo */
.active-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: linear-gradient(90deg, #840705, #b8423d);
  border-radius: 2px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 24px;
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
