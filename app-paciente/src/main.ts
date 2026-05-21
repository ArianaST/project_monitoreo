import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'

// Estilos (Tailwind se aplica automáticamente por PostCSS)
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

