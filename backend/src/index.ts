import express, { Request, Response } from 'express'
import cors from 'cors'

import pool, { query } from './shared/database'
import { SesionRepository } from './repositories/SesionRepository'
import { UsuarioRepository } from './repositories/UsuarioRepository'
import { SesionService } from './services/SesionService'
import { AuthService } from './services/AuthService'
import { createAuthRoutes } from './routes/authRoutes'
import { createSesionRoutes } from './routes/sesionRoutes'

const app = express()
const PORT = Number(process.env.PORT) || 3000

// ========================================
// MIDDLEWARE
// ========================================

// CORS - Permitir requests desde app frontend
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.options('*', cors({
  origin: true,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use((req, _res, next) => {
  console.log('📲 REQUEST RECIBIDO:', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent'],
    body: req.method === 'GET' || req.method === 'OPTIONS' ? undefined : req.body,
  })

  next()
})

// JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ========================================
// INYECCIÓN DE DEPENDENCIAS
// ========================================

// Repositorios
const sesionRepository = new SesionRepository(pool)
const usuarioRepository = new UsuarioRepository(pool)

// Servicios
const sesionService = new SesionService(sesionRepository)
const authService = new AuthService(usuarioRepository)

// ========================================
// RUTAS
// ========================================

// Rutas de autenticación
app.use('/api/auth', createAuthRoutes(authService))

// Rutas de sesiones
app.use('/api/sesiones', createSesionRoutes(sesionService))

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const db = await pool.query('SELECT NOW() as now')

    res.json({
      status: 'OK',
      db: 'connected',
      now: db.rows[0].now,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    })
  } catch (err) {
    console.error('❌ Health DB error:', err)

    res.status(500).json({
      status: 'ERROR',
      db: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    })
  }
})

// ========================================
// ERROR HANDLING
// ========================================

// 404 - Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
  })
})

// ========================================
// INICIAR SERVIDOR
// ========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ Servidor corriendo en puerto ${PORT}                    ║
║                                                         ║
║   📍 Endpoints disponibles:                               ║
║      • POST   /api/auth/register    (Registrar usuario)  ║
║      • POST   /api/auth/login       (Iniciar sesión)    ║
║      • GET    /api/auth/verify      (Verificar token)   ║
║      • POST   /api/sesiones/estado  (Registrar ON/OFF) ║
║      • POST   /api/sesiones/iniciar (Compat: ON)       ║
║      • POST   /api/sesiones/detener (Compat: OFF)      ║
║      • GET    /api/sesiones/resumen (Resumen del día)  ║
║      • GET    /api/health           (Estado del servidor)║
║                                                         ║
║   📦 Base de datos: PostgreSQL/Supabase               ║
║   🔐 Autenticación: JWT                                    ║
╚════════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...')
  process.exit(0)
})
