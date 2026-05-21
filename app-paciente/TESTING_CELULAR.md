# 📱 Instrucciones para Probar en Celular

## Opción 1: Usando Capacitor (CAPACITOR_SETUP.md)

## Opción 2:

### 1. Instala ngrok
Descarga desde: https://ngrok.com/download

### 2. Expone tu servidor local
```bash
# En una terminal nueva (deja npm run dev ejecutándose)
ngrok http 5173

### 3. Abre en tu celular
- Copia la URL `https://xxxx-xx-xxx-xx-x.ngrok.io`
- Abre en el navegador del celular
- ¡Listo! Prueba los botones ON/OFF

---

## Opción 3: Desde la Misma Red WiFi (Más simple)

### 1. Obtén tu IP local
```powershell
ipconfig
```
Busca "IPv4 Address" (ej: 192.168.1.100)

### 2. Accede desde el celular
En el navegador del celular:
```
http://192.168.1.100:5173
```

⚠️ **Nota:** Solo funciona si celular y PC están en la misma red WiFi

---

## 🧪 Pruebas que puedes hacer:

1. **Presiona ON** → Verás el botón verde activado + evento registrado
2. **Presiona OFF** → Verás el botón rojo activado + evento registrado
3. **Navega** entre pestañas (Inicio, Registro, Historial, Perfil)
4. **Observa** los tiempos se calculan automáticamente
5. **Recarga** la página y los datos persisten (en memoria durante la sesión)

---

## 💾 Para Persistencia de Datos

Si quieres que los datos persistan después de cerrar la app:

```typescript
// En sessionStore.ts, agrega:
import { useStorage } from '@vueuse/core'

const medicationEvents = useStorage('medication-events', [])
```

Instala:
```bash
npm install @vueuse/core
```

---

## 🐛 Troubleshooting

**Error: No se conecta desde el celular**
- Verifica que ambos dispositivos estén en la misma red WiFi
- Desactiva el firewall temporalmente
- Usa ngrok (Opción 2) que es más confiable

**Los datos no se guardan**
- Los datos se guardan en memoria (Pinia)
- Para persistencia, usa localStorage (ver sección Persistencia)

