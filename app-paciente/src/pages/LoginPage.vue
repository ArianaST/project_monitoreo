<template>
  <div class="h-screen flex flex-col bg-white">
    <!-- ========================================
         PARTE SUPERIOR: Gradiente con branding
         ======================================== -->
    <div
      class="bg-gradient-to-b from-primary to-danger flex-shrink-0 flex flex-col items-center justify-center px-6 py-8"
    >
      <!-- Logo PaTITO -->
      <div
        class="mb-3 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 p-3 shadow-xl ring-1 ring-white/60"
      >
        <img
          :src="patitoLogo"
          alt="Logo PaTITO"
          class="h-full w-full object-contain"
        />
      </div>

      <h1 class="text-2xl font-black text-white text-center mb-1 tracking-tight">
        PaTITO Móvil
      </h1>

      <p class="text-xs text-white text-opacity-80 text-center">
        Telemonitoreo de levodopa y síntomas
      </p>
    </div>

    <!-- ========================================
         PARTE INFERIOR
         ======================================== -->
    <div
      class="relative bg-white rounded-t-3xl flex-1 flex flex-col p-4 overflow-y-auto"
    >
      <!-- =====================================
           VISTA A: Modo Biométrico
           ===================================== -->
      <div
        v-if="!auth.showBiometricForm && authState.hasToken"
        class="flex flex-col justify-center h-full"
      >
        <h2 class="text-xl font-bold text-gray-900 text-center mb-3">
          Bienvenido/a de vuelta
        </h2>

        <p class="text-base text-gray-600 text-center mb-6">
          {{ sessionStore.patientName || "Paciente" }}
        </p>

        <div
          class="mb-5 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-center"
        >
          <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
            <FaceIcon class="h-9 w-9 text-primary" />
          </div>
          <p class="text-sm font-bold text-primary">
            Acceso rápido protegido
          </p>
          <p class="mt-1 text-xs leading-relaxed text-gray-600">
            Use huella, rostro, PIN o patrón del dispositivo para continuar.
          </p>
        </div>

        <button
          @click="handleBiometricLogin"
          :disabled="auth.isLoading"
          class="h-16 w-full rounded-2xl border-2 border-primary bg-white shadow-md hover:shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="text-base font-bold text-gray-900">
            {{ auth.isLoading ? "Verificando..." : "Entrar con biometría" }}
          </span>
        </button>

        <button
          @click="auth.showBiometricForm = true"
          class="text-sm text-primary font-bold hover:underline text-center"
        >
          Entrar con correo y contraseña
        </button>
      </div>

      <!-- =====================================
           VISTA B: Formularios
           ===================================== -->
      <div v-else class="flex flex-col justify-start h-full">
        <!-- Spinner de carga global -->
        <div
          v-if="auth.isLoading"
          class="absolute inset-0 z-20 bg-black bg-opacity-10 flex items-center justify-center rounded-t-3xl"
        >
          <div class="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-4 shadow-lg">
            <div
              class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="text-sm text-gray-600">Verificando identidad...</p>
          </div>
        </div>

        <!-- Mensaje de error -->
        <div
          v-if="auth.errorMessage"
          class="mb-3 p-3 bg-red-100 border-l-4 border-red-500 rounded-lg"
        >
          <p class="text-xs text-red-700">{{ auth.errorMessage }}</p>
        </div>

        <!-- Mensaje de éxito registro -->
        <div
          v-if="successMessage"
          class="mb-3 p-3 bg-green-100 border-l-4 border-green-500 rounded-lg"
        >
          <p class="text-xs text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Pestañas limpias -->
        <div class="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
          <button
            type="button"
            @click="irAInicioSesion"
            :class="[
              'rounded-xl px-3 py-3 text-sm font-bold transition-all',
              currentTab === 'login'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500',
            ]"
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            @click="irARegistro"
            :class="[
              'rounded-xl px-3 py-3 text-sm font-bold transition-all',
              currentTab === 'register'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500',
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
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <FaceIcon class="h-6 w-6 text-primary" />
            </div>
            <div class="flex-1">
              <p class="text-xs font-bold text-primary">
                {{
                  biometricAvailable
                    ? "Biometría o bloqueo del dispositivo disponible"
                    : "La biometría se activará si el dispositivo lo permite"
                }}
              </p>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              v-model.trim="loginForm.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="tu@email.com"
              class="h-11 w-full px-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              :class="loginForm.email && !isLoginEmailValid ? 'border-red-400 bg-red-50' : ''"
              :disabled="auth.isLoading"
            />
            <p
              v-if="loginForm.email && !isLoginEmailValid"
              class="mt-1 text-[11px] text-red-600"
            >
              Escriba un correo válido, por ejemplo: nombre@correo.com
            </p>
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div class="relative h-11">
              <input
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="Tu contraseña"
                class="h-11 w-full px-3 pr-10 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                :disabled="auth.isLoading"
              />
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
            :disabled="auth.isLoading || !isLoginFormValid"
            class="h-12 w-full mt-2 bg-primary text-white rounded-2xl text-base font-bold hover:bg-danger transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
          >
            Entrar
          </button>

          <!-- CTA Registro -->
          <div
            class="mt-5 rounded-3xl border border-orange-100 bg-orange-50/80 p-4 text-center shadow-sm"
          >
            <p class="text-base font-bold text-[#7C2D12]">
              ¿Es la primera vez que usa PaTITO Móvil?
            </p>

            <button
              type="button"
              class="mt-4 w-full rounded-2xl bg-[#840705] px-5 py-4 text-base font-bold text-white shadow-md active:scale-[0.98]"
              @click="irARegistro"
            >
              Soy nuevo, quiero registrarme
            </button>
          </div>
        </div>

        <!-- ====== PESTAÑA REGISTRO ====== -->
        <div v-else class="flex-1 flex flex-col gap-3">
          <div class="rounded-2xl border border-orange-100 bg-orange-50 p-3">
            <p class="text-sm font-bold text-[#7C2D12]">
              Crear cuenta de paciente
            </p>
          </div>

          <!-- Nombre -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Tu nombre
            </label>
            <input
              v-model.trim="registerForm.nombre"
              type="text"
              autocomplete="name"
              placeholder="Juan Pérez"
              class="h-11 w-full px-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              :disabled="auth.isLoading"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              v-model.trim="registerForm.email"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="tu@email.com"
              class="h-11 w-full px-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              :class="registerForm.email && !isRegisterEmailValid ? 'border-red-400 bg-red-50' : ''"
              :disabled="auth.isLoading"
            />
            <p
              v-if="registerForm.email && !isRegisterEmailValid"
              class="mt-1 text-[11px] text-red-600"
            >
              Debe contener @ y dominio. Ejemplo: nombre@correo.com
            </p>
          </div>

          <!-- Contraseña -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div class="relative h-11">
              <input
                v-model="registerForm.password"
                :type="showRegisterPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Tu contraseña"
                class="h-11 w-full px-3 pr-10 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                :class="registerForm.password && registerForm.password.length < 6 ? 'border-red-400 bg-red-50' : ''"
                :disabled="auth.isLoading"
              />
              <button
                @click="showRegisterPassword = !showRegisterPassword"
                type="button"
                class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Eye v-if="showRegisterPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
            <p
              v-if="registerForm.password && registerForm.password.length < 6"
              class="mt-1 text-[11px] text-red-600"
            >
              Use al menos 6 caracteres.
            </p>
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
                class="h-11 w-full px-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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
                class="h-11 w-full px-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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

          <label
            class="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3"
          >
            <input
              v-model="registerForm.activarNotificaciones"
              type="checkbox"
              class="mt-1 h-4 w-4 rounded border-emerald-300 text-primary focus:ring-primary"
              :disabled="auth.isLoading"
            />
            <span class="text-xs text-emerald-800">
              Activar recordatorios de PaTITO cada 2 horas y según mi horario
              de levodopa.
            </span>
          </label>

          <div
            v-if="isNativeDevice"
            class="rounded-xl border border-rose-100 bg-white p-3 shadow-sm"
          >
            <p class="text-xs font-bold text-primary">
              {{
                biometricAvailable
                  ? "Acceso biométrico preparado"
                  : "Acceso protegido pendiente"
              }}
            </p>
            <p class="mt-1 text-[11px] leading-snug text-gray-600">
              {{
                biometricAvailable
                  ? "Al crear su cuenta se guardará la sesión para entrar después con huella, rostro, PIN o patrón."
                  : "Puede crear su cuenta ahora. Si Android tiene bloqueo de pantalla, PaTITO intentará usarlo en el siguiente acceso."
              }}
            </p>
          </div>

          <!-- Botón Crear cuenta -->
          <button
            @click="handleRegister"
            :disabled="auth.isLoading || !isRegisterFormValid"
            class="h-12 w-full mt-2 bg-secondary text-white rounded-2xl text-base font-bold hover:bg-warning transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
          >
            Crear cuenta
          </button>

          <!-- CTA Login -->
          <div
            class="mt-4 rounded-3xl border border-[#E8D8C3] bg-white/80 p-4 text-center shadow-sm"
          >
            <p class="text-base font-bold text-[#7C2D12]">
              ¿Ya tiene una cuenta?
            </p>


            <button
              type="button"
              class="mt-4 w-full rounded-2xl border-2 border-[#840705] bg-white px-5 py-4 text-base font-bold text-[#840705] active:scale-[0.98]"
              @click="irAInicioSesion"
            >
              Ya tengo cuenta, iniciar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from "@capacitor/core";
import { Eye, EyeOff } from "lucide-vue-next";
import { computed, h, onMounted, proxyRefs, ref } from "vue";
import { useRouter } from "vue-router";
import { useBiometricAuth } from "../composables/useBiometricAuth";
import patitoLogo from "../assets/PATITO_sn.png";
import { useSessionStore } from "../stores/sessionStore";

const router = useRouter();
const auth = proxyRefs(useBiometricAuth());
const sessionStore = useSessionStore();

const currentTab = ref<"login" | "register">("login");
const authState = ref({ hasToken: false, showBiometric: false });
const successMessage = ref("");
const isNativeDevice = ref(false);
const biometricAvailable = ref(false);

const loginForm = ref({
  email: "",
  password: "",
});
const showLoginPassword = ref(false);

const registerForm = ref({
  nombre: "",
  email: "",
  password: "",
  levodopaHoraInicio: "08:00",
  levodopaIntervaloHoras: 6,
  activarNotificaciones: true,
});
const showRegisterPassword = ref(false);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isLoginEmailValid = computed(() => {
  return emailRegex.test(loginForm.value.email.trim());
});

const isRegisterEmailValid = computed(() => {
  return emailRegex.test(registerForm.value.email.trim());
});

const isLoginFormValid = computed(() => {
  return Boolean(
    isLoginEmailValid.value &&
      loginForm.value.password.trim().length > 0,
  );
});

const isRegisterFormValid = computed(() => {
  const interval = Number(registerForm.value.levodopaIntervaloHoras);

  return Boolean(
    registerForm.value.nombre.trim().length >= 2 &&
      isRegisterEmailValid.value &&
      registerForm.value.password.length >= 6 &&
      registerForm.value.levodopaHoraInicio &&
      Number.isFinite(interval) &&
      interval >= 1 &&
      interval <= 24,
  );
});

const levodopaPreviewHours = computed(() => {
  const interval = Number(registerForm.value.levodopaIntervaloHoras);
  const safeInterval =
    Number.isFinite(interval) && interval >= 1 && interval <= 24
      ? Math.round(interval)
      : 6;

  const [hoursRaw, minutesRaw] = registerForm.value.levodopaHoraInicio
    .split(":")
    .map(Number);

  const base = new Date();
  base.setHours(
    Number.isFinite(hoursRaw) ? hoursRaw : 8,
    Number.isFinite(minutesRaw) ? minutesRaw : 0,
    0,
    0,
  );

  const labels: string[] = [];
  const end = new Date(base);
  end.setHours(24, 0, 0, 0);

  let cursor = new Date(base);

  while (cursor < end && labels.length < 8) {
    labels.push(
      new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(cursor),
    );

    cursor = new Date(cursor.getTime() + safeInterval * 60 * 60 * 1000);
  }

  return labels;
});

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

const limpiarMensajes = () => {
  successMessage.value = "";
  auth.errorMessage = "";
};

const irARegistro = () => {
  currentTab.value = "register";
  limpiarMensajes();

  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 80);
};

const irAInicioSesion = () => {
  currentTab.value = "login";
  limpiarMensajes();

  setTimeout(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, 80);
};

async function handleBiometricLogin() {
  const success = await auth.loginWithBiometric();

  if (success) {
    setTimeout(() => {
      router.push("/home");
    }, 300);
  }
}

async function handleLogin() {
  limpiarMensajes();

  if (!isLoginEmailValid.value) {
    auth.errorMessage = "Escriba un correo válido. Ejemplo: nombre@correo.com";
    return;
  }

  const success = await auth.loginWithEmail(
    loginForm.value.email.trim(),
    loginForm.value.password,
  );

  if (success) {
    loginForm.value = {
      email: "",
      password: "",
    };

    setTimeout(() => {
      router.push("/home");
    }, 300);
  }
}

async function handleRegister() {
  limpiarMensajes();

  if (!isRegisterEmailValid.value) {
    auth.errorMessage = "El correo debe tener formato válido. Ejemplo: nombre@correo.com";
    return;
  }

  if (registerForm.value.password.length < 6) {
    auth.errorMessage = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  const success = await auth.register(
    registerForm.value.nombre.trim(),
    registerForm.value.email.trim(),
    registerForm.value.password,
    Number(registerForm.value.levodopaIntervaloHoras),
    registerForm.value.levodopaHoraInicio,
  );

  if (success) {
    const shouldEnableNotifications = registerForm.value.activarNotificaciones;
    const nombre = registerForm.value.nombre.trim();

    if (shouldEnableNotifications) {
      try {
        await sessionStore.setMedicationNotificationsEnabled(true);
      } catch {
        // sessionStore maneja su propio error.
      }
    }

    successMessage.value = `¡Bienvenido/a ${nombre}!`;

    registerForm.value = {
      nombre: "",
      email: "",
      password: "",
      levodopaHoraInicio: "08:00",
      levodopaIntervaloHoras: 6,
      activarNotificaciones: true,
    };

    setTimeout(() => {
      router.push("/home");
    }, 2000);
  }
}

onMounted(async () => {
  authState.value = await auth.initializeAuth();

  isNativeDevice.value = Capacitor.isNativePlatform();

  if (isNativeDevice.value) {
    biometricAvailable.value = await auth.checkBiometricAvailability();
  }

  if (
    isNativeDevice.value &&
    authState.value.hasToken &&
    authState.value.showBiometric
  ) {
    setTimeout(() => {
      handleBiometricLogin();
    }, 1000);
  }
});
</script>

<style scoped>
input:disabled {
  @apply bg-gray-50 cursor-not-allowed;
}

button:disabled {
  @apply opacity-50 cursor-not-allowed;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>