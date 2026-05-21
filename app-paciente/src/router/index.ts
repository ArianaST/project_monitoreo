import { Preferences } from '@capacitor/preferences'
import { createRouter, createWebHistory, NavigationGuardNext, RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
import HomePage from '../pages/HomePage.vue'
import LoginPage from '../pages/LoginPage.vue'

// Clave para el token en Preferences
const TOKEN_KEY = 'auth_token'

/**
 * Guard que verifica si el usuario está autenticado
 * Si no tiene token, redirige a login
 */
async function requireAuth(
  _to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
): Promise<void> {
  try {
    const { value: token } = await Preferences.get({ key: TOKEN_KEY })

    if (token) {
      // Tiene token, puede acceder
      next()
    } else {
      // No tiene token, redirige a login
      next('/login')
    }
  } catch (err) {
    console.error('Auth guard error:', err)
    next('/login')
  }
}

const routes: RouteRecordRaw[] = [
  // =====================================
  // Ruta raíz: redirige a /login
  // =====================================
  {
    path: '/',
    redirect: '/login',
  },

  // =====================================
  // Ruta LOGIN: pública (sin autenticación)
  // =====================================
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
  },

  // =====================================
  // Ruta HOME: privada (requiere autenticación)
  // =====================================
  {
    path: '/home',
    name: 'home',
    component: HomePage,
    beforeEnter: requireAuth,
  },

  // =====================================
  // Rutas protegidas de navegación
  // =====================================
  {
    path: '/inicio',
    name: 'inicio',
    component: HomePage,
    beforeEnter: requireAuth,
  },
  {
    path: '/registro',
    name: 'registro',
    component: () => import('../pages/RegistroPage.vue'),
    beforeEnter: requireAuth,
  },
  {
    path: '/historial',
    name: 'historial',
    component: () => import('../pages/HistorialPage.vue'),
    beforeEnter: requireAuth,
  },
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import('../pages/PerfilPage.vue'),
    beforeEnter: requireAuth,
  },

  // =====================================
  // Ruta 404: no encontrada
  // =====================================
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
