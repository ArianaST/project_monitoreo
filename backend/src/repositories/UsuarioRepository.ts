import { Pool } from 'pg'

export interface Usuario {
  id: string
  nombre: string
  email: string
  password_hash: string
  rol: 'paciente' | 'medico' | 'administrador'
  levodopa_intervalo_horas: number
  levodopa_hora_inicio: string
  created_at: Date
  updated_at: Date

}

export class UsuarioRepository {
  constructor(private pool: Pool) {}

  async createUsuario(
    nombre: string,
    email: string,
    passwordHash: string,
    rol: 'paciente' | 'medico' | 'administrador' = 'paciente',
    levodopaIntervaloHoras = 6,
    levodopaHoraInicio = '08:00'
  ): Promise<Usuario> {
    const query = `
      INSERT INTO usuarios (
        nombre,
        email,
        password_hash,
        rol,
        levodopa_intervalo_horas,
        levodopa_hora_inicio,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::time, NOW(), NOW())
      RETURNING
        id,
        nombre,
        email,
        password_hash,
        rol,
        levodopa_intervalo_horas,
        to_char(levodopa_hora_inicio, 'HH24:MI') AS levodopa_hora_inicio,
        created_at,
        updated_at
    `
    try {
      const result = await this.pool.query(query, [
        nombre,
        email,
        passwordHash,
        rol,
        levodopaIntervaloHoras,
        levodopaHoraInicio,
      ])
      return result.rows[0]
    } catch (err: any) {
      console.error('❌ UsuarioRepository.createUsuario error:', {
        message: err?.message,
        code: err?.code,
        detail: err?.detail,
        table: err?.table,
        column: err?.column,
        constraint: err?.constraint,
      })
      throw err
    }
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    const query = `
      SELECT
        id,
        nombre,
        email,
        password_hash,
        rol,
        COALESCE(levodopa_intervalo_horas, 6) AS levodopa_intervalo_horas,
        to_char(COALESCE(levodopa_hora_inicio, '08:00'::time), 'HH24:MI') AS levodopa_hora_inicio,
        created_at,
        updated_at
      FROM usuarios
      WHERE email = $1
      LIMIT 1
    `
    try {
      const result = await this.pool.query(query, [email])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (err: any) {
      console.error('❌ UsuarioRepository.findByEmail error:', {
        message: err?.message,
        code: err?.code,
        detail: err?.detail,
        table: err?.table,
        column: err?.column,
        constraint: err?.constraint,
      })
      throw err
    }
  }

  async findById(id: string): Promise<Usuario | null> {
    const query = `
      SELECT
        id,
        nombre,
        email,
        password_hash,
        rol,
        COALESCE(levodopa_intervalo_horas, 6) AS levodopa_intervalo_horas,
        to_char(COALESCE(levodopa_hora_inicio, '08:00'::time), 'HH24:MI') AS levodopa_hora_inicio,
        created_at,
        updated_at
      FROM usuarios
      WHERE id = $1
      LIMIT 1
    `
    const result = await this.pool.query(query, [id])
    return result.rows.length > 0 ? result.rows[0] : null
  }

  async updateNombre(id: string, nombre: string): Promise<Usuario> {
    const query = `
      UPDATE usuarios
      SET nombre = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        nombre,
        email,
        password_hash,
        rol,
        COALESCE(levodopa_intervalo_horas, 6) AS levodopa_intervalo_horas,
        to_char(COALESCE(levodopa_hora_inicio, '08:00'::time), 'HH24:MI') AS levodopa_hora_inicio,
        created_at,
        updated_at
    `
    const result = await this.pool.query(query, [nombre, id])
    if (result.rows.length === 0) {
      throw new Error(`Usuario ${id} no encontrado`)
    }
    return result.rows[0]
  }

  async updateMedicationSchedule(
    id: string,
    levodopaIntervaloHoras: number,
    levodopaHoraInicio: string
  ): Promise<Usuario> {
    const query = `
      UPDATE usuarios
      SET
        levodopa_intervalo_horas = $1,
        levodopa_hora_inicio = $2::time,
        updated_at = NOW()
      WHERE id = $3
      RETURNING
        id,
        nombre,
        email,
        password_hash,
        rol,
        COALESCE(levodopa_intervalo_horas, 6) AS levodopa_intervalo_horas,
        to_char(COALESCE(levodopa_hora_inicio, '08:00'::time), 'HH24:MI') AS levodopa_hora_inicio,
        created_at,
        updated_at
    `
    const result = await this.pool.query(query, [levodopaIntervaloHoras, levodopaHoraInicio, id])
    if (result.rows.length === 0) {
      throw new Error(`Usuario ${id} no encontrado`)
    }
    return result.rows[0]
  }
}