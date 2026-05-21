-- ============================================================
-- 📊 SCHEMA SQL - App Paciente Monitoreo Medicación
-- Versión segura para ejecutar más de una vez
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: USUARIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  rol VARCHAR(50) NOT NULL DEFAULT 'paciente'
    CHECK (rol IN ('paciente', 'medico', 'administrador')),

  levodopa_intervalo_horas INTEGER NOT NULL DEFAULT 6
    CHECK (levodopa_intervalo_horas BETWEEN 1 AND 24),

  levodopa_hora_inicio TIME NOT NULL DEFAULT '08:00',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uk_usuarios_email UNIQUE(email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ============================================================
-- TABLA: SESIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  paciente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  fecha DATE NOT NULL,
  hora_inicio TIMESTAMP NOT NULL,
  hora_fin TIMESTAMP,

  duracion_segundos INTEGER,

  estado VARCHAR(10) NOT NULL
    CHECK (estado IN ('ON', 'OFF')),

  tipo_evento VARCHAR(30) NOT NULL DEFAULT 'cambio_estado'
    CHECK (tipo_evento IN ('toma_confirmada', 'toma_no_realizada', 'cambio_estado')),

  hora_programada TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT check_duracion_coherente
    CHECK (
      (hora_fin IS NULL AND duracion_segundos IS NULL) OR
      (hora_fin IS NOT NULL AND duracion_segundos IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_sesiones_paciente_fecha
  ON sesiones(paciente_id, fecha);

CREATE INDEX IF NOT EXISTS idx_sesiones_activas
  ON sesiones(paciente_id, hora_fin)
  WHERE hora_fin IS NULL;

CREATE INDEX IF NOT EXISTS idx_sesiones_fecha
  ON sesiones(fecha);

-- ============================================================
-- TABLA: REGISTROS_ACTIVIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS registros_actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  paciente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  fecha DATE NOT NULL,

  tipo VARCHAR(20) NOT NULL
    CHECK (tipo IN ('sintomas', 'tapping', 'acelerometro')),

  fase VARCHAR(20) NOT NULL
    CHECK (fase IN ('antes', 'despues')),

  hora_registro TIMESTAMP NOT NULL,

  estado_sintomas VARCHAR(20)
    CHECK (
      estado_sintomas IS NULL OR
      estado_sintomas IN ('verde', 'amarillo', 'rojo')
    ),

  sintomas TEXT[] NOT NULL DEFAULT '{}',

  taps INTEGER
    CHECK (taps IS NULL OR taps >= 0),

  estado_medicacion VARCHAR(10)
    CHECK (
      estado_medicacion IS NULL OR
      estado_medicacion IN ('ON', 'OFF')
    ),

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_actividad_paciente_fecha
  ON registros_actividad(paciente_id, fecha);

CREATE INDEX IF NOT EXISTS idx_registros_actividad_tipo_fecha
  ON registros_actividad(paciente_id, tipo, fecha);

-- ============================================================
-- TABLA: NOTIFICACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  paciente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  tipo VARCHAR(40) NOT NULL DEFAULT 'programacion'
    CHECK (tipo IN ('programacion', 'medicamento', 'sintomas', 'ejercicio')),

  titulo VARCHAR(160) NOT NULL,

  mensaje TEXT NOT NULL,

  activo BOOLEAN NOT NULL DEFAULT TRUE,

  levodopa_intervalo_horas INTEGER NOT NULL DEFAULT 6
    CHECK (levodopa_intervalo_horas BETWEEN 1 AND 24),

  levodopa_hora_inicio TIME NOT NULL DEFAULT '08:00',

  recordatorio_sintomas_cada_horas INTEGER NOT NULL DEFAULT 2
    CHECK (recordatorio_sintomas_cada_horas BETWEEN 1 AND 12),

  notificaciones_programadas INTEGER NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uk_notificaciones_paciente_tipo UNIQUE (paciente_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_paciente
  ON notificaciones(paciente_id);

CREATE INDEX IF NOT EXISTS idx_notificaciones_activo
  ON notificaciones(paciente_id, activo);

-- ============================================================
-- TABLA: AUDITORÍA
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  evento VARCHAR(100) NOT NULL,

  usuario_id UUID REFERENCES usuarios(id),

  entidad_tipo VARCHAR(100) NOT NULL,
  entidad_id UUID,

  cambios JSONB,

  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),

  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_evento
  ON auditoria(evento);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
  ON auditoria(usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_fecha
  ON auditoria(timestamp);

-- ============================================================
-- FUNCIÓN UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS UPDATED_AT
-- PostgreSQL no tiene CREATE TRIGGER IF NOT EXISTS.
-- Por eso se elimina primero y se vuelve a crear.
-- ============================================================

DROP TRIGGER IF EXISTS trigger_actualizar_usuarios_updated_at ON usuarios;

CREATE TRIGGER trigger_actualizar_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_actualizar_notificaciones_updated_at ON notificaciones;

CREATE TRIGGER trigger_actualizar_notificaciones_updated_at
  BEFORE UPDATE ON notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================
-- VISTAS ÚTILES
-- ============================================================

CREATE OR REPLACE VIEW resumen_diario_pacientes AS
SELECT
  p.id as paciente_id,
  p.nombre,
  s.fecha,
  COUNT(s.id) as total_sesiones,
  COUNT(CASE WHEN s.estado = 'ON' THEN 1 END) as total_on,
  COUNT(CASE WHEN s.estado = 'OFF' THEN 1 END) as total_off,
  COALESCE(
    SUM(CASE WHEN s.estado = 'ON' THEN s.duracion_segundos ELSE 0 END),
    0
  ) as total_on_segundos,
  COALESCE(
    SUM(CASE WHEN s.estado = 'OFF' THEN s.duracion_segundos ELSE 0 END),
    0
  ) as total_off_segundos
FROM usuarios p
LEFT JOIN sesiones s ON p.id = s.paciente_id
GROUP BY p.id, p.nombre, s.fecha;

-- ============================================================
-- INSERTS DE EJEMPLO
-- Seguros para ejecutar más de una vez.
-- ============================================================

INSERT INTO usuarios (
  nombre,
  email,
  password_hash,
  rol
)
VALUES (
  'Juan Pérez',
  'juan@example.com',
  '$2b$10$...',
  'paciente'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO sesiones (
  paciente_id,
  fecha,
  hora_inicio,
  hora_fin,
  duracion_segundos,
  estado
)
SELECT
  u.id,
  CURRENT_DATE,
  CURRENT_TIMESTAMP - INTERVAL '3 hours',
  CURRENT_TIMESTAMP - INTERVAL '2.5 hours',
  1800,
  'ON'
FROM usuarios u
WHERE u.email = 'juan@example.com'
  AND NOT EXISTS (
    SELECT 1
    FROM sesiones s
    WHERE s.paciente_id = u.id
      AND s.fecha = CURRENT_DATE
      AND s.estado = 'ON'
      AND s.duracion_segundos = 1800
  );

-- ============================================================
-- QUERIES COMUNES PARA DESARROLLO
-- ============================================================

/*
SELECT
  SUM(
    CASE WHEN estado = 'ON'
    THEN COALESCE(duracion_segundos, 0)
    ELSE 0
    END
  ) as on_segundos,
  SUM(
    CASE WHEN estado = 'OFF'
    THEN COALESCE(duracion_segundos, 0)
    ELSE 0
    END
  ) as off_segundos,
  COUNT(*) as total_eventos
FROM sesiones
WHERE paciente_id = 'TU_UUID_AQUI'
  AND fecha = CURRENT_DATE;
*/

/*
SELECT *
FROM sesiones
WHERE paciente_id = 'TU_UUID_AQUI'
  AND hora_fin IS NULL
LIMIT 1;
*/



-- ============================================================
-- REGLA RECOMENDADA PARA SESIONES ACTIVAS
-- ============================================================
-- Permite múltiples ON/OFF por paciente y día, pero evita que queden
-- dos sesiones abiertas al mismo tiempo para el mismo paciente.
CREATE UNIQUE INDEX IF NOT EXISTS uk_sesiones_una_activa_por_paciente
  ON sesiones(paciente_id)
  WHERE hora_fin IS NULL;


-- Migración para sincronizar estados ON/OFF y horario de levodopa

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS levodopa_intervalo_horas INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS levodopa_hora_inicio TIME NOT NULL DEFAULT '08:00';

ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_levodopa_intervalo_horas_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_levodopa_intervalo_horas_check
  CHECK (levodopa_intervalo_horas BETWEEN 1 AND 24);

ALTER TABLE sesiones
  ADD COLUMN IF NOT EXISTS tipo_evento VARCHAR(30) NOT NULL DEFAULT 'cambio_estado',
  ADD COLUMN IF NOT EXISTS hora_programada TIMESTAMP;

ALTER TABLE sesiones
  DROP CONSTRAINT IF EXISTS sesiones_tipo_evento_check;

ALTER TABLE sesiones
  ADD CONSTRAINT sesiones_tipo_evento_check
  CHECK (tipo_evento IN ('toma_confirmada', 'toma_no_realizada', 'cambio_estado'));

CREATE INDEX IF NOT EXISTS idx_sesiones_tipo_evento
  ON sesiones(paciente_id, tipo_evento, fecha);