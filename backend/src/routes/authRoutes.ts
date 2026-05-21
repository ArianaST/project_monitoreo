import { Router, Request, Response } from 'express'
import { AuthService } from '../services/AuthService'

/**
 * Crea las rutas de autenticación.
 */
export function createAuthRoutes(service: AuthService): Router {
  const router = Router()

  /**
   * POST /api/auth/register
   * Body: { nombre, email, password, levodopaIntervaloHoras, levodopaHoraInicio }
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const {
        nombre,
        email,
        password,
        levodopaIntervaloHoras = 6,
        levodopaHoraInicio = '08:00',
      } = req.body

      if (!nombre || !email || !password) {
        return res.status(400).json({
          error: 'Nombre, email y contraseña son requeridos',
        })
      }

      const intervalo = Number(levodopaIntervaloHoras)
      if (!Number.isFinite(intervalo) || intervalo < 1 || intervalo > 24) {
        return res.status(400).json({
          error: 'levodopaIntervaloHoras debe estar entre 1 y 24',
        })
      }

      const resultado = await service.register(
        nombre,
        email,
        password,
        intervalo,
        levodopaHoraInicio
      )

      if ('error' in resultado) {
        const status = resultado.error.includes('ya está registrado') ? 409 : 500

        return res.status(status).json({
          error: resultado.error,
        })
      }

      return res.status(201).json(resultado)
    } catch (err) {
      return res.status(500).json({
        error: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
      })
    }
  })

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email y contraseña son requeridos',
        })
      }

      const resultado = await service.login(email, password)

      if ('error' in resultado) {
        return res.status(401).json(resultado)
      }

      return res.status(200).json(resultado)
    } catch (err) {
      return res.status(500).json({
        error: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
      })
    }
  })


  function getTokenPayload(req: Request, res: Response) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token no proporcionado' })
      return null
    }

    const token = authHeader.substring(7)
    const resultado = service.verifyToken(token)
    if ('error' in resultado) {
      res.status(401).json(resultado)
      return null
    }

    return resultado
  }

  /**
   * GET /api/auth/me
   * Devuelve perfil completo del usuario autenticado.
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const payload = getTokenPayload(req, res)
      if (!payload) return

      const usuario = await service.getProfile(payload.id)
      if ('error' in usuario) return res.status(404).json(usuario)

      return res.status(200).json({ usuario })
    } catch (err) {
      return res.status(500).json({
        error: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
      })
    }
  })

  /**
   * PUT /api/auth/me/medicacion
   * Body: { levodopaIntervaloHoras, levodopaHoraInicio }
   */
  router.put('/me/medicacion', async (req: Request, res: Response) => {
    try {
      const payload = getTokenPayload(req, res)
      if (!payload) return

      const intervalo = Number(req.body.levodopaIntervaloHoras)
      const horaInicio = req.body.levodopaHoraInicio

      if (!Number.isFinite(intervalo) || intervalo < 1 || intervalo > 24 || !horaInicio) {
        return res.status(400).json({
          error: 'levodopaIntervaloHoras debe estar entre 1 y 24 y levodopaHoraInicio es requerido',
        })
      }

      const usuario = await service.updateMedicationSchedule(payload.id, intervalo, horaInicio)
      if ('error' in usuario) return res.status(400).json(usuario)

      return res.status(200).json({ usuario })
    } catch (err) {
      return res.status(500).json({
        error: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
      })
    }
  })

  /**
   * GET /api/auth/verify
   * Header: Authorization: Bearer <token>
   */
  router.get('/verify', (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Token no proporcionado',
        })
      }

      const token = authHeader.substring(7)
      const resultado = service.verifyToken(token)

      if ('error' in resultado) {
        return res.status(401).json(resultado)
      }

      return res.status(200).json({
        valid: true,
        usuario: resultado,
      })
    } catch (err) {
      return res.status(500).json({
        error: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
      })
    }
  })

  return router
}