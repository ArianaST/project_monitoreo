import { Pool } from 'pg'

export type EstadoSesion = 'ON' | 'OFF'
export type TipoEventoMedicacion = 'toma_confirmada' | 'toma_no_realizada' | 'cambio_estado'
export type TipoActividad = 'sintomas' | 'tapping' | 'acelerometro'
export type FaseActividad = 'antes' | 'despues'
export type EstadoSintomas = 'verde' | 'amarillo' | 'rojo'

export interface Sesion {
  id: string
  paciente_id: string
  fecha: Date
  hora_inicio: Date
  hora_fin?: Date | null
  duracion_segundos?: number | null
  estado: EstadoSesion
  tipo_evento: TipoEventoMedicacion
  hora_programada?: Date | null
  created_at: Date
}

export interface RegistroActividad {
  id: string
  paciente_id: string
  fecha: Date
  tipo: TipoActividad
  fase: FaseActividad
  hora_registro: Date
  estado_sintomas?: EstadoSintomas | null
  sintomas?: string[] | null
  taps?: number | null
  estado_medicacion?: EstadoSesion | null
  metadata?: Record<string, unknown> | null
  created_at: Date
}

export interface CrearActividadInput {
  pacienteId: string
  fecha: Date
  tipo: TipoActividad
  fase: FaseActividad
  horaRegistro: Date
  estadoSintomas?: EstadoSintomas | null
  sintomas?: string[]
  taps?: number | null
  estadoMedicacion?: EstadoSesion | null
  metadata?: Record<string, unknown> | null
}

export interface CalendarioDiaActividad {
  dia: number
  totalEventos: number
  totalMedicacion: number
  totalActividad: number
  tieneOn: boolean
  tieneOff: boolean
}

export interface CambioEstadoResult {
  sesion: Sesion
  sesionesCerradas: Sesion[]
}

export class SesionRepository {
  constructor(private pool: Pool) {}

  async createSesion(
    pacienteId: string,
    fecha: Date,
    horaInicio: Date,
    estado: EstadoSesion,
    tipoEvento: TipoEventoMedicacion = 'cambio_estado',
    horaProgramada?: Date | null
  ): Promise<Sesion> {
    const query = `
      INSERT INTO sesiones (
        paciente_id,
        fecha,
        hora_inicio,
        estado,
        tipo_evento,
        hora_programada,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING
        id,
        paciente_id,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_segundos,
        estado,
        tipo_evento,
        hora_programada,
        created_at
    `
    const result = await this.pool.query(query, [
      pacienteId,
      fecha,
      horaInicio,
      estado,
      tipoEvento,
      horaProgramada || null,
    ])
    return result.rows[0]
  }

  async registrarCambioEstado(
    pacienteId: string,
    fecha: Date,
    horaCambio: Date,
    estado: EstadoSesion,
    tipoEvento: TipoEventoMedicacion = 'cambio_estado',
    horaProgramada?: Date | null
  ): Promise<CambioEstadoResult> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const activasResult = await client.query(
        `
          SELECT
            id,
            paciente_id,
            fecha,
            hora_inicio,
            hora_fin,
            duracion_segundos,
            estado,
            COALESCE(tipo_evento, 'cambio_estado') AS tipo_evento,
            hora_programada,
            created_at
          FROM sesiones
          WHERE paciente_id = $1 AND hora_fin IS NULL
          ORDER BY hora_inicio ASC
          FOR UPDATE
        `,
        [pacienteId]
      )

      const sesionesCerradas: Sesion[] = []

      for (const activa of activasResult.rows as Sesion[]) {
        const horaInicio = new Date(activa.hora_inicio)
        const duracionSeg = Math.max(
          0,
          Math.floor((horaCambio.getTime() - horaInicio.getTime()) / 1000)
        )

        const cerradaResult = await client.query(
          `
            UPDATE sesiones
            SET hora_fin = $1, duracion_segundos = $2
            WHERE id = $3
            RETURNING
              id,
              paciente_id,
              fecha,
              hora_inicio,
              hora_fin,
              duracion_segundos,
              estado,
              COALESCE(tipo_evento, 'cambio_estado') AS tipo_evento,
              hora_programada,
              created_at
          `,
          [horaCambio, duracionSeg, activa.id]
        )

        sesionesCerradas.push(cerradaResult.rows[0])
      }

      const nuevaResult = await client.query(
        `
          INSERT INTO sesiones (
            paciente_id,
            fecha,
            hora_inicio,
            estado,
            tipo_evento,
            hora_programada,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING
            id,
            paciente_id,
            fecha,
            hora_inicio,
            hora_fin,
            duracion_segundos,
            estado,
            tipo_evento,
            hora_programada,
            created_at
        `,
        [pacienteId, fecha, horaCambio, estado, tipoEvento, horaProgramada || null]
      )

      await client.query('COMMIT')

      return {
        sesion: nuevaResult.rows[0],
        sesionesCerradas,
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  async closeSesion(
    sesionId: string,
    horaFin: Date,
    duracionSeg: number
  ): Promise<Sesion> {
    const query = `
      UPDATE sesiones
      SET hora_fin = $1, duracion_segundos = $2
      WHERE id = $3
      RETURNING
        id,
        paciente_id,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_segundos,
        estado,
        COALESCE(tipo_evento, 'cambio_estado') AS tipo_evento,
        hora_programada,
        created_at
    `
    const result = await this.pool.query(query, [horaFin, duracionSeg, sesionId])
    if (result.rows.length === 0) {
      throw new Error(`Sesión ${sesionId} no encontrada`)
    }
    return result.rows[0]
  }

  async getSesionesByPaciente(
    pacienteId: string,
    fecha: Date
  ): Promise<Sesion[]> {
    const query = `
      SELECT
        id,
        paciente_id,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_segundos,
        estado,
        COALESCE(tipo_evento, 'cambio_estado') AS tipo_evento,
        hora_programada,
        created_at
      FROM sesiones
      WHERE paciente_id = $1 AND DATE(fecha) = DATE($2)
      ORDER BY hora_inicio DESC
    `
    const result = await this.pool.query(query, [pacienteId, fecha])
    return result.rows
  }

  async getSesionActiva(pacienteId: string): Promise<Sesion | null> {
    const query = `
      SELECT
        id,
        paciente_id,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_segundos,
        estado,
        COALESCE(tipo_evento, 'cambio_estado') AS tipo_evento,
        hora_programada,
        created_at
      FROM sesiones
      WHERE paciente_id = $1 AND hora_fin IS NULL
      ORDER BY hora_inicio DESC
      LIMIT 1
    `
    const result = await this.pool.query(query, [pacienteId])
    return result.rows.length > 0 ? result.rows[0] : null
  }

  async createActividad(input: CrearActividadInput): Promise<RegistroActividad> {
    const query = `
      INSERT INTO registros_actividad (
        paciente_id,
        fecha,
        tipo,
        fase,
        hora_registro,
        estado_sintomas,
        sintomas,
        taps,
        estado_medicacion,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING
        id,
        paciente_id,
        fecha,
        tipo,
        fase,
        hora_registro,
        estado_sintomas,
        sintomas,
        taps,
        estado_medicacion,
        metadata,
        created_at
    `

    const result = await this.pool.query(query, [
      input.pacienteId,
      input.fecha,
      input.tipo,
      input.fase,
      input.horaRegistro,
      input.estadoSintomas || null,
      input.sintomas || [],
      input.taps ?? null,
      input.estadoMedicacion || null,
      input.metadata || {},
    ])

    return result.rows[0]
  }

  async getActividadesByPaciente(pacienteId: string, fecha: Date): Promise<RegistroActividad[]> {
    const query = `
      SELECT
        id,
        paciente_id,
        fecha,
        tipo,
        fase,
        hora_registro,
        estado_sintomas,
        sintomas,
        taps,
        estado_medicacion,
        metadata,
        created_at
      FROM registros_actividad
      WHERE paciente_id = $1 AND DATE(fecha) = DATE($2)
      ORDER BY hora_registro DESC
    `
    const result = await this.pool.query(query, [pacienteId, fecha])
    return result.rows
  }

  async getCalendarioActividad(
    pacienteId: string,
    year: number,
    month: number
  ): Promise<CalendarioDiaActividad[]> {
    const query = `
      WITH params AS (
        SELECT make_date($2::int, $3::int, 1) AS inicio
      ), medicacion AS (
        SELECT
          fecha,
          COUNT(*)::int AS total_medicacion,
          BOOL_OR(estado = 'ON') AS tiene_on,
          BOOL_OR(estado = 'OFF') AS tiene_off
        FROM sesiones, params
        WHERE paciente_id = $1
          AND fecha >= params.inicio
          AND fecha < params.inicio + INTERVAL '1 month'
        GROUP BY fecha
      ), actividad AS (
        SELECT
          fecha,
          COUNT(*)::int AS total_actividad
        FROM registros_actividad, params
        WHERE paciente_id = $1
          AND fecha >= params.inicio
          AND fecha < params.inicio + INTERVAL '1 month'
        GROUP BY fecha
      )
      SELECT
        EXTRACT(DAY FROM COALESCE(m.fecha, a.fecha))::int AS dia,
        COALESCE(m.total_medicacion, 0)::int AS total_medicacion,
        COALESCE(a.total_actividad, 0)::int AS total_actividad,
        (COALESCE(m.total_medicacion, 0) + COALESCE(a.total_actividad, 0))::int AS total_eventos,
        COALESCE(m.tiene_on, FALSE) AS tiene_on,
        COALESCE(m.tiene_off, FALSE) AS tiene_off
      FROM medicacion m
      FULL OUTER JOIN actividad a ON a.fecha = m.fecha
      ORDER BY dia ASC
    `
    const result = await this.pool.query(query, [pacienteId, year, month])
    return result.rows.map((row) => ({
      dia: Number(row.dia),
      totalEventos: Number(row.total_eventos),
      totalMedicacion: Number(row.total_medicacion),
      totalActividad: Number(row.total_actividad),
      tieneOn: Boolean(row.tiene_on),
      tieneOff: Boolean(row.tiene_off),
    }))
  }

  async upsertNotificationSchedule(input: {
    pacienteId: string
    activo: boolean
    levodopaIntervaloHoras: number
    levodopaHoraInicio: string
    recordatorioSintomasCadaHoras: number
    notificacionesProgramadas: number
  }): Promise<void> {
    const query = `
      INSERT INTO notificaciones (
        paciente_id,
        tipo,
        titulo,
        mensaje,
        activo,
        levodopa_intervalo_horas,
        levodopa_hora_inicio,
        recordatorio_sintomas_cada_horas,
        notificaciones_programadas,
        metadata,
        updated_at,
        created_at
      )
      VALUES (
        $1,
        'programacion',
        'Recordatorios PaTITO',
        'Recordatorios locales de levodopa, síntomas y ejercicios',
        $2,
        $3,
        $4::time,
        $5,
        $6,
        '{}'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT (paciente_id, tipo)
      DO UPDATE SET
        activo = EXCLUDED.activo,
        levodopa_intervalo_horas = EXCLUDED.levodopa_intervalo_horas,
        levodopa_hora_inicio = EXCLUDED.levodopa_hora_inicio,
        recordatorio_sintomas_cada_horas = EXCLUDED.recordatorio_sintomas_cada_horas,
        notificaciones_programadas = EXCLUDED.notificaciones_programadas,
        updated_at = NOW()
    `

    await this.pool.query(query, [
      input.pacienteId,
      input.activo,
      input.levodopaIntervaloHoras,
      input.levodopaHoraInicio,
      input.recordatorioSintomasCadaHoras,
      input.notificacionesProgramadas,
    ])
  }
}