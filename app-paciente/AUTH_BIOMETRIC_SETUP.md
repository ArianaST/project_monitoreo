# 🔐 Autenticación Biométrica - Guía de uso

## 📋 Archivos Creados

### 1. `composables/useBiometricAuth.ts`
Composable principal que maneja toda la lógica de autenticación biométrica.

**Métodos:**
- `checkBiometricAvailability()` - Verifica si el dispositivo soporta biometría
- `loginWithBiometric()` - Autentica con Face ID o huella
- `loginWithEmail(email, password)` - Login con email/contraseña
- `register(nombre, email, password)` - Registra nuevo usuario (solo 3 campos)
- `logout()` - Cierra sesión y limpia datos
- `initializeAuth()` - Inicializa y comprueba token guardado

**State:**
- `isLoading` - Indica si está procesando
- `errorMessage` - Mensajes de error en español
- `isAuthenticated` - Computed: ¿tiene token?

**Features:**
✓ Guarda token en `@capacitor/preferences` (seguro en el dispositivo)
✓ Máximo 2 intentos fallidos de biometría → cambiar a email/contraseña
✓ Mensajes amigables para adultos mayores
✓ Integración con sessionStore para guardar nombre del paciente

### 2. `pages/LoginPage.vue`
Interfaz de login diseñada para adultos mayores.


**Dos modos:**

**A) Modo Biométrico:**
- Bienvenida personalizada
- Botón grande Face ID/Huella
- Link para problemas
- Intento automático después de 1 segundo al montar

**B) Formularios (sin token):**
- Pestaña LOGIN: email + contraseña
- Pestaña REGISTRO: nombre + email + contraseña (solo 3 campos)
- Toggles para mostrar/ocultar contraseña
- Mensajes de error/éxito

### 3. `router/index.ts` (ACTUALIZADO)
Rutas con protección de autenticación.

**Cambios:**
- `/` redirige a `/login`
- `/login` - pública (sin protección)
- `/home`, `/inicio`, etc. - protegidas (requieren token)
- Guard `requireAuth` verifica token en cada ruta protegida

### 4. `.env` 
Template de variables de entorno.

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## 🔄 Flujo de Autenticación (Orden EXACTO)

```
1. App abre → router/index.ts
   ↓
2. Guard requireAuth busca token en @capacitor/preferences
   ↓
3a. ¿TIENE TOKEN?
    └─→ Redirige a /login
        LoginPage monta en VISTA A (biométrico)
        ↓
        Intenta Face ID/Huella automáticamente
        ↓
        ¿Éxito? → router.push('/home')
        ¿Falla 2x? → Muestra formulario email

3b. ¿NO TIENE TOKEN?
    └─→ Redirige a /login
        LoginPage muestra VISTA B (formularios)
        ↓
        Usuario elige: LOGIN o REGISTRO
        ↓
        LOGIN: POST /api/auth/login
        REGISTRO: POST /api/auth/register (solo nombre, email, pwd)
        ↓
        Guarda token en @capacitor/preferences
        Guarda nombre en sessionStore
        Intenta activar biométrico
        ↓
        router.push('/home')
```

---

## 🛠️ Integración con Backend

El composable se conecta a tu backend en `src/services/AuthService.ts`:

```typescript
// LOGIN
POST /api/auth/login
Body: { email, password }
Response: { token, usuario: { id, nombre, email, rol } }

// REGISTRO
POST /api/auth/register
Body: { nombre, email, password }  ← Solo 3 campos
Response: { token, usuario: { id, nombre, email, rol } }
```

---

## 💾 Almacenamiento

### Token
- **Guardado en:** `@capacitor/preferences` (storage seguro del dispositivo)
- **Clave:** `auth_token`
- **Usado en:** Headers `Authorization: Bearer <token>`

### Nombre del paciente
- **Guardado en:** `sessionStore` (Pinia)
- **Usada en:** HomePage para saludo personalizado

### Intentos biométricos
- **Guardado en:** `@capacitor/preferences`
- **Clave:** `biometric_attempts`
- **Máximo:** 2 intentos fallidos → cambiar a formulario

---

## 🎨 UI/UX para Adultos Mayores

✓ Textos grandes (text-base mínimo, text-lg en títulos)
✓ Botones grandes (h-14 mínimo)
✓ Colores claros y accesibles
✓ Sin animaciones confusas
✓ Mensajes claros en español
✓ Una pantalla, sin scroll horizontal
✓ Ícono grande de biometría (56px)
✓ Bienvenida personalizada

---

## 🚀 Cómo probar

### 1. Setup
```bash
cd app-paciente
cp .env.example .env
# Editar .env con VITE_BACKEND_URL
npm install  # Si no está instalado @capacitor/preferences
npm run dev
```

### 2. Test en navegador
```
http://localhost:5174/
→ Redirige a /login
```

### 3. Primer login
- Clic en pestaña "Registrarse"
- Llenar: nombre, email, contraseña
- Clic "Crear cuenta"
- Debería ir a /home y mostrar saludo personalizado

### 4. Segundo login
- Recargar página
- Debería mostrar VISTA A (biométrico)
- Simular Face ID (en browser, acepta cualquier cosa)
- O clic "¿Problemas?" → vuelve a formulario

---

## 🔒 Seguridad

✓ Contraseñas hasheadas con bcrypt en backend
✓ JWT tokens con expiración 7 días
✓ Biometría requiere verificación del dispositivo
✓ Token en storage seguro (Preferences)
✓ Guards protegen rutas sin token
✓ No guardamos contraseña en cliente

---

## ⚙️ Configuración Backend

Tu backend en `backend/src/services/AuthService.ts` ya tiene:
- `register()` - Acepta solo nombre, email, password
- `login()` - Valida credenciales
- `verifyToken()` - Verifica JWT

Solo asegúrate que:
1. Backend corre en `http://localhost:3000`
2. CORS está habilitado (ya está en `backend/src/index.ts`)
3. Variables `.env` de backend están configuradas

---

## 🆘 Troubleshooting

**Error: "No se reconoció tu rostro"**
- Normal en navegador (no hay biometría real)
- Intenta 2 veces y cambia a email/contraseña

**Error: "No se pudo conectar"**
- Verifica que backend está corriendo: `npm run dev` en `backend/`
- Verifica `VITE_BACKEND_URL` en `.env`

**Token no se guarda**
- Verifica que `@capacitor/preferences` está instalado
- Revisa consola del navegador (F12)

**Página se queda en login después de registrarse**
- Verifica que `router.push('/home')` se ejecuta
- Revisa que `/home` está protegida con `beforeEnter: requireAuth`

---

## 📱 En dispositivo real (Capacitor)

Cuando compiles la app nativa:
1. La biometría funciona realmente (Face ID / Huella)
2. El token se guarda en storage seguro del SO
3. Todo funciona offline (excepto primera autenticación)

```bash
npm run build
npx cap sync android
npx cap run android
```

---

## 📝 Notas

- El diseño es accesible y pensado para abuelos
- No hay datos personales extra al registrarse (solo nombre, email, pwd)
- El sistema es stateful: guarda token en dispositivo
- Perfect para monitoreo de medicación: entrada rápida, salida segura
