# 🏥 Backend - App Paciente Monitoreo Medicación

Backend TypeScript + Express + PostgreSQL para app de monitoreo de medicación para pacientes de la tercera edad.

## 📋 Características

✅ **Autenticación simple:**
- Solo requiere nombre, email y contraseña
- JWT token para sesiones
- Validación con bcrypt

✅ **Gestión de sesiones ON/OFF:**
- Registra cuándo el paciente está con/sin medicación
- Calcula duración automáticamente
- Resumen diario con estadísticas

✅ **Arquitectura limpia:**
- Separación de capas (Routes → Services → Repositories → Database)
- Inyección de dependencias
- Tipos TypeScript strict

✅ **Compatible con ngrok:**
- CORS configurado para desarrollo remoto
- Perfecto para probar en celular

## 🚀 Quick Start

### 1. Setup base de datos

**Opción A: Usar Supabase (recomendado)**
```bash
# 1. Crea proyecto en https://supabase.com
# 2. Ve a SQL Editor
# 3. Copia el contenido de schema.sql
# 4. Pega y ejecuta
# 5. Copia DATABASE_URL de Settings → Database
```

**Opción B: PostgreSQL local**
```bash
psql -U postgres -c "CREATE DATABASE app_paciente;"
psql -U postgres -d app_paciente -f schema.sql
```

### 2. Configurar variables

```bash
cp .env.example .env
```

Edita `.env`:
```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/app_paciente
JWT_SECRET=tu-secreto-cambiar-en-produccion
PORT=3000
```

### 3. Instalar y correr

```bash
npm install
npm run dev
```

Servidor corriendo en `http://localhost:3000` ✅

### 4. Probar API

```bash
# Health check
curl http://localhost:3000/api/health

# Registrar usuario
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "password": "miContraseña123"
  }'
```

## 📁 Estructura

```
src/
├── index.ts                    # Punto de entrada
├── shared/
│   └── database.ts            # Pool PostgreSQL
├── repositories/
│   ├── UsuarioRepository.ts
│   └── SesionRepository.ts
├── services/
│   ├── AuthService.ts
│   └── SesionService.ts
└── routes/
    ├── authRoutes.ts
    └── sesionRoutes.ts
```

## 🔌 API Endpoints

### Auth
```
POST   /api/auth/register      # Registrar
POST   /api/auth/login         # Iniciar sesión
GET    /api/auth/verify        # Verificar token
```

### Sesiones
```
POST   /api/sesiones/iniciar   # Iniciar ON/OFF
POST   /api/sesiones/detener   # Detener sesión
GET    /api/sesiones/resumen/:pacienteId/:fecha
```

## 📖 Documentación completa

Ver `BACKEND_SETUP.md` para:
- Guía de instalación paso a paso
- Explicación de arquitectura
- Ejemplos de requests/responses
- Troubleshooting

Ver `schema.sql` para:
- Estructura de tablas
- Índices
- Vistas y funciones

## 🔧 Comandos útiles

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Correr versión compilada
npm start

# Linting (si agregamos ESLint)
npm run lint

# Tests (si agregamos Jest)
npm test
```

## 🌐 Desplegar en ngrok

Si quieres exponer el backend para probar desde tu celular:

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: ngrok
ngrok http 3000
```

Verás algo como:
```
Forwarding: https://xxxx-xxxx.ngrok-free.dev -> http://localhost:3000
```

En tu app frontend, apunta los requests a ese URL. ✨

## 🗄️ Base de datos

### Tablas principales

**usuarios:**
```
id (UUID)
nombre
email (unique)
password_hash
rol (paciente, medico, administrador)
created_at, updated_at
```

**sesiones:**
```
id (UUID)
paciente_id (FK → usuarios)
fecha (para queries por día)
hora_inicio
hora_fin (NULL si activa)
duracion_segundos
estado (ON | OFF)
```

## 🔐 Autenticación

Los tokens JWT expiran en **7 días**.

En requests autenticados, usa header:
```
Authorization: Bearer <tu-token-jwt>
```

## 🚨 Troubleshooting

**Error: "database connection error"**
- Verifica DATABASE_URL en .env
- Verifica que PostgreSQL/Supabase esté accesible

**Error: "EADDRINUSE"**
- El puerto 3000 está en uso
- Cambia en `.env`: `PORT=3001`

**Error: "Cannot find module"**
- Ejecuta: `npm install`
- Verifica TypeScript: `npm run build`

## 📝 Variables de entorno

```env
DATABASE_URL         # PostgreSQL connection string (REQUERIDO)
JWT_SECRET          # Secreto para firmar tokens (REQUERIDO)
PORT                # Puerto del servidor (default: 3000)
NODE_ENV            # development, staging, production
GMAIL_USER          # Email para notificaciones (opcional)
FIREBASE_PROJECT_ID # Firebase para push (opcional)
```

## 🎯 Próximas mejoras

- [ ] Rate limiting
- [ ] Validación más robusta (Joi/Zod)
- [ ] Tests automatizados (Jest)
- [ ] Logging centralizado
- [ ] Email notifications
- [ ] Push notifications
- [ ] Roles y permisos avanzados
- [ ] API documentation (Swagger)

## 📞 Soporte

Si tienes dudas, revisa:
1. `BACKEND_SETUP.md` - Guía completa
2. `schema.sql` - Estructura de datos
3. Código fuente con comentarios en español

---

**Creado para:** Pacientes tercera edad  
**Stack:** TypeScript, Express, PostgreSQL, JWT  
**License:** MIT
