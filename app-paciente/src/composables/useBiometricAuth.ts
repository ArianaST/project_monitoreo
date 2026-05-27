import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryType,
} from '@aparajita/capacitor-biometric-auth'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { computed, ref } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

// ============================================================
// COMPOSABLE: Autenticación biométrica + Email
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
console.log('[PaTITO] BACKEND_URL:', BACKEND_URL)

const TOKEN_KEY = 'auth_token'
const USER_NAME_KEY = 'user_name'
const USER_EMAIL_KEY = 'user_email'
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled'
const BIOMETRIC_ATTEMPTS_KEY = 'biometric_attempts'
const MAX_BIOMETRIC_ATTEMPTS = 2

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i

interface AuthUser {
  id?: string
  nombre?: string
  email?: string
  rol?: string
  levodopaIntervaloHoras?: number | string | null
  levodopaHoraInicio?: string | null
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return EMAIL_REGEX.test(normalizeEmail(email))
}

function getFriendlyBiometricError(err: unknown) {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: unknown }).code) : ''

  if (code === 'biometryNotEnrolled') {
    return 'No tienes huella o rostro configurado en Android. Configúralo en Seguridad y vuelve a intentar.'
  }

  if (code === 'passcodeNotSet' || code === 'noDeviceCredential') {
    return 'Tu dispositivo no tiene PIN, patrón, contraseña, huella o rostro configurado.'
  }

  if (code === 'userCancel' || code === 'appCancel') {
    return 'Autenticación cancelada.'
  }

  if (code === 'biometryLockout') {
    return 'Biometría bloqueada por varios intentos. Desbloquea el dispositivo con PIN o contraseña.'
  }

  if (code === 'biometryNotAvailable') {
    return 'La biometría no está disponible en este dispositivo.'
  }

  return 'No se pudo verificar tu identidad. Usa correo y contraseña o intenta de nuevo.'
}

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
    await Preferences.set({ key: TOKEN_KEY, value: token })
  }

  const removeToken = async () => {
    await Preferences.remove({ key: TOKEN_KEY })
  }

  const saveUserSession = async (usuario?: AuthUser) => {
    if (!usuario) return

    if (usuario.nombre) {
      sessionStore.setPatientName(usuario.nombre)
      await Preferences.set({ key: USER_NAME_KEY, value: usuario.nombre })
    }

    if (usuario.email) {
      await Preferences.set({ key: USER_EMAIL_KEY, value: usuario.email })
    }
  }

  const loadSavedUserSession = async () => {
    const [nameResult, emailResult] = await Promise.all([
      Preferences.get({ key: USER_NAME_KEY }),
      Preferences.get({ key: USER_EMAIL_KEY }),
    ])

    if (nameResult.value) {
      sessionStore.setPatientName(nameResult.value)
    }

    return {
      nombre: nameResult.value || 'Paciente',
      email: emailResult.value || '',
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

  const setBiometricEnabled = async (enabled: boolean) => {
    await Preferences.set({
      key: BIOMETRIC_ENABLED_KEY,
      value: enabled ? 'true' : 'false',
    })
  }

  const getBiometricEnabled = async () => {
    const result = await Preferences.get({ key: BIOMETRIC_ENABLED_KEY })
    return result.value === 'true'
  }

  const deviceCanUseBiometricOrCredential = async () => {
    if (!Capacitor.isNativePlatform()) return false

    try {
      const available = await BiometricAuth.checkBiometry()

      return Boolean(
        available.isAvailable ||
          available.deviceIsSecure ||
          available.biometryType !== BiometryType.none ||
          available.biometryTypes.length > 0
      )
    } catch (error) {
      console.warn('[PaTITO] No se pudo consultar biometría:', error)
      return false
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

  const verifyStoredTokenIfPossible = async (token: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        await removeToken()
        await setBiometricEnabled(false)
        return false
      }

      const data = await response.json()
      const usuario = data.usuario as AuthUser | undefined

      if (usuario) {
        await saveUserSession(usuario)
      }

      return true
    } catch (error) {
      // Si no hay red, no bloqueamos la entrada biométrica: el token local sigue existiendo.
      console.warn('[PaTITO] No se pudo verificar token en backend; se usará sesión local:', error)
      return true
    }
  }

  // ========================================
  // MÉTODOS PÚBLICOS
  // ========================================

  async function checkBiometricAvailability(): Promise<boolean> {
    return deviceCanUseBiometricOrCredential()
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
        errorMessage.value = 'No hay sesión guardada. Inicia sesión una vez con correo y contraseña.'
        showBiometricForm.value = true
        isLoading.value = false
        return false
      }

      if (!Capacitor.isNativePlatform()) {
        errorMessage.value = 'El acceso biométrico solo está disponible en la app instalada.'
        showBiometricForm.value = true
        isLoading.value = false
        return false
      }

      const canUseDeviceAuth = await deviceCanUseBiometricOrCredential()
      if (!canUseDeviceAuth) {
        errorMessage.value = 'Configura huella, rostro, PIN o patrón en Android para usar acceso rápido.'
        showBiometricForm.value = true
        isLoading.value = false
        return false
      }

      await BiometricAuth.authenticate({
        reason: 'Verifica tu identidad para acceder a PaTITO',
        androidTitle: 'Entrar a PaTITO',
        androidSubtitle: 'Usa huella, rostro, PIN o patrón del dispositivo',
        androidBiometryStrength: AndroidBiometryStrength.weak,
        androidConfirmationRequired: false,
        allowDeviceCredential: true,
        cancelTitle: 'Usar correo',
      })

      const tokenOk = await verifyStoredTokenIfPossible(token)
      if (!tokenOk) {
        errorMessage.value = 'Tu sesión expiró. Inicia sesión con correo y contraseña.'
        showBiometricForm.value = true
        isLoading.value = false
        return false
      }

      await resetBiometricAttempts()
      await setBiometricEnabled(true)
      await loadSavedUserSession()

      showBiometricForm.value = false
      isLoading.value = false
      return true
    } catch (err) {
      console.error('[PaTITO] Biometric error:', err)

      await incrementBiometricAttempts()

      errorMessage.value = getFriendlyBiometricError(err)
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

      const normalizedEmail = normalizeEmail(email)

      if (!normalizedEmail || !password) {
        errorMessage.value = 'Email y contraseña son requeridos'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      if (!isValidEmail(normalizedEmail)) {
        errorMessage.value = 'Ingresa un correo válido, por ejemplo nombre@dominio.com'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
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
      const usuario = data.usuario as AuthUser | undefined

      await saveToken(data.token)
      await saveUserSession(usuario)

      const intervalo = Number(usuario?.levodopaIntervaloHoras ?? 6)
      const horaInicio = usuario?.levodopaHoraInicio ?? '08:00'

      await applyMedicationConfigLocally(intervalo, horaInicio)

      await resetBiometricAttempts()

      const canUseDeviceAuth = await deviceCanUseBiometricOrCredential()
      await setBiometricEnabled(canUseDeviceAuth)
      showBiometricForm.value = false

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

      const normalizedEmail = normalizeEmail(email)

      if (!nombre || !normalizedEmail || !password) {
        errorMessage.value = 'Todos los campos son requeridos'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      if (!isValidEmail(normalizedEmail)) {
        errorMessage.value = 'Ingresa un correo válido, por ejemplo nombre@dominio.com'
        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      if (password.length < 6) {
        errorMessage.value = 'La contraseña debe tener al menos 6 caracteres'
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
          nombre: nombre.trim(),
          email: normalizedEmail,
          password,
          levodopaIntervaloHoras: intervalo,
          levodopaHoraInicio,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        console.error('REGISTER RESPONSE ERROR:', data)

        errorMessage.value =
          data.error || 'No se pudo crear la cuenta'

        clearErrorAfterDelay()
        isLoading.value = false
        return false
      }

      const data = await response.json()
      const usuario = data.usuario as AuthUser | undefined

      await saveToken(data.token)
      await saveUserSession(usuario || { nombre: nombre.trim(), email: normalizedEmail })

      await applyMedicationConfigLocally(
        intervalo,
        levodopaHoraInicio
      )

      await resetBiometricAttempts()

      const canUseDeviceAuth = await deviceCanUseBiometricOrCredential()
      await setBiometricEnabled(canUseDeviceAuth)
      showBiometricForm.value = false

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
      showBiometricForm.value = true
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
      await loadSavedUserSession()

      const biometricEnabled = await getBiometricEnabled()
      const canUseDeviceAuth = await deviceCanUseBiometricOrCredential()

      const shouldShowBiometric =
        !!token &&
        Capacitor.isNativePlatform() &&
        biometricEnabled &&
        canUseDeviceAuth &&
        biometricAttempts.value < MAX_BIOMETRIC_ATTEMPTS

      showBiometricForm.value = !shouldShowBiometric

      return {
        hasToken: !!token,
        showBiometric: shouldShowBiometric,
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
