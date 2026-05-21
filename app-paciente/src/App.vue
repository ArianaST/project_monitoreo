<template>
  <div class="relative min-h-screen bg-slate-50">
    <Transition name="patito-splash">
      <section
        v-if="showSplash" 
        class="app-splash fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#fff7f6_0%,_#f8d9d5_36%,_#840705_100%)] px-8 text-center"
      >
        <div class="absolute -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl"></div>
        <div class="absolute -bottom-24 h-72 w-72 rounded-full bg-black/20 blur-3xl"></div>

        <div class="patito-logo-orbit relative mb-6 flex h-40 w-40 items-center justify-center rounded-[2rem] bg-white/95 p-5 shadow-2xl ring-1 ring-white/70">
          <img
            :src="patitoLogo"
            alt="Logo PaTITO"
            class="h-full w-full object-contain"
          />
        </div>

        <div class="space-y-2 text-white drop-shadow-sm">
          <p class="text-xs font-bold uppercase tracking-[0.38em] text-white/80">
            Bienvenido a
          </p>
          <h1 class="patito-word text-5xl font-black tracking-tight">
            PaTITO
          </h1>
        </div>

        <div class="mt-9 flex items-center gap-2 text-white/80">
          <span class="patito-dot"></span>
          <span class="patito-dot animation-delay-150"></span>
          <span class="patito-dot animation-delay-300"></span>
        </div>
      </section>
    </Transition>

    <router-view v-show="!showSplash" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import router from './router'
import patitoLogo from './assets/PATITO_sn.png'
import { initNotificationActionHandlers } from './services/notificationService'
import { useSessionStore } from './stores/sessionStore'

const sessionStore = useSessionStore()
const showSplash = ref(true)

onMounted(async () => {
  sessionStore.startTimer()
  await sessionStore.loadNotificationSettings()
  await initNotificationActionHandlers(router)

  window.setTimeout(() => {
    showSplash.value = false
  }, 1850)
})
</script>

<style scoped>
.patito-splash-enter-active,
.patito-splash-leave-active {
  transition: opacity 420ms ease, transform 420ms ease;
}

.patito-splash-enter-from,
.patito-splash-leave-to {
  opacity: 0;
  transform: scale(1.03);
}

.patito-logo-orbit {
  animation: patito-pop 900ms cubic-bezier(0.2, 0.8, 0.2, 1), patito-float 1700ms ease-in-out infinite 900ms;
}

.patito-word {
  animation: patito-word 900ms ease both 240ms;
}

.patito-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background: currentColor;
  animation: patito-pulse 900ms ease-in-out infinite;
}

.animation-delay-150 {
  animation-delay: 150ms;
}

.animation-delay-300 {
  animation-delay: 300ms;
}

@keyframes patito-pop {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.82) rotate(-4deg);
  }
  70% {
    opacity: 1;
    transform: translateY(-4px) scale(1.04) rotate(1deg);
  }
  100% {
    transform: translateY(0) scale(1) rotate(0);
  }
}

@keyframes patito-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

@keyframes patito-word {
  from {
    opacity: 0;
    letter-spacing: 0.02em;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    letter-spacing: -0.025em;
    transform: translateY(0);
  }
}

@keyframes patito-pulse {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
</style>
