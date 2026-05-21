# 🏗️ Backend - Guía de Setup y Arquitectura

## 📋 Tabla de contenidos
1. [Estructura del proyecto](#estructura)
2. [Instalación](#instalación)
3. [Configuración](#configuración)
4. [Base de datos](#base-de-datos)
5. [Endpoints API](#endpoints)
6. [Flujo de autenticación](#flujo-auth)
7. [Flujo de sesiones](#flujo-sesiones)

---

## 🗂️ Estructura del proyecto {#estructura}

```
backend/
├── src/
│   ├── index.ts                    # Punto de entrada
│   ├── shared/
│   │   └── database.ts             # Conexión a PostgreSQL
│   ├── repositories/
│   │   ├── UsuarioRepository.ts    # CRUD de usuarios
│   │   └── SesionRepository.ts     # CRUD de sesiones
│   ├── services/
│   │   ├── AuthService.ts          # Lógica de autenticación
│   │   └── SesionService.ts        # Lógica de sesiones
│   └── routes/
│       ├── authRoutes.ts           # Rutas POST /api/auth
│       └── sesionRoutes.ts         # Rutas POST /api/sesiones
├── .env                            # Variables de entorno (NO COMMITEAR)
├── .env.example                    # Plantilla .env
└── package.json
```

### Arquitectura en capas:
```
Routes (Express Router)
    ↓
Services (Lógica de negocio)
    ↓
Repositories (Acceso a datos)
    ↓
Database (Conexión PostgreSQL)
```

---

## 🚀 Instalación {#instalación}

### 1. Clonar/ir al directorio backend
```bash
cd backend
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Instalar paquetes principales
```bash
npm install express cors dotenv pg bcrypt jsonwebtoken
npm install -D @types/express @types/node @types/bcrypt typescript ts-node
```

---

## ⚙️ Configuración {#configuración}

```

### 2. Variables requeridas

```env
# Base de datos PostgreSQL
DATABASE_URL=postgresql://usuario:contrasena@localhost:5432/app_paciente

# Servidor
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=tu-secreto-super-seguro-aqui

# Email (opcional)
GMAIL_USER=tu-email@gmail.com
GMAIL_PASS=tu-contrasena-app

# Firebase (opcional para push notifications)
FIREBASE_PROJECT_ID=tu-proyecto
```

### 3. Ejecutar servidor

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm run build
npm start
```

---

## 💾 Base de datos {#base-de-datos}

### Schema SQL (crear estas tablas):

```sql
-- Tabla de usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'paciente',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de sesiones (medicación ON/OFF)
CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES usuarios(id),
  fecha DATE NOT NULL,
  hora_inicio TIMESTAMP NOT NULL,
  hora_fin TIMESTAMP,
  duracion_segundos INTEGER,
  estado VARCHAR(10) NOT NULL CHECK (estado IN ('ON', 'OFF')),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (paciente_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para queries rápidas
CREATE INDEX idx_sesiones_paciente_fecha ON sesiones(paciente_id, fecha);
CREATE INDEX idx_sesiones_hora_fin ON sesiones(hora_fin) WHERE hora_fin IS NULL;
```

### Conexión a Supabase (recommended):

1. Crear proyecto en https://supabase.com
2. Copiar `DATABASE_URL` desde Dashboard → Settings → Database
3. Pegar en `.env`
4. Ejecutar el schema SQL en SQL Editor

---

## 🔌 Endpoints API {#endpoints}

### **AUTENTICACIÓN** (`/api/auth`)

#### POST `/api/auth/register`
**Registra nuevo usuario (solo nombre, email, password)**

Request:
```json
{
  "nombre": "admin",
  "email": "admin@gmail.com",
  "password": "qwerty"
}
```

Response (201):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "admin",
    "email": "admin@gmail.com",
    "rol": "paciente"
  }
}
```

---

#### POST `/api/auth/login`
**Inicia sesión con email y contraseña**

Request:
```json
{
  "email": "juan@example.com",
  "password": "miContraseña123"
}
```

Response (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "paciente"
  }
}
```

---

#### GET `/api/auth/verify`
**Verifica que el JWT token sea válido**

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Response (200):
```json
{
  "valid": true,
  "usuario": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "juan@example.com",
    "rol": "paciente"
  }
}
```

---

### **SESIONES** (`/api/sesiones`)

#### POST `/api/sesiones/iniciar`
**Inicia nueva sesión ON o OFF**

Request:
```json
{
  "pacienteId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (201):
```json
{
  "success": true,
  "sesion": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "estado": "ON",
    "horaInicio": "2026-04-23T09:30:00.000Z"
  }
}
```

---

#### POST `/api/sesiones/detener`
**Detiene la sesión activa**

Request:
```json
{
  "pacienteId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response (200):
```json
{
  "success": true,
  "sesion": {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "estado": "ON",
    "duracion": 600,
    "duracionFormateada": "10m"
  }
}
```

---

#### GET `/api/sesiones/resumen/:pacienteId/:fecha`
**Obtiene resumen de sesiones de un día**

Parámetros:
- `pacienteId`: UUID del paciente
- `fecha`: Formato YYYY-MM-DD

Ejemplo:
```
GET /api/sesiones/resumen/550e8400-e29b-41d4-a716-446655440000/2026-04-23
```

Response (200):
```json
{
  "success": true,
  "resumen": {
    "totalOnSegundos": 7200,
    "totalOffSegundos": 3600,
    "totalEventos": 4,
    "tiempoOnFormateado": "2h",
    "tiempoOffFormateado": "1h",
    "ultimoEstado": "ON",
    "horaUltimoEstado": "09:30:00"
  }
}
```

---

## 🔐 Flujo de autenticación {#flujo-auth}

```mermaid
graph TD
    A["Usuario entra nombre, email, password"] --> B["POST /api/auth/register"]
    B --> C["AuthService.register()"]
    C --> D["Validar email único"]
    D --> E["Hashear password con bcrypt"]
    E --> F["UsuarioRepository.createUsuario()"]
    F --> G["Guardar en PostgreSQL"]
    G --> H["Generar JWT token"]
    H --> I["Retornar token + usuario"]
    I --> J["Frontend guarda token en localStorage"]
    J --> K["Usar token en header Authorization"]
```

### En frontend:
```typescript
// 1. Guardar token
localStorage.setItem('token', response.token)

// 2. Usar en requests
const response = await fetch('/api/sesiones/iniciar', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

---

## 📊 Flujo de sesiones {#flujo-sesiones}

```
Usuario abre app
    ↓
[ON] botón → POST /api/sesiones/iniciar
    ↓
SesionService verifica no hay sesión activa
    ↓
SesionRepository.createSesion() → guarda en DB
    ↓
Contador comienza a correr en frontend

[DURANTE SESIÓN]
Timer del frontend cuenta segundos en tiempo real

[OFF] botón → POST /api/sesiones/detener
    ↓
SesionService busca sesión activa
    ↓
Calcula duración = ahora - horaInicio
    ↓
SesionRepository.closeSesion() → actualiza DB
    ↓
Sesión cerrada, contador se detiene

GET /api/sesiones/resumen/:pacienteId/:fecha
    ↓
SesionService.obtenerResumenDia()
    ↓
SesionRepository.getSesionesByPaciente()
    ↓
Suma todos los duracion_segundos
    ↓
Retorna totalOnSegundos, totalOffSegundos, etc.
```

---

## 📝 Variables de entorno completas

```env
# DATABASE
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/app_paciente
SUPABASE_URL=https://proyecto.supabase.co
SUPABASE_KEY=clave-publica

# SERVER
PORT=3000
NODE_ENV=development

# AUTH
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion-xxx

# EMAIL (para notificaciones)
GMAIL_USER=noreply@app.com
GMAIL_PASS=contraseña-app-especial

# FIREBASE (push notifications)
FIREBASE_PROJECT_ID=app-paciente-123
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=app-paciente-123.firebaseapp.com
```

---

## ✅ Checklist final

- [ ] `.env` configurado con DATABASE_URL válido
- [ ] PostgreSQL/Supabase corriendo y accesible
- [ ] Tablas SQL creadas (usuarios, sesiones)
- [ ] `npm install` completado
- [ ] `npm run dev` inicia sin errores
- [ ] `GET /api/health` retorna 200 OK
- [ ] Endpoints auth funcionan
- [ ] Endpoints sesiones funcionan

