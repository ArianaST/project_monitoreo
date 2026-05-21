import {
  CalendarioDiaActividad,
  CrearActividadInput,
  EstadoSesion,
  EstadoSintomas,
  FaseActividad,
  RegistroActividad,
  Sesion,
  SesionRepository,
  TipoActividad,
  TipoEventoMedicacion,
} from '../repositories/SesionRepository'

export interface ResumenDia {
  totalOnSegundos: number
  totalOffSegundos: number
  totalEventos: number
  tiempoOnFormateado: string
  tiempoOffFormateado: string
  ultimoEstado: EstadoSesion | null
  horaUltimoEstado: string | null
  eventos: Array<{
    id: string
    estado: EstadoSesion
    horaInicio: string
    horaFin: string | null
    duracionSegundos: number | null
    tipoEvento: TipoEventoMedicacion
    horaProgramada: string | null
  }>
  actividades: Array<{
    id: string
    tipo: TipoActividad
    fase: FaseActividad
    horaRegistro: string
    estadoSintomas: EstadoSintomas | null
    sintomas: string[]
    taps: number | null
    estadoMedicacion: EstadoSesion | null
    metadata: Record<string, unknown> | null
  }>
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}

export class SesionService {
  constructor(private sesionRepository: SesionRepository) {}

  private normalizeTipoEvento(value?: string): TipoEventoMedicacion {
    if (
      value === 'toma_confirmada' ||
      value === 'toma_no_realizada' ||
      value === 'cambio_estado'
    ) {
      return value
    }

    return 'cambio_estado'
  }

  private normalizeTipoActividad(value?: string): TipoActividad | null {
    if (value === 'sintomas' || value === 'tapping' || value === 'acelerometro') return value
    return null
  }

  private normalizeFase(value?: string): FaseActividad | null {
    if (value === 'antes' || value === 'despues') return value
    return null
  }

  private normalizeEstadoSintomas(value?: string | null): EstadoSintomas | null {
    if (value === 'verde' || value === 'amarillo' || value === 'rojo') return value
    return null
  }

  private normalizeEstadoMedicacion(value?: string | null): EstadoSesion | null {
    if (value === 'ON' || value === 'OFF') return value
    return null
  }

  private parseOptionalDate(value?: string | null): Date | null {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  /**
   * Registra un cambio de estado del paciente.
   * ON significa “ya tomó levodopa”; OFF significa “todavía no la tomó”.
   */
  async registrarEstado(
    pacienteId: string,
    estado: EstadoSesion,
    timestamp?: string,
    tipoEventoRaw?: string,
    horaProgramadaRaw?: string | null
  ): Promise<any> {
    try {
      if (!pacienteId) {
        return {
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        } as ErrorResponse
      }

      const horaRegistro = timestamp ? new Date(timestamp) : new Date()
      if (Number.isNaN(horaRegistro.getTime())) {
        return {
          error: {
            code: 'TIMESTAMP_INVALIDO',
            message: 'timestamp debe ser una fecha ISO válida',
          },
        } as ErrorResponse
      }

      const tipoEvento = this.normalizeTipoEvento(tipoEventoRaw)
      const horaProgramada = this.parseOptionalDate(horaProgramadaRaw)

      const resultado = await this.sesionRepository.registrarCambioEstado(
        pacienteId,
        horaRegistro,
        horaRegistro,
        estado,
        tipoEvento,
        horaProgramada
      )

      const ultimaSesionCerrada = resultado.sesionesCerradas[resultado.sesionesCerradas.length - 1]

      return {
        success: true,
        sesion: {
          id: resultado.sesion.id,
          estado: resultado.sesion.estado,
          horaInicio: resultado.sesion.hora_inicio,
          tipoEvento: resultado.sesion.tipo_evento,
          horaProgramada: resultado.sesion.hora_programada,
        },
        sesionCerrada: ultimaSesionCerrada
          ? {
              id: ultimaSesionCerrada.id,
              estado: ultimaSesionCerrada.estado,
              horaInicio: ultimaSesionCerrada.hora_inicio,
              horaFin: ultimaSesionCerrada.hora_fin,
              duracion: ultimaSesionCerrada.duracion_segundos,
              duracionFormateada: this.formatearDuracion(
                ultimaSesionCerrada.duracion_segundos || 0
              ),
            }
          : null,
      }
    } catch (err) {
      console.error('❌ Error en registrarEstado:', err)
      return {
        error: {
          code: 'ERROR_REGISTRAR_ESTADO',
          message: `Error al registrar estado: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      } as ErrorResponse
    }
  }

  async iniciarSesion(pacienteId: string): Promise<any> {
    return this.registrarEstado(pacienteId, 'ON', undefined, 'toma_confirmada')
  }

  async detenerSesion(pacienteId: string): Promise<any> {
    return this.registrarEstado(pacienteId, 'OFF', undefined, 'toma_no_realizada')
  }

  async registrarActividad(input: {
    pacienteId?: string
    tipo?: string
    fase?: string
    timestamp?: string
    fechaLocal?: string
    estadoSintomas?: string | null
    sintomas?: string[]
    taps?: number | null
    estadoMedicacion?: string | null
    metadata?: Record<string, unknown> | null
  }): Promise<any> {
    try {
      if (!input.pacienteId) {
        return {
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        } as ErrorResponse
      }

      const tipo = this.normalizeTipoActividad(input.tipo)
      if (!tipo) {
        return {
          error: {
            code: 'TIPO_ACTIVIDAD_INVALIDO',
            message: "tipo debe ser 'sintomas', 'tapping' o 'acelerometro'",
          },
        } as ErrorResponse
      }

      const fase = this.normalizeFase(input.fase)
      if (!fase) {
        return {
          error: {
            code: 'FASE_INVALIDA',
            message: "fase debe ser 'antes' o 'despues'",
          },
        } as ErrorResponse
      }

      const horaRegistro = input.timestamp ? new Date(input.timestamp) : new Date()
      if (Number.isNaN(horaRegistro.getTime())) {
        return {
          error: {
            code: 'TIMESTAMP_INVALIDO',
            message: 'timestamp debe ser una fecha ISO válida',
          },
        } as ErrorResponse
      }

      const actividadInput: CrearActividadInput = {
        pacienteId: input.pacienteId,
        fecha: input.fechaLocal ? new Date(input.fechaLocal) : horaRegistro,
        tipo,
        fase,
        horaRegistro,
        estadoSintomas: this.normalizeEstadoSintomas(input.estadoSintomas),
        sintomas: Array.isArray(input.sintomas) ? input.sintomas : [],
        taps: Number.isFinite(Number(input.taps)) ? Number(input.taps) : null,
        estadoMedicacion: this.normalizeEstadoMedicacion(input.estadoMedicacion),
        metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
      }

      const actividad = await this.sesionRepository.createActividad(actividadInput)

      return {
        success: true,
        actividad: this.mapActividadToEvento(actividad),
      }
    } catch (err) {
      console.error('❌ Error en registrarActividad:', err)
      return {
        error: {
          code: 'ERROR_REGISTRAR_ACTIVIDAD',
          message: `Error al registrar actividad: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      } as ErrorResponse
    }
  }

  async obtenerResumenDia(pacienteId: string, fecha: Date): Promise<any> {
    try {
      const [sesiones, actividades] = await Promise.all([
        this.sesionRepository.getSesionesByPaciente(pacienteId, fecha),
        this.sesionRepository.getActividadesByPaciente(pacienteId, fecha),
      ])

      let totalOnSegundos = 0
      let totalOffSegundos = 0
      let ultimoEstado: EstadoSesion | null = null
      let horaUltimoEstado: string | null = null
      const ahora = new Date()

      sesiones.forEach((sesion) => {
        const duracion = sesion.hora_fin
          ? sesion.duracion_segundos || 0
          : Math.max(
              0,
              Math.floor(
                (ahora.getTime() - new Date(sesion.hora_inicio).getTime()) /
                  1000
              )
            )

        if (sesion.estado === 'ON') {
          totalOnSegundos += duracion
        } else {
          totalOffSegundos += duracion
        }
      })

      if (sesiones.length > 0) {
        ultimoEstado = sesiones[0].estado
        horaUltimoEstado = new Date(sesiones[0].hora_inicio).toISOString()
      }

      return {
        success: true,
        resumen: {
          totalOnSegundos,
          totalOffSegundos,
          totalEventos: sesiones.length,
          tiempoOnFormateado: this.formatearDuracion(totalOnSegundos),
          tiempoOffFormateado: this.formatearDuracion(totalOffSegundos),
          ultimoEstado,
          horaUltimoEstado,
          eventos: sesiones.map((sesion) => this.mapSesionToEvento(sesion)),
          actividades: actividades.map((actividad) => this.mapActividadToEvento(actividad)),
        } as ResumenDia,
      }
    } catch (err) {
      console.error('❌ Error en obtenerResumenDia:', err)
      return {
        error: {
          code: 'ERROR_RESUMEN',
          message: `Error al obtener resumen: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      } as ErrorResponse
    }
  }

  async obtenerCalendarioMes(
    pacienteId: string,
    year: number,
    month: number
  ): Promise<any> {
    try {
      if (!pacienteId) {
        return {
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        } as ErrorResponse
      }

      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return {
          error: {
            code: 'FECHA_INVALIDA',
            message: 'year y month deben ser válidos',
          },
        } as ErrorResponse
      }

      const dias = await this.sesionRepository.getCalendarioActividad(pacienteId, year, month)

      return {
        success: true,
        dias: dias.map((dia: CalendarioDiaActividad) => ({
          dia: dia.dia,
          totalEventos: dia.totalEventos,
          totalMedicacion: dia.totalMedicacion,
          totalActividad: dia.totalActividad,
          tieneOn: dia.tieneOn,
          tieneOff: dia.tieneOff,
        })),
      }
    } catch (err) {
      console.error('❌ Error en obtenerCalendarioMes:', err)
      return {
        error: {
          code: 'ERROR_CALENDARIO',
          message: `Error al obtener calendario: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      } as ErrorResponse
    }
  }


  async registrarProgramacionNotificaciones(input: {
    pacienteId?: string
    activo?: boolean
    levodopaIntervaloHoras?: number
    levodopaHoraInicio?: string
    recordatorioSintomasCadaHoras?: number
    notificacionesProgramadas?: number
  }): Promise<any> {
    try {
      if (!input.pacienteId) {
        return {
          error: {
            code: 'FALTA_PACIENTE',
            message: 'pacienteId es requerido',
          },
        } as ErrorResponse
      }

      const intervalo = Math.min(24, Math.max(1, Math.round(Number(input.levodopaIntervaloHoras) || 6)))
      const recordatorioSintomasCadaHoras = Math.min(12, Math.max(1, Math.round(Number(input.recordatorioSintomasCadaHoras) || 2)))
      const horaInicio = typeof input.levodopaHoraInicio === 'string' ? input.levodopaHoraInicio : '08:00'

      await this.sesionRepository.upsertNotificationSchedule({
        pacienteId: input.pacienteId,
        activo: Boolean(input.activo),
        levodopaIntervaloHoras: intervalo,
        levodopaHoraInicio: horaInicio,
        recordatorioSintomasCadaHoras,
        notificacionesProgramadas: Math.max(0, Math.round(Number(input.notificacionesProgramadas) || 0)),
      })

      return { success: true }
    } catch (err) {
      console.error('❌ Error en registrarProgramacionNotificaciones:', err)
      return {
        error: {
          code: 'ERROR_NOTIFICACIONES',
          message: `Error al registrar programación de notificaciones: ${err instanceof Error ? err.message : 'Desconocido'}`,
        },
      } as ErrorResponse
    }
  }

  private mapSesionToEvento(sesion: Sesion): ResumenDia['eventos'][number] {
    return {
      id: sesion.id,
      estado: sesion.estado,
      horaInicio: new Date(sesion.hora_inicio).toISOString(),
      horaFin: sesion.hora_fin ? new Date(sesion.hora_fin).toISOString() : null,
      duracionSegundos: sesion.duracion_segundos ?? null,
      tipoEvento: sesion.tipo_evento || 'cambio_estado',
      horaProgramada: sesion.hora_programada
        ? new Date(sesion.hora_programada).toISOString()
        : null,
    }
  }

  private mapActividadToEvento(actividad: RegistroActividad): ResumenDia['actividades'][number] {
    return {
      id: actividad.id,
      tipo: actividad.tipo,
      fase: actividad.fase,
      horaRegistro: new Date(actividad.hora_registro).toISOString(),
      estadoSintomas: actividad.estado_sintomas || null,
      sintomas: actividad.sintomas || [],
      taps: actividad.taps ?? null,
      estadoMedicacion: actividad.estado_medicacion || null,
      metadata: actividad.metadata || null,
    }
  }

  private formatearDuracion(segundos: number): string {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    const segs = segundos % 60

    const partes = []
    if (horas > 0) partes.push(`${horas}h`)
    if (minutos > 0) partes.push(`${minutos}m`)
    if (segs > 0 && horas === 0) partes.push(`${segs}s`)

    return partes.length > 0 ? partes.join(' ') : '0s'
  }
}
