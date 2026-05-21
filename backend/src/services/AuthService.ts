import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { UsuarioRepository } from '../repositories/UsuarioRepository'

export interface TokenPayload {
  id: string
  email: string
  rol: string
}

export interface AuthResponse {
  token: string
  usuario: {
    id: string
    nombre: string
    email: string
    rol: string
    levodopaIntervaloHoras: number
    levodopaHoraInicio: string
  }
}

export class AuthService {
  private jwtSecret: string = process.env.JWT_SECRET || 'tu-secreto-super-seguro'

  constructor(private usuarioRepository: UsuarioRepository) {}

  private normalizeInterval(value: number): number {
    if (!Number.isFinite(value)) return 6
    return Math.min(24, Math.max(1, Math.round(value)))
  }

  private normalizeTime(value: string): string {
    const match = typeof value === 'string' ? value.match(/^(\d{2}):(\d{2})/) : null
    if (!match) return '08:00'

    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '08:00'

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  /**
   * Registra un nuevo usuario.
   * Incluye horario inicial de levodopa para poder programar tomas cada N horas.
   */
  async register(
    nombre: string,
    email: string,
    password: string,
    levodopaIntervaloHoras = 6,
    levodopaHoraInicio = '08:00'
  ): Promise<AuthResponse | { error: string }> {
    try {
      const usuarioExistente = await this.usuarioRepository.findByEmail(email)
      if (usuarioExistente) {
        return { error: 'El email ya está registrado' }
      }

      const intervalo = this.normalizeInterval(levodopaIntervaloHoras)
      const horaInicio = this.normalizeTime(levodopaHoraInicio)
      const passwordHash = await bcrypt.hash(password, 10)

      const usuario = await this.usuarioRepository.createUsuario(
        nombre,
        email,
        passwordHash,
        'paciente',
        intervalo,
        horaInicio
      )

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        this.jwtSecret,
        { expiresIn: '7d' }
      )

      return {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          levodopaIntervaloHoras: usuario.levodopa_intervalo_horas,
          levodopaHoraInicio: usuario.levodopa_hora_inicio,
        },
      }
    } catch (err) {
      console.error('AuthService.register error:', err)
      return {
        error: `Error en registro: ${err instanceof Error ? err.message : 'Desconocido'}`,
      }
    }
  }

  /**
   * Autentica un usuario con email y contraseña.
   */
  async login(
    email: string,
    password: string
  ): Promise<AuthResponse | { error: string }> {
    try {
      const usuario = await this.usuarioRepository.findByEmail(email)
      if (!usuario) {
        return { error: 'Email o contraseña incorrectos' }
      }

      const passwordValida = await bcrypt.compare(password, usuario.password_hash)
      if (!passwordValida) {
        return { error: 'Email o contraseña incorrectos' }
      }

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, rol: usuario.rol },
        this.jwtSecret,
        { expiresIn: '7d' }
      )

      return {
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          levodopaIntervaloHoras: usuario.levodopa_intervalo_horas,
          levodopaHoraInicio: usuario.levodopa_hora_inicio,
        },
      }
    } catch (err) {
      return {
        error: `Error en login: ${err instanceof Error ? err.message : 'Desconocido'}`,
      }
    }
  }


  async getProfile(usuarioId: string): Promise<AuthResponse['usuario'] | { error: string }> {
    try {
      const usuario = await this.usuarioRepository.findById(usuarioId)
      if (!usuario) return { error: 'Usuario no encontrado' }

      return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        levodopaIntervaloHoras: usuario.levodopa_intervalo_horas,
        levodopaHoraInicio: usuario.levodopa_hora_inicio,
      }
    } catch (err) {
      return {
        error: `Error al cargar perfil: ${err instanceof Error ? err.message : 'Desconocido'}`,
      }
    }
  }

  async updateMedicationSchedule(
    usuarioId: string,
    levodopaIntervaloHoras: number,
    levodopaHoraInicio: string
  ): Promise<AuthResponse['usuario'] | { error: string }> {
    try {
      const intervalo = this.normalizeInterval(levodopaIntervaloHoras)
      const horaInicio = this.normalizeTime(levodopaHoraInicio)
      const usuario = await this.usuarioRepository.updateMedicationSchedule(
        usuarioId,
        intervalo,
        horaInicio
      )

      return {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        levodopaIntervaloHoras: usuario.levodopa_intervalo_horas,
        levodopaHoraInicio: usuario.levodopa_hora_inicio,
      }
    } catch (err) {
      return {
        error: `Error al actualizar medicación: ${err instanceof Error ? err.message : 'Desconocido'}`,
      }
    }
  }

  /**
   * Verifica y decodifica un JWT token.
   */
  verifyToken(token: string): TokenPayload | { error: string } {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload
      return payload
    } catch {
      return { error: 'Token inválido o expirado' }
    }
  }
}