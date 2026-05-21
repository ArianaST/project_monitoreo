import { BiometricAuth } from '@aparajita/capacitor-biometric-auth'
import { Preferences } from '@capacitor/preferences'
import { computed, ref } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

// ============================================================
// COMPOSABLE: Autenticación biométrica + Email
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
console.log('[PaTITO] BACKEND_URL:', BACKEND_URL)
const TOKEN_KEY = 'auth_token'
const BIOMETRIC_ATTEMPTS_KEY = 'biometric_attempts'
const MAX_BIOMETRIC_ATTEMPTS = 2

export function useBiometricAuth() {
  const sessionStore = useSessionStore()

  // ========================================
  // STATE
  // ========================================

  const isLoading = ref(false)
  const errorMessage = ref('')
  const biometricAttempts = ref(0)
  const showBiometricForm = ref(false)

  // ========================================
  // COMPUTED
  // ========================================

  const isAuthenticated = computed(async () => {
    try {
      const { value } = await Preferences.get({ key: TOKEN_KEY })
      return !!value
    } catch {
      return false
    }
  })

  // ========================================
  // MÉTODOS PRIVADOS
  // ========================================

  const clearErrorAfterDelay = (delayMs = 4000) => {
    setTimeout(() => {
      errorMessage.value = ''
    }, delayMs)
  }

  const getStoredToken = async (): Promise<string | null> => {
    try {
      const { value } = await Preferences.get({ key: TOKEN_KEY })
      return value
    } catch {
      return null
    }
  }

  const saveToken = async (token: string) => {
    try {
      await Preferences.set({ key: TOKEN_KEY, value: token })
    } catch (err) {
      console.error('Error saving token:', err)
    }
  }

  const removeToken = async () => {
    try {
      await Preferences.remove({ key: TOKEN_KEY })
    } catch (err) {
      console.error('Error removing token:', err)
    }
  }

  const incrementBiometricAttempts = async () => {
    biometricAttempts.value += 1

    try {
      await Preferences.set({
        key: BIOMETRIC_ATTEMPTS_KEY,
        value: biometricAttempts.value.toString(),
      })
    } catch (err) {
      console.error('Error saving biometric attempts:', err)
    }
  }

  const resetBiometricAttempts = async () => {
    biometricAttempts.value = 0

    try {
      await Preferences.remove({ key: BIOMETRIC_ATTEMPTS_KEY })
    } catch (err) {
      console.error('Error resetting biometric attempts:', err)
    }
  }

  const loadBiometricAttempts = async () => {
    try {
      const { value } = await Preferences.get({
        key: BIOMETRIC_ATTEMPTS_KEY,
      })

      biometricAttempts.value = value ? parseInt(value, 10) : 0
    } catch (err) {
      console.error('Error loading biometric attempts:', err)
      biometricAttempts.value = 0
    }
  }

  const applyMedicationConfigLocally = async (
    intervaloHoras: number,
    horaInicio: string
  ) => {
    const storeConHorario = sessionStore as typeof sessionStore & {
      applyUserMedicationConfig?: (usuario?: {
        levodopaIntervaloHoras?: number | string | null
        levodopaHoraInicio?: string | null
      }) => Promise<void> | void
      saveLevodopaSchedule?: (
        intervaloHoras: number,
        horaInicio: string
      ) => Promise<void> | void
    }

    if (storeConHorario.applyUserMedicationConfig) {
      await storeConHorario.applyUserMedicationConfig({
        levodopaIntervaloHoras: intervaloHoras,
        levodopaHoraInicio: horaInicio,
      })
      return
    }

    if (storeConHorario.saveLevodopaSchedule) {
      await storeConHorario.saveLevodopaSchedule(intervaloHoras, horaInicio)
    }
  }

  // ========================================
  // MÉTODOS PÚBLICOS
  // ========================================

  async function checkBiometricAvailability(): Promise<boolean> {
    try {
      const available = await BiometricAuth.checkBiometry()
      return available.isAvailable
    } catch {
      return false
    }
  }

  async function loginWithBiometric(): Promise<boolean> {
    try {
      isLoading.value = true
      errorMessage.value = ''

      await loadBiometricAttempts()

      if (biometricAttempts.value >= MAX_BIOMETRIC_ATTEMPTS) {
        showBiometricForm.value = true
        errorMessage.value =
          'Demasiados intentos. Por favor, usa tu email y contraseña.'
        isLoading.value = false
        return false
      }

      const token = await getStoredToken()

      if (!token) {
        errorMessage.value = 'No hay sesión guardada. Por favor, inicia sesión.'
        isLoading.value = false
        return false
      }

      const available = await BiometricAuth.checkBiometry()

      if (!available.isAvailable) {
        showBiometricForm.value = true
        isLoading.value = false
        return false
      }

      await BiometricAuth.authenticate({
        reason: 'Verifica tu identidad para acceder a PaTITO',
        allowDeviceCredential: false,
      })

      await resetBiometricAttempts()

      sessionStore.setPatientName('Paciente')

      isLoading.value = false
      return true
    } catch (err) {
      console.error('Biometric error:', err)

      await incrementBiometricAttempts()

      errorMessage.value = 'No se reconoció tu rostro, intenta de nuevo'
      clearErrorAfterDelay()

      isLoading.value = false
      return false
    }
  }

  async function loginWithEmail(
    email: string,
    password: string
  ): Promise<boolean> {
    try {
      isLoading.value = true
      errorMessage.value = ''

      if (!email || !password) {
        errorMessage.value = 'Email y contraseña son requeridos'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          errorMessage.value = 'Correo o contraseña incorrectos'
        } else {
          errorMessage.value = 'No se pudo conectar, verifica tu internet'
        }

        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const data = await response.json()

      await saveToken(data.token)

      if (data.usuario?.nombre) {
        sessionStore.setPatientName(data.usuario.nombre)
      }

      const intervalo = Number(data.usuario?.levodopaIntervaloHoras ?? 6)
      const horaInicio = data.usuario?.levodopaHoraInicio ?? '08:00'

      await applyMedicationConfigLocally(intervalo, horaInicio)

      await resetBiometricAttempts()

      try {
        const available = await BiometricAuth.checkBiometry()

        if (available.isAvailable) {
          await Preferences.set({
            key: 'biometric_enabled',
            value: 'true',
          })
        }
      } catch {
        // Continuar aunque falle biometría
      }

      isLoading.value = false
      return true
    } catch (err) {
      console.error('[PaTITO] Login fetch error completo:', {
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: `${BACKEND_URL}/api/auth/login`,
      })

      errorMessage.value = 'No se pudo conectar, verifica tu internet'
      clearErrorAfterDelay()

      isLoading.value = false
      return false
    }
  }

  async function register(
    nombre: string,
    email: string,
    password: string,
    levodopaIntervaloHoras = 6,
    levodopaHoraInicio = '08:00'
  ): Promise<boolean> {
    try {
      isLoading.value = true
      errorMessage.value = ''

      if (!nombre || !email || !password) {
        errorMessage.value = 'Todos los campos son requeridos'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const intervalo = Number(levodopaIntervaloHoras)

      if (
        !Number.isFinite(intervalo) ||
        intervalo < 1 ||
        intervalo > 24 ||
        !levodopaHoraInicio
      ) {
        errorMessage.value = 'Configura un horario válido de levodopa'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          password,
          levodopaIntervaloHoras: intervalo,
          levodopaHoraInicio,
        }),
      })

      if (!response.ok) {
        const data = await response.json()

        console.error('REGISTER RESPONSE ERROR:', data)

        errorMessage.value =
          data.error || 'No se pudo crear la cuenta'

        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const data = await response.json()

      await saveToken(data.token)

      sessionStore.setPatientName(data.usuario?.nombre || nombre)

      await applyMedicationConfigLocally(
        intervalo,
        levodopaHoraInicio
      )

      await resetBiometricAttempts()

      try {
        const available = await BiometricAuth.checkBiometry()

        if (available.isAvailable) {
          await Preferences.set({
            key: 'biometric_enabled',
            value: 'true',
          })
        }
      } catch {
        // Continuar aunque falle biometría
      }

      isLoading.value = false
      return true
      } catch (err) {
      console.error('[PaTITO] Register fetch error completo:', {
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: `${BACKEND_URL}/api/auth/register`,
      })

      errorMessage.value = 'No se pudo conectar, verifica tu internet'
      clearErrorAfterDelay()

      isLoading.value = false
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await removeToken()
      await resetBiometricAttempts()

      sessionStore.setPatientName('')

      isLoading.value = false
      errorMessage.value = ''
      showBiometricForm.value = false
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  async function initializeAuth(): Promise<{
    hasToken: boolean
    showBiometric: boolean
  }> {
    try {
      await loadBiometricAttempts()

      if (biometricAttempts.value >= MAX_BIOMETRIC_ATTEMPTS) {
        showBiometricForm.value = true
      }

      const token = await getStoredToken()

      let biometricAvailable = false

      try {
        const available = await BiometricAuth.checkBiometry()
        biometricAvailable = available.isAvailable
      } catch {
        biometricAvailable = false
      }

      return {
        hasToken: !!token,
        showBiometric:
          !showBiometricForm.value &&
          !!token &&
          biometricAvailable,
      }
    } catch (err) {
      console.error('Initialize error:', err)

      return {
        hasToken: false,
        showBiometric: false,
      }
    }
  }

  return {
    // State
    isLoading,
    errorMessage,
    biometricAttempts,
    showBiometricForm,

    // Computed
    isAuthenticated,

    // Methods
    checkBiometricAvailability,
    loginWithBiometric,
    loginWithEmail,
    register,
    logout,
    initializeAuth,

    // Internal
    getStoredToken,
    saveToken,
    removeToken,
  }
}
