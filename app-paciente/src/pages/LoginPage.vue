<template>
  <div class="h-screen flex flex-col">
    <!-- ========================================
         PARTE SUPERIOR: Gradiente con branding (25%)
         ======================================== -->
    <div
      class="bg-gradient-to-b from-primary to-danger flex-shrink-0 flex flex-col items-center justify-center px-6 py-8"
    >
      <!-- Logo PaTITO -->
      <div class="mb-3 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 p-3 shadow-xl ring-1 ring-white/60">
        <img
          :src="patitoLogo"
          alt="Logo PaTITO"
          class="h-full w-full object-contain"
        />
      </div>

      <!-- Nombre app -->
      <h1 class="text-2xl font-black text-white text-center mb-1 tracking-tight">
        PaTITO
      </h1>

      <!-- Subtítulo -->
      <p class="text-xs text-white text-opacity-80 text-center">
        Telemonitoreo de levodopa y síntomas
      </p>
    </div>

    <!-- ========================================
         PARTE INFERIOR: Blanco redondeado (75%)
         ======================================== -->
    <div
      class="bg-white rounded-t-3xl flex-1 flex flex-col p-4 overflow-y-auto"
    >
      <!-- =====================================
           VISTA A: Modo Biométrico (token guardado)
           ===================================== -->
      <div
        v-if="!auth.showBiometricForm && authState.hasToken"
        class="flex flex-col justify-center h-full"
      >
        <!-- Bienvenida -->
        <h2 class="text-lg font-semibold text-gray-900 text-center mb-3">
          Bienvenido/a de vuelta
        </h2>

        <!-- Nombre del paciente -->
        <p class="text-base text-gray-600 text-center mb-6">
          {{ sessionStore.patientName || "Paciente" }}
        </p>

        <!-- Botón Biométrico - Grande y visible -->
        <button
          @click="handleBiometricLogin"
          :disabled="auth.isLoading"
          class="h-16 w-full rounded-2xl border-2 border-primary bg-white shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaceIcon class="w-10 h-10 text-primary" />
          <span class="text-sm font-medium text-gray-900">
            {{ auth.isLoading ? "Verificando..." : "Toca para entrar" }}
          </span>
        </button>

        <!-- Link para problemas -->
        <button
          @click="auth.showBiometricForm = true"
          class="text-xs text-primary font-medium hover:underline text-center"
        >
          ¿Problemas para entrar?
        </button>
      </div>

      <!-- =====================================
           VISTA B: Formularios (sin token o problemas)
           ===================================== -->
      <div v-else class="flex flex-col justify-start h-full">
        <!-- Spinner de carga global -->
        <div
          v-if="auth.isLoading"
          class="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center rounded-t-3xl"
        >
          <div class="flex flex-col items-center gap-2">
            <div
              class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="text-sm text-gray-600">Verificando identidad...</p>
          </div>
        </div>

        <!-- Mensaje de error -->
        <div
          v-if="auth.errorMessage"
          class="mb-2 p-3 bg-red-100 border-l-4 border-red-500 rounded-lg"
        >
          <p class="text-xs text-red-700">{{ auth.errorMessage }}</p>
        </div>

        <!-- Mensaje de éxito registro -->
        <div
          v-if="successMessage"
          class="mb-2 p-3 bg-green-100 border-l-4 border-green-500 rounded-lg"
        >
          <p class="text-xs text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Pestañas: Login / Registro -->
        <div class="flex gap-2 mb-4 border-b border-gray-200">
          <button
            @click="currentTab = 'login'"
            :class="[
              'pb-2 px-3 text-sm font-medium transition-colors',
              currentTab === 'login'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            Iniciar sesión
          </button>
          <button
            @click="currentTab = 'register'"
            :class="[
              'pb-2 px-3 text-sm font-medium transition-colors',
              currentTab === 'register'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700',
            ]"
          >
            Registrarse
          </button>
        </div>

        <!-- ====== PESTAÑA LOGIN ====== -->
        <div v-if="currentTab === 'login'" class="flex-1 flex flex-col gap-3">
          <div
            v-if="isNativeDevice"
            class="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-3"
          >
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
              <FaceIcon class="h-6 w-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="text-xs font-bold text-primary">
                {{ biometricAvailable ? "Biometría disponible" : "Biometría no disponible" }}
              </p>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              v-model="loginForm.email"
              type="email"
              placeholder="tu@email.com"
              class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div class="relative h-10">
              <input
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="Tu contraseña"
                class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                :disabled="auth.isLoading"
              />
              <!-- Toggle mostrar/ocultar -->
              <button
                @click="showLoginPassword = !showLoginPassword"
                type="button"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Eye v-if="showLoginPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Botón Entrar -->
          <button
            @click="handleLogin"
            :disabled="
              auth.isLoading || !loginForm.email || !loginForm.password
            "
            class="h-10 w-full mt-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-danger transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
          >
            Entrar
          </button>
        </div>

        <!-- ====== PESTAÑA REGISTRO ====== -->
        <div v-else class="flex-1 flex flex-col gap-3">
          <!-- Nombre -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Tu nombre
            </label>
            <input
              v-model="registerForm.nombre"
              type="text"
              placeholder="Juan Pérez"
              class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="tu@email.com"
              class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div class="relative h-10">
              <input
                v-model="registerForm.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                placeholder="Tu contraseña"
                class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                :disabled="auth.isLoading"
              />
              <!-- Toggle mostrar/ocultar -->
              <button
                @click="showRegisterPassword = !showRegisterPassword"
                type="button"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Eye v-if="showRegisterPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Configuración de levodopa -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Primera toma
              </label>
              <input
                v-model="registerForm.levodopaHoraInicio"
                type="time"
                class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                :disabled="auth.isLoading"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Cada cuántas horas
              </label>
              <input
                v-model.number="registerForm.levodopaIntervaloHoras"
                type="number"
                min="1"
                max="24"
                step="1"
                class="h-10 w-full px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                :disabled="auth.isLoading"
              />
            </div>
          </div>

          <div class="rounded-xl border border-rose-100 bg-rose-50 p-3">
            <p class="text-xs text-primary">
              Este horario se usa para calcular la próxima dosis de levodopa.
              Por defecto queda cada 6 horas.
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="label in levodopaPreviewHours"
                :key="label"
                class="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary ring-1 ring-rose-100"
              >
                {{ label }}
              </span>
            </div>
          </div>


          <label class="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <input
              v-model="registerForm.activarNotificaciones"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-emerald-300 text-primary focus:ring-primary"
              :disabled="auth.isLoading"
            />
            <span class="text-xs text-emerald-800">
              Activar recordatorios de PaTITO
            </span>
          </label>

          <div
            v-if="isNativeDevice"
            class="rounded-xl border border-rose-100 bg-white p-3 shadow-sm"
          >
            <p class="text-xs font-bold text-primary">
              {{ biometricAvailable ? "Acceso biométrico preparado" : "Biometría pendiente" }}
            </p>
            <p class="mt-1 text-[11px] leading-snug text-gray-600">
              {{ biometricAvailable ? "Al crear tu cuenta se guardará la sesión para que puedas entrar con huella o rostro." : "Puedes crear tu cuenta ahora y activar huella/rostro después desde tu Android." }}
            </p>
          </div>

          <!-- Botón Crear cuenta -->
          <button
            @click="handleRegister"
            :disabled="auth.isLoading || !isRegisterFormValid"
            class="h-10 w-full mt-2 bg-secondary text-white rounded-xl text-sm font-medium hover:bg-warning transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
          >
            Crear cuenta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
import { h } from "vue";
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, onMounted, proxyRefs, ref } from "vue";
import patitoLogo from "../assets/PATITO_sn.png";
import { useRouter } from "vue-router";
import { useBiometricAuth } from "../composables/useBiometricAuth";
import { useSessionStore } from "../stores/sessionStore";

// ========================================
// SETUP
// ========================================

const router = useRouter();
const auth = proxyRefs(useBiometricAuth());
const sessionStore = useSessionStore();

// ========================================
// STATE
// ========================================

const currentTab = ref<"login" | "register">("login");
const authState = ref({ hasToken: false, showBiometric: false });
const successMessage = ref("");
const isNativeDevice = ref(false);
const biometricAvailable = ref(false);

// Login form
const loginForm = ref({ email: "", password: "" });
const showLoginPassword = ref(false);

// Register form
const registerForm = ref({
  nombre: "",
  email: "",
  password: "",
  levodopaHoraInicio: "08:00",
  levodopaIntervaloHoras: 6,
  activarNotificaciones: true,
});
const showRegisterPassword = ref(false);

const isRegisterFormValid = computed(() => {
  const interval = Number(registerForm.value.levodopaIntervaloHoras);
  return Boolean(
    registerForm.value.nombre &&
    registerForm.value.email &&
    registerForm.value.password &&
    registerForm.value.levodopaHoraInicio &&
    Number.isFinite(interval) &&
    interval >= 1 &&
    interval <= 24,
  );
});

const levodopaPreviewHours = computed(() => {
  const interval = Number(registerForm.value.levodopaIntervaloHoras);
  const safeInterval = Number.isFinite(interval) && interval >= 1 && interval <= 24 ? Math.round(interval) : 6;
  const [hoursRaw, minutesRaw] = registerForm.value.levodopaHoraInicio.split(':').map(Number);
  const base = new Date();
  base.setHours(Number.isFinite(hoursRaw) ? hoursRaw : 8, Number.isFinite(minutesRaw) ? minutesRaw : 0, 0, 0);

  const labels: string[] = [];
  const end = new Date(base);
  end.setHours(24, 0, 0, 0);

  let cursor = new Date(base);
  while (cursor < end && labels.length < 8) {
    labels.push(new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(cursor));
    cursor = new Date(cursor.getTime() + safeInterval * 60 * 60 * 1000);
  }

  return labels;
});

// ========================================
// ÍCONO FACIAL (componente temporal)
// ========================================

const FaceIcon = {
  name: "FaceIcon",
  render: () =>
    h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        class: "w-14 h-14",
      },
      [
        h("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
        h("circle", { cx: "12", cy: "7", r: "4" }),
        h("circle", { cx: "9", cy: "10", r: "1", fill: "currentColor" }),
        h("circle", { cx: "15", cy: "10", r: "1", fill: "currentColor" }),
        h("path", { d: "M12 14v3" }),
      ],
    ),
};

// ========================================
// MÉTODOS
// ========================================

/**
 * Intenta autenticar con biometría
 * Si es exitoso, navega a /home
 */
async function handleBiometricLogin() {
  const success = await auth.loginWithBiometric();
  if (success) {
    setTimeout(() => {
      router.push("/home");
    }, 300);
  }
}

/**
 * Procesa login con email y contraseña
 */
async function handleLogin() {
  const success = await auth.loginWithEmail(
    loginForm.value.email,
    loginForm.value.password,
  );
  if (success) {
    // Limpiar formulario
    loginForm.value = { email: "", password: "" };
    // Navegar a home
    setTimeout(() => {
      router.push("/home");
    }, 300);
  }
}

/**
 * Procesa registro: solo nombre, email, contraseña
 */
async function handleRegister() {
  const success = await auth.register(
    registerForm.value.nombre,
    registerForm.value.email,
    registerForm.value.password,
    Number(registerForm.value.levodopaIntervaloHoras),
    registerForm.value.levodopaHoraInicio,
  );

  if (success) {
    const shouldEnableNotifications = registerForm.value.activarNotificaciones;

    if (shouldEnableNotifications) {
      try {
        await sessionStore.setMedicationNotificationsEnabled(true);
      } catch {
        // El aviso de error ya lo maneja sessionStore.
      }
    }

    // Mostrar mensaje de éxito
    successMessage.value = `¡Bienvenido/a ${registerForm.value.nombre}!`;

    // Limpiar formulario
    registerForm.value = {
      nombre: "",
      email: "",
      password: "",
      levodopaHoraInicio: "08:00",
      levodopaIntervaloHoras: 6,
      activarNotificaciones: true,
    };

    // Navegar a home después de 2 segundos
    setTimeout(() => {
      router.push("/home");
    }, 2000);
  }
}

/**
 * Al montar: inicializar autenticación
 * - Si hay token: intentar biométrico automáticamente después de 1s
 * - Si no: mostrar formulario
 */
onMounted(async () => {
  authState.value = await auth.initializeAuth();

  isNativeDevice.value = Capacitor.isNativePlatform();

  if (isNativeDevice.value) {
    biometricAvailable.value = await auth.checkBiometricAvailability();
  }

  if (isNativeDevice.value && authState.value.hasToken && authState.value.showBiometric && biometricAvailable.value) {
    setTimeout(() => {
      handleBiometricLogin();
    }, 1000);
  }
});
</script>

<style scoped>
/* Estilos globales para login */
input:disabled {
  @apply bg-gray-50 cursor-not-allowed;
}

button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

/* Animación de spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
