import { Router, Request, Response } from 'express'
import { SesionService } from '../services/SesionService'

/**
 * Crea las rutas de sesiones de medicación.
 * Requiere una instancia de SesionService inyectada.
 */
export function createSesionRoutes(service: SesionService): Router {
  const router = Router()

  /**
   * POST /api/sesiones/estado
   * Registra cualquier cambio de estado ON/OFF.
   * Body: { pacienteId, estado: 'ON'|'OFF', timestamp?: string }
   */
  router.post('/estado', async (req: Request, res: Response) => {
    try {
      const { pacienteId, estado, timestamp, tipoEvento, horaProgramada } = req.body

      console.log('📍 POST /estado recibido:', { pacienteId, estado, timestamp, tipoEvento, horaProgramada })

      if (!pacienteId) {
        return res.status(400).json({
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        })
      }

      if (estado !== 'ON' && estado !== 'OFF') {
        return res.status(400).json({
          error: {
            code: 'ESTADO_INVALIDO',
            message: "estado debe ser 'ON' u 'OFF'",
          },
        })
      }

      const resultado = await service.registrarEstado(
        pacienteId,
        estado,
        timestamp,
        tipoEvento,
        horaProgramada
      )

      console.log('📊 Resultado de registrarEstado:', resultado)

      if ('error' in resultado) {
        console.error('❌ Error en servicio:', resultado.error)
        return res.status(400).json(resultado)
      }

      return res.status(201).json(resultado)
    } catch (err) {
      console.error('❌ Error en POST /estado:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })

  /**
   * POST /api/sesiones/iniciar
   * Compatibilidad: registra un cambio a ON.
   * Body: { pacienteId }
   */
  router.post('/iniciar', async (req: Request, res: Response) => {
    try {
      const { pacienteId } = req.body

      console.log('📍 POST /iniciar recibido con pacienteId:', pacienteId)

      if (!pacienteId) {
        return res.status(400).json({
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        })
      }

      const resultado = await service.iniciarSesion(pacienteId)

      console.log('📊 Resultado de iniciarSesion:', resultado)

      if ('error' in resultado) {
        console.error('❌ Error en servicio:', resultado.error)
        return res.status(400).json(resultado)
      }

      return res.status(201).json(resultado)
    } catch (err) {
      console.error('❌ Error en POST /iniciar:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })

  /**
   * POST /api/sesiones/detener
   * Compatibilidad: registra un cambio a OFF.
   * Body: { pacienteId }
   */
  router.post('/detener', async (req: Request, res: Response) => {
    try {
      const { pacienteId } = req.body

      console.log('📍 POST /detener recibido con pacienteId:', pacienteId)

      if (!pacienteId) {
        return res.status(400).json({
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        })
      }

      const resultado = await service.detenerSesion(pacienteId)

      console.log('📊 Resultado de detenerSesion:', resultado)

      if ('error' in resultado) {
        console.error('❌ Error en servicio:', resultado.error)
        return res.status(400).json(resultado)
      }

      return res.status(200).json(resultado)
    } catch (err) {
      console.error('❌ Error en POST /detener:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })


  /**
   * POST /api/sesiones/actividad
   * Registra actividad clínica del flujo: síntomas o tapping.
   */
  router.post('/actividad', async (req: Request, res: Response) => {
    try {
      const resultado = await service.registrarActividad(req.body)

      if ('error' in resultado) {
        return res.status(400).json(resultado)
      }

      return res.status(201).json(resultado)
    } catch (err) {
      console.error('❌ Error en POST /actividad:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })


  /**
   * POST /api/sesiones/notificaciones/programacion
   * Guarda en BD la configuración local de recordatorios del paciente.
   */
  router.post('/notificaciones/programacion', async (req: Request, res: Response) => {
    try {
      const resultado = await service.registrarProgramacionNotificaciones(req.body)

      if ('error' in resultado) {
        return res.status(400).json(resultado)
      }

      return res.status(200).json(resultado)
    } catch (err) {
      console.error('❌ Error en POST /notificaciones/programacion:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })

  /**
   * GET /api/sesiones/calendario/:pacienteId/:year/:month
   * Devuelve días con actividad para pintar el calendario.
   */
  router.get('/calendario/:pacienteId/:year/:month', async (req: Request, res: Response) => {
    try {
      const { pacienteId, year, month } = req.params
      const yearNumber = Number(year)
      const monthNumber = Number(month)

      const resultado = await service.obtenerCalendarioMes(pacienteId, yearNumber, monthNumber)

      if ('error' in resultado) {
        return res.status(400).json(resultado)
      }

      return res.status(200).json(resultado)
    } catch (err) {
      console.error('❌ Error en GET /calendario:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })

  /**
   * GET /api/sesiones/resumen/:pacienteId/:fecha
   * Obtiene el resumen de sesiones de un día específico.
   * Parámetros:
   *   - pacienteId: ID del paciente
   *   - fecha: Fecha en formato YYYY-MM-DD
   */
  router.get('/resumen/:pacienteId/:fecha', async (req: Request, res: Response) => {
    try {
      const { pacienteId, fecha } = req.params

      console.log('📍 GET /resumen recibido:', { pacienteId, fecha })

      if (!pacienteId || !fecha) {
        return res.status(400).json({
          error: {
            code: 'FALTA_PARAMETROS',
            message: 'pacienteId y fecha (YYYY-MM-DD) son requeridos',
          },
        })
      }

      let fechaObj: Date
      try {
        fechaObj = new Date(fecha)
        if (Number.isNaN(fechaObj.getTime())) {
          throw new Error('Fecha inválida')
        }
      } catch (err) {
        console.error('❌ Error parseando fecha:', err)
        return res.status(400).json({
          error: {
            code: 'FECHA_INVALIDA',
            message: 'Fecha debe estar en formato YYYY-MM-DD',
          },
        })
      }

      const resultado = await service.obtenerResumenDia(pacienteId, fechaObj)

      console.log('📊 Resultado de obtenerResumenDia:', resultado)

      if ('error' in resultado) {
        console.error('❌ Error en servicio:', resultado.error)
        return res.status(400).json(resultado)
      }

      return res.status(200).json(resultado)
    } catch (err) {
      console.error('❌ Error en GET /resumen:', err)
      return res.status(500).json({
        error: {
          code: 'ERROR_SERVIDOR',
          message: `Error en servidor: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      })
    }
  })

  return router
}