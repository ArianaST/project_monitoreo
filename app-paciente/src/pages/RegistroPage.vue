<template>
  <div class="min-h-screen bg-white pb-40">
    <div v-if="sessionStore.lastNotification" class="fixed right-4 top-4 z-50 animate-in">
      <div
        :class="[
          'max-w-xs rounded-2xl border p-4 shadow-lg',
          sessionStore.lastNotification.type === 'success'
            ? 'border-green-300 bg-green-100 text-green-800'
            : sessionStore.lastNotification.type === 'error'
              ? 'border-red-300 bg-red-100 text-red-800'
              : 'border-yellow-300 bg-yellow-100 text-yellow-800',
        ]"
      >
        <p class="text-sm font-semibold">{{ sessionStore.lastNotification.message }}</p>
      </div>
    </div>

    <div class="mx-auto max-w-2xl p-6">
      <template v-if="mode === 'menu'">
        <header class="mb-6">
          <div class="mb-4 flex items-center gap-3">
            <img :src="logoPatito" alt="PaTITO" class="h-10 w-10 object-contain" />
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Registro</h1>
              <p class="text-gray-600">Elige qué quieres registrar ahora</p>
            </div>
          </div>
        </header>

        <div class="mb-6 rounded-3xl border-2 border-blue-200 bg-blue-50 p-5">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-blue-900">Flujo de toma actual</p>
              <p class="text-sm text-blue-700">Estado: {{ sessionStore.currentStatus }} · {{ sessionStore.currentPeriodTime }}</p>
            </div>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">
              {{ sessionStore.medicationState || 'SIN ESTADO' }}
            </span>
          </div>
          <div class="h-3 overflow-hidden rounded-full bg-white">
            <div class="h-3 rounded-full bg-blue-600 transition-all" :style="{ width: `${prototypeStore.progreso}%` }" />
          </div>
          <p class="mt-2 text-sm text-blue-800">
            {{ prototypeStore.completadosCount }}/{{ prototypeStore.totalPasos }} pasos completados
          </p>
        </div>

        <div class="space-y-4">
          <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <p class="text-xs font-bold uppercase tracking-wide text-primary">Horas programadas de hoy</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="label in sessionStore.doseScheduleLabelsToday"
                :key="label"
                :class="[
                  'rounded-full px-3 py-1 text-xs font-bold',
                  label === sessionStore.nextDoseLabel ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-rose-100',
                ]"
              >
                {{ label }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-4 rounded-3xl border-2 border-primary bg-rose-50 p-5 text-left transition-transform active:scale-95"
            @click="abrirModo('confirmar')"
          >
            <div class="rounded-2xl bg-primary p-3">
              <Pill class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p class="text-xs font-bold uppercase tracking-wide text-primary">Tomar medicamento</p>
              <p class="text-lg font-bold text-gray-900">Confirmar toma o no toma</p>
              <p class="text-sm text-gray-600">ON si la tomó, OFF si aún no la tomó</p>
            </div>
          </button>

          <button
            type="button"
            :disabled="!canUseSymptomCard"
            :class="[
              'flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              canUseSymptomCard ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50',
            ]"
            @click="abrirModo('sintomas')"
          >
            <div :class="['rounded-2xl p-3', canUseSymptomCard ? 'bg-amber-500' : 'bg-gray-300']">
              <ClipboardList class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p :class="['text-xs font-bold uppercase tracking-wide', canUseSymptomCard ? 'text-amber-700' : 'text-gray-400']">
                {{ faseActual === 'despues' ? 'Después de la toma' : 'Antes de la toma' }}
              </p>
              <p class="text-lg font-bold text-gray-900">Registrar cómo me siento</p>
              <p class="text-sm text-gray-600">Semáforo de síntomas y molestias</p>
            </div>
          </button>

          <button
            type="button"
            :disabled="!canUseTappingCard"
            :class="[
              'flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              canUseTappingCard ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50',
            ]"
            @click="abrirModo('tapping')"
          >
            <div :class="['rounded-2xl p-3', canUseTappingCard ? 'bg-purple-600' : 'bg-gray-300']">
              <Hand class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p :class="['text-xs font-bold uppercase tracking-wide', canUseTappingCard ? 'text-purple-700' : 'text-gray-400']">
                {{ faseActual === 'despues' ? 'Después de la toma' : 'Antes de la toma' }}
              </p>
              <p class="text-lg font-bold text-gray-900">Ejercicio de tapping</p>
              <p class="text-sm text-gray-600">Mide taps durante 10 segundos</p>
            </div>
          </button>


          <button
            type="button"
            :disabled="!canUseAccelerometerCard"
            :class="[
              'flex w-full items-center gap-4 rounded-3xl border-2 p-5 text-left transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
              canUseAccelerometerCard ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-gray-50',
            ]"
            @click="abrirModo('acelerometro')"
          >
            <div :class="['rounded-2xl p-3', canUseAccelerometerCard ? 'bg-teal-600' : 'bg-gray-300']">
              <Activity class="h-7 w-7 text-white" />
            </div>
            <div class="flex-1">
              <p :class="['text-xs font-bold uppercase tracking-wide', canUseAccelerometerCard ? 'text-teal-700' : 'text-gray-400']">
                {{ faseActual === 'despues' ? 'Después de la toma' : 'Antes de la toma' }}
              </p>
              <p class="text-lg font-bold text-gray-900">Prueba acelerómetro</p>
              <p class="text-sm text-gray-600">Mini prueba rápida para registrar temblor</p>
            </div>
          </button>
        </div>
      </template>

      <template v-else-if="mode === 'sintomas'">
        <section v-if="symptomStep === 'confirmacion'" class="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 class="h-16 w-16 text-green-600" />
          </div>
          <h2 class="mb-3 text-3xl font-bold text-gray-900">¡Registro completado!</h2>
          <p class="mb-8 text-lg text-gray-600">
            Guardado como {{ faseActual === 'despues' ? 'después de la toma' : 'antes de la toma' }}
          </p>
          <button
            type="button"
            class="rounded-2xl bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
            @click="volverInicio"
          >
            Volver al inicio
          </button>
        </section>

        <section v-else-if="symptomStep === 'sintomas'">
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="symptomStep = 'estado'">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <h2 class="mb-2 text-2xl font-bold text-gray-900">¿Qué síntomas notas?</h2>
          <p class="mb-6 text-gray-600">Selecciona todos los que apliquen</p>

          <div class="mb-8 space-y-3">
            <button
              v-for="sintoma in symptomOptions"
              :key="sintoma.id"
              type="button"
              :class="[
                'w-full rounded-2xl border-2 p-5 text-left transition-all',
                sintomasSeleccionados.includes(sintoma.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white',
              ]"
              @click="toggleSintoma(sintoma.id)"
            >
              <div class="flex items-center gap-4">
                <span class="text-4xl">{{ sintoma.emoji }}</span>
                <span class="text-lg font-semibold text-gray-900">{{ sintoma.label }}</span>
                <CheckCircle2
                  v-if="sintomasSeleccionados.includes(sintoma.id)"
                  class="ml-auto h-6 w-6 text-blue-600"
                />
              </div>
            </button>
          </div>

          <button
            type="button"
            :disabled="sintomasSeleccionados.length === 0"
            class="w-full rounded-2xl bg-blue-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="guardarRegistroSintomas"
          >
            Guardar registro
          </button>
        </section>

        <section v-else>
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="volverMenu">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mb-5 rounded-2xl bg-gray-50 p-4">
            <p class="text-sm font-semibold text-gray-500">Fase del registro</p>
            <p class="text-lg font-bold text-gray-900">
              {{ faseActual === 'despues' ? 'Después de la toma / ON' : 'Antes de la toma / OFF o pendiente' }}
            </p>
          </div>

          <h2 class="mb-2 text-2xl font-bold text-gray-900">¿Cómo te sientes ahora?</h2>
          <p class="mb-8 text-gray-600">Selecciona tu estado actual</p>

          <div class="mb-12 space-y-4">
            <button
              type="button"
              class="w-full rounded-3xl bg-gradient-to-r from-green-400 to-green-500 p-8 text-white shadow-lg transition-transform active:scale-95"
              @click="seleccionarEstado('verde')"
            >
              <div class="text-left">
                <div class="mb-2 flex items-center gap-3">
                  <Smile class="h-10 w-10" />
                  <h3 class="text-2xl font-bold">Me siento bien</h3>
                </div>
                <p class="text-lg text-green-50">Puedo moverme sin dificultad</p>
              </div>
            </button>

            <button
              type="button"
              class="w-full rounded-3xl bg-gradient-to-r from-yellow-400 to-yellow-500 p-8 text-white shadow-lg transition-transform active:scale-95"
              @click="seleccionarEstado('amarillo')"
            >
              <div class="text-left">
                <div class="mb-2 flex items-center gap-3">
                  <Meh class="h-10 w-10" />
                  <h3 class="text-2xl font-bold">Tengo algo de dificultad</h3>
                </div>
                <p class="text-lg text-yellow-50">Noto algunos síntomas</p>
              </div>
            </button>

            <button
              type="button"
              class="w-full rounded-3xl bg-gradient-to-r from-red-400 to-red-500 p-8 text-white shadow-lg transition-transform active:scale-95"
              @click="seleccionarEstado('rojo')"
            >
              <div class="text-left">
                <div class="mb-2 flex items-center gap-3">
                  <Frown class="h-10 w-10" />
                  <h3 class="text-2xl font-bold">Me cuesta mucho</h3>
                </div>
                <p class="text-lg text-red-50">Tengo dificultad para moverme</p>
              </div>
            </button>
          </div>
        </section>
      </template>

      <template v-else-if="mode === 'confirmar'">
        <section v-if="confirmStep === 'completado'" class="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div :class="['mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full', completionIsOn ? 'bg-blue-100' : 'bg-red-100']">
            <CheckCircle2 v-if="completionIsOn" class="h-16 w-16 text-blue-600" />
            <XCircle v-else class="h-16 w-16 text-red-600" />
          </div>
          <h2 class="mb-3 text-3xl font-bold text-gray-900">
            {{ completionIsOn ? '¡Toma registrada!' : 'No toma registrada' }}
          </h2>
          <p class="mb-3 text-lg text-gray-600">
            {{ completionIsOn ? 'Estado ON activado' : 'Estado OFF activado' }}
          </p>
          <p class="mb-8 text-gray-500">Próxima dosis programada: {{ sessionStore.nextDoseLabel }}</p>
          <button
            type="button"
            class="rounded-2xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
            @click="volverInicio"
          >
            Volver al inicio
          </button>
        </section>

        <section v-else-if="confirmStep === 'registro'">
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="confirmStep = 'confirmar'">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <h2 class="mb-2 text-2xl font-bold text-gray-900">¿A qué hora la tomaste?</h2>
          <p class="mb-8 text-gray-600">Ajusta la hora si fue antes o después de la programada</p>

          <div class="mb-8 rounded-3xl bg-gray-50 p-8">
            <div class="mb-6 flex items-center justify-center gap-4">
              <Clock class="h-8 w-8 text-blue-600" />
              <input
                v-model="horaSeleccionada"
                type="time"
                class="bg-transparent text-center text-5xl font-bold text-gray-900 focus:outline-none"
              />
            </div>
            <p class="text-center text-gray-600">Hora programada: {{ sessionStore.scheduledDoseLabel }}</p>
          </div>

          <div class="mb-8 space-y-3">
            <button
              type="button"
              class="w-full rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 font-semibold text-blue-900 transition-transform active:scale-95"
              @click="usarHoraProgramada"
            >
              A la hora programada ({{ sessionStore.scheduledDoseLabel }})
            </button>
            <button
              type="button"
              class="w-full rounded-2xl border-2 border-gray-200 bg-white p-4 font-semibold text-gray-900 transition-transform active:scale-95"
              @click="usarHoraActual"
            >
              Ahora mismo
            </button>
          </div>

          <button
            type="button"
            :disabled="sessionStore.isProcessing"
            class="w-full rounded-2xl bg-blue-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300"
            @click="confirmarToma"
          >
            {{ sessionStore.isProcessing ? 'Guardando...' : 'Confirmar toma / ON' }}
          </button>
        </section>

        <section v-else>
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="volverMenu">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mt-8 text-center">
            <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
              <Clock class="h-14 w-14 text-blue-600" />
            </div>

            <h2 class="mb-2 text-2xl font-bold text-gray-900">Confirmar toma</h2>
            <p class="mb-8 text-gray-600">Selecciona qué pasó con la levodopa</p>

            <div class="mb-8 rounded-2xl bg-blue-50 p-6">
              <p class="mb-1 text-lg font-semibold text-gray-900">{{ sessionStore.levodopaDoseLabel }}</p>
              <p class="text-gray-600">Programada: {{ sessionStore.scheduledDoseLabel }} · Cada {{ sessionStore.levodopaIntervalHours }} h</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                class="rounded-3xl border-2 border-green-400 bg-green-50 p-5 text-left shadow-sm transition-transform active:scale-95"
                @click="confirmStep = 'registro'"
              >
                <div class="mb-3 flex items-center gap-3">
                  <div class="rounded-2xl bg-green-500 p-3">
                    <CheckCircle2 class="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wide text-green-700">Estado ON</p>
                    <p class="text-xl font-bold text-gray-900">Ya la tomé</p>
                  </div>
                </div>
                <p class="text-sm text-gray-600">Activa medición después de la toma y suma tiempo ON.</p>
              </button>

              <button
                type="button"
                :disabled="sessionStore.isProcessing"
                class="rounded-3xl border-2 border-red-300 bg-red-50 p-5 text-left shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                @click="registrarNoTomada"
              >
                <div class="mb-3 flex items-center gap-3">
                  <div class="rounded-2xl bg-red-500 p-3">
                    <XCircle class="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p class="text-xs font-bold uppercase tracking-wide text-red-700">Estado OFF</p>
                    <p class="text-xl font-bold text-gray-900">Todavía no</p>
                  </div>
                </div>
                <p class="text-sm text-gray-600">Registra evento en resumen de hoy y suma tiempo OFF.</p>
              </button>
            </div>

            <div class="mt-8 rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-4 text-left">
              <p class="text-sm text-yellow-800">
                💡 Primero puedes medir síntomas y tapping antes de la toma. Después de “Ya la tomé”, se habilita la medición posterior.
              </p>
            </div>
          </div>
        </section>
      </template>

      <template v-else-if="mode === 'tapping'">
        <section v-if="tappingStep === 'resultado'" class="text-center">
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="tappingStep = 'inicio'">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mt-12">
            <div :class="['mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full', performanceClasses.bg]">
              <CheckCircle2 :class="['h-16 w-16', performanceClasses.text]" />
            </div>

            <h2 class="mb-3 text-3xl font-bold text-gray-900">¡Ejercicio completado!</h2>

            <div class="mb-6 rounded-3xl bg-white p-8 shadow-lg">
              <p class="mb-2 text-gray-600">Tus taps</p>
              <p class="mb-4 text-6xl font-bold text-gray-900">{{ taps }}</p>
              <div :class="['inline-block rounded-full px-6 py-2 font-semibold', performanceClasses.badge]">
                {{ performanceLabel }} · {{ faseActual === 'despues' ? 'Después' : 'Antes' }}
              </div>
            </div>

            <div class="mb-8 rounded-2xl bg-blue-50 p-6 text-left">
              <h3 class="mb-3 font-semibold text-gray-900">Comparación con registros anteriores</h3>
              <div class="space-y-2 text-sm text-gray-700">
                <div class="flex justify-between">
                  <span>Hoy:</span>
                  <span class="font-semibold">{{ taps }} taps</span>
                </div>
                <div class="flex justify-between">
                  <span>Velocidad:</span>
                  <span class="font-semibold">{{ tapsPerSecond }} taps/s</span>
                </div>
                <div class="flex justify-between">
                  <span>Fase:</span>
                  <span class="font-semibold">{{ faseActual === 'despues' ? 'Después de levodopa' : 'Antes de levodopa' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <button
                type="button"
                class="w-full rounded-2xl bg-blue-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
                @click="volverInicio"
              >
                Volver al inicio
              </button>
              <button
                type="button"
                class="w-full rounded-2xl border-2 border-gray-300 bg-white py-5 text-lg font-semibold text-gray-700 transition-transform active:scale-95"
                @click="iniciarTapping"
              >
                Repetir ejercicio
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="tappingStep === 'ejercicio'" class="flex min-h-[75vh] flex-col bg-gradient-to-b from-purple-50 to-white">
          <div class="mb-8 text-center">
            <div class="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
              <span class="text-4xl font-bold text-purple-600">{{ timeLeft }}</span>
            </div>
            <p class="text-xl text-gray-600">segundos restantes</p>
          </div>

          <div class="flex flex-1 items-center justify-center">
            <button
              type="button"
              class="flex h-72 w-72 flex-col items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-2xl transition-transform active:scale-95"
              @click="handleTap"
            >
              <Hand class="mb-4 h-20 w-20" />
              <span class="mb-2 text-6xl font-bold">{{ taps }}</span>
              <span class="text-xl">¡Toca aquí!</span>
            </button>
          </div>

          <div class="mb-8 text-center text-gray-600">
            <p class="text-lg">Toca el círculo lo más rápido que puedas</p>
          </div>
        </section>

        <section v-else>
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="volverMenu">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mt-8 text-center">
            <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-purple-100">
              <Hand class="h-14 w-14 text-purple-600" />
            </div>

            <h2 class="mb-3 text-2xl font-bold text-gray-900">Ejercicio de tapping</h2>
            <p class="mb-8 text-gray-600">Mide tu velocidad de movimiento</p>

            <div class="mb-8 rounded-3xl bg-purple-50 p-6">
              <h3 class="mb-4 font-semibold text-gray-900">¿Cómo funciona?</h3>
              <div class="space-y-3 text-left">
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white">1</div>
                  <p class="text-gray-700">Toca el círculo morado lo más rápido que puedas</p>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white">2</div>
                  <p class="text-gray-700">El ejercicio dura 10 segundos</p>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 font-bold text-white">3</div>
                  <p class="text-gray-700">Queda ligado a la fase {{ faseActual === 'despues' ? 'después' : 'antes' }} de la toma</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-2xl bg-purple-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
              @click="iniciarTapping"
            >
              Comenzar ejercicio
            </button>
          </div>
        </section>
      </template>

      <template v-else-if="mode === 'acelerometro'">
        <section v-if="accelerometerStep === 'resultado' && accelerometerResult" class="text-center">
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="accelerometerStep = 'inicio'">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mt-12">
            <div :class="['mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full', accelerometerLevelClasses.bg]">
              <Activity :class="['h-16 w-16', accelerometerLevelClasses.text]" />
            </div>

            <h2 class="mb-3 text-3xl font-bold text-gray-900">Prueba completada</h2>

            <div class="mb-6 rounded-3xl bg-white p-8 shadow-lg">
              <p class="mb-2 text-gray-600">Índice de movimiento</p>
              <p class="mb-4 text-6xl font-bold text-gray-900">{{ accelerometerResult.tremorScore }}</p>
              <div :class="['inline-block rounded-full px-6 py-2 font-semibold', accelerometerLevelClasses.badge]">
                Nivel {{ accelerometerResult.level }} · {{ faseActual === 'despues' ? 'Después' : 'Antes' }}
              </div>
            </div>

            <div class="mb-8 rounded-2xl bg-teal-50 p-6 text-left">
              <h3 class="mb-3 font-semibold text-gray-900">Datos capturados</h3>
              <div class="space-y-2 text-sm text-gray-700">
                <div class="flex justify-between">
                  <span>Muestras:</span>
                  <span class="font-semibold">{{ accelerometerResult.samples }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Duración:</span>
                  <span class="font-semibold">{{ Math.round(accelerometerResult.durationMs / 1000) }} s</span>
                </div>
                <div class="flex justify-between">
                  <span>Pico de movimiento:</span>
                  <span class="font-semibold">{{ accelerometerResult.peakMagnitude }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Fase:</span>
                  <span class="font-semibold">{{ faseActual === 'despues' ? 'Después de levodopa' : 'Antes de levodopa' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <button
                type="button"
                class="w-full rounded-2xl bg-teal-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
                @click="volverInicio"
              >
                Volver al inicio
              </button>
              <button
                type="button"
                class="w-full rounded-2xl border-2 border-gray-300 bg-white py-5 text-lg font-semibold text-gray-700 transition-transform active:scale-95"
                @click="iniciarAcelerometro"
              >
                Repetir prueba
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="accelerometerStep === 'midiendo'" class="flex min-h-[75vh] flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white text-center">
          <div class="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-teal-100">
            <span class="text-5xl font-bold text-teal-700">{{ accelerometerTimeLeft }}</span>
          </div>
          <h2 class="mb-3 text-3xl font-bold text-gray-900">Midiendo temblor</h2>
          <p class="mb-8 max-w-sm text-lg text-gray-600">Sostén el celular con la mano que quieres evaluar. Mantén la postura hasta que termine.</p>
          <div class="h-3 w-full max-w-sm overflow-hidden rounded-full bg-white">
            <div class="h-3 rounded-full bg-teal-600 transition-all" :style="{ width: `${((8 - accelerometerTimeLeft) / 8) * 100}%` }" />
          </div>
        </section>

        <section v-else-if="accelerometerStep === 'error'" class="flex min-h-[70vh] flex-col items-center justify-center text-center">
          <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
            <XCircle class="h-16 w-16 text-red-600" />
          </div>
          <h2 class="mb-3 text-3xl font-bold text-gray-900">No se pudo medir</h2>
          <p class="mb-8 text-lg text-gray-600">{{ accelerometerError }}</p>
          <button
            type="button"
            class="rounded-2xl bg-teal-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
            @click="iniciarAcelerometro"
          >
            Intentar de nuevo
          </button>
        </section>

        <section v-else>
          <button type="button" class="mb-6 flex items-center gap-2 text-gray-600" @click="volverMenu">
            <ArrowLeft class="h-6 w-6" />
            <span class="text-lg">Volver</span>
          </button>

          <div class="mt-8 text-center">
            <div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-teal-100">
              <Activity class="h-14 w-14 text-teal-600" />
            </div>

            <h2 class="mb-3 text-2xl font-bold text-gray-900">Prueba acelerómetro</h2>
            <p class="mb-8 text-gray-600">Mini prueba de 8 segundos para registrar movimiento/temblor</p>

            <div class="mb-8 rounded-3xl bg-teal-50 p-6">
              <h3 class="mb-4 font-semibold text-gray-900">¿Cómo funciona?</h3>
              <div class="space-y-3 text-left">
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 font-bold text-white">1</div>
                  <p class="text-gray-700">Sostén el celular con la mano a evaluar</p>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 font-bold text-white">2</div>
                  <p class="text-gray-700">La app lee el acelerómetro durante 8 segundos</p>
                </div>
                <div class="flex gap-3">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 font-bold text-white">3</div>
                  <p class="text-gray-700">Queda ligado a la fase {{ faseActual === 'despues' ? 'después' : 'antes' }} de la toma</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-2xl bg-teal-600 py-5 text-lg font-semibold text-white shadow-md transition-transform active:scale-95"
              @click="iniciarAcelerometro"
            >
              Comenzar prueba
            </button>
          </div>
        </section>
      </template>
    </div>

    <nav-bar />
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  Frown,
  Hand,
  Meh,
  Pill,
  Smile,
  XCircle,
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import logoPatito from '../assets/PATITO_sn.png'
import NavBar from '../components/NavBar.vue'
import { runAccelerometerTest } from '../services/accelerometerService'
import { usePrototypeStore, type AccelerometerSummary, type FlowPhase } from '../stores/prototypeStore'
import { useSessionStore } from '../stores/sessionStore'

type RegistroMode = 'menu' | 'sintomas' | 'confirmar' | 'tapping' | 'acelerometro'
type SymptomStep = 'estado' | 'sintomas' | 'confirmacion'
type ConfirmStep = 'confirmar' | 'registro' | 'completado'
type TappingStep = 'inicio' | 'ejercicio' | 'resultado'
type AccelerometerStep = 'inicio' | 'midiendo' | 'resultado' | 'error'
type EstadoSemaforo = 'verde' | 'amarillo' | 'rojo'

const route = useRoute()
const router = useRouter()
const prototypeStore = usePrototypeStore()
const sessionStore = useSessionStore()

const mode = computed<RegistroMode>(() => {
  const raw = Array.isArray(route.query.modo) ? route.query.modo[0] : route.query.modo
  if (raw === 'sintomas' || raw === 'confirmar' || raw === 'tapping' || raw === 'acelerometro') return raw
  return 'menu'
})

const faseActual = computed<FlowPhase>(() => {
  const raw = Array.isArray(route.query.fase) ? route.query.fase[0] : route.query.fase
  if (raw === 'antes' || raw === 'despues') return raw
  return sessionStore.medicationState === 'ON' ? 'despues' : 'antes'
})

const canUseSymptomCard = computed(() =>
  faseActual.value === 'despues'
    ? sessionStore.canRegisterAfterDose
    : sessionStore.canRegisterBeforeDose
)
const canUseTappingCard = computed(() => canUseSymptomCard.value)
const canUseAccelerometerCard = computed(() => canUseSymptomCard.value)

const symptomStep = ref<SymptomStep>('estado')
const estadoSeleccionado = ref<EstadoSemaforo | null>(null)
const sintomasSeleccionados = ref<string[]>([])

const confirmStep = ref<ConfirmStep>('confirmar')
const completionIsOn = ref(true)
const horaSeleccionada = ref('08:00')

const tappingStep = ref<TappingStep>('inicio')
const taps = ref(0)
const timeLeft = ref(10)
const isTappingActive = ref(false)
let tappingTimer: number | null = null

const accelerometerStep = ref<AccelerometerStep>('inicio')
const accelerometerResult = ref<AccelerometerSummary | null>(null)
const accelerometerError = ref('')
const accelerometerTimeLeft = ref(8)
let accelerometerTimer: number | null = null

const symptomOptions = [
  { id: 'temblor', label: 'Tengo temblor', emoji: '🤲' },
  { id: 'rigidez', label: 'Siento rigidez', emoji: '🦴' },
  { id: 'lentitud', label: 'Me muevo con dificultad', emoji: '🐢' },
  { id: 'equilibrio', label: 'Me cuesta mantener el equilibrio', emoji: '⚖️' },
  { id: 'ninguno', label: 'No tengo síntomas', emoji: '✅' },
]

const performanceLabel = computed(() => {
  if (taps.value >= 50) return '🎉 Excelente'
  if (taps.value >= 35) return '👍 Bien hecho'
  return '✅ Completado'
})

const performanceClasses = computed(() => {
  if (taps.value >= 50) {
    return { bg: 'bg-green-100', text: 'text-green-600', badge: 'bg-green-100 text-green-800' }
  }
  if (taps.value >= 35) {
    return { bg: 'bg-blue-100', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-800' }
  }
  return { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' }
})

const tapsPerSecond = computed(() => (taps.value / 10).toFixed(1))

const accelerometerLevelClasses = computed(() => {
  const level = accelerometerResult.value?.level
  if (level === 'alto') return { bg: 'bg-red-100', text: 'text-red-600', badge: 'bg-red-100 text-red-800' }
  if (level === 'medio') return { bg: 'bg-yellow-100', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' }
  return { bg: 'bg-teal-100', text: 'text-teal-600', badge: 'bg-teal-100 text-teal-800' }
})

watch(mode, () => {
  symptomStep.value = 'estado'
  confirmStep.value = 'confirmar'
  tappingStep.value = 'inicio'
  estadoSeleccionado.value = null
  sintomasSeleccionados.value = []
  syncSelectedTimeWithSchedule()
  clearTappingTimer()
  clearAccelerometerTimer()
  accelerometerStep.value = 'inicio'
  accelerometerResult.value = null
  accelerometerError.value = ''
})

function abrirModo(nextMode: Exclude<RegistroMode, 'menu'>) {
  if (nextMode !== 'confirmar' && !canUseSymptomCard.value) return
  router.push({ path: '/registro', query: { modo: nextMode, fase: faseActual.value } })
}

function volverMenu() {
  router.push('/registro')
}

function volverInicio() {
  router.push('/inicio')
}

function seleccionarEstado(estado: EstadoSemaforo) {
  estadoSeleccionado.value = estado
  symptomStep.value = 'sintomas'
}

function toggleSintoma(sintomaId: string) {
  if (sintomaId === 'ninguno') {
    sintomasSeleccionados.value = sintomasSeleccionados.value.includes('ninguno') ? [] : ['ninguno']
    return
  }

  const withoutNone = sintomasSeleccionados.value.filter((item) => item !== 'ninguno')
  if (withoutNone.includes(sintomaId)) {
    sintomasSeleccionados.value = withoutNone.filter((item) => item !== sintomaId)
    return
  }
  sintomasSeleccionados.value = [...withoutNone, sintomaId]
}

async function guardarRegistroSintomas() {
  if (!estadoSeleccionado.value || sintomasSeleccionados.value.length === 0) return
  const record = prototypeStore.guardarSintomas(estadoSeleccionado.value, sintomasSeleccionados.value, faseActual.value)
  await sessionStore.registrarActividad({
    tipo: 'sintomas',
    fase: record.phase,
    timestamp: record.timestamp,
    estadoSintomas: record.estado,
    sintomas: record.sintomas,
  })
  symptomStep.value = 'confirmacion'
}

function syncSelectedTimeWithSchedule() {
  const scheduled = sessionStore.scheduledDoseTime
  horaSeleccionada.value = `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`
}

function usarHoraActual() {
  const now = new Date()
  horaSeleccionada.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function usarHoraProgramada() {
  syncSelectedTimeWithSchedule()
}

function buildSelectedDateTime() {
  const [hours, minutes] = horaSeleccionada.value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

async function confirmarToma() {
  try {
    await sessionStore.setMedicationState('ON', {
      timestamp: buildSelectedDateTime(),
      tipoEvento: 'toma_confirmada',
      horaProgramada: sessionStore.scheduledDoseTime,
    })
    prototypeStore.setMedicationDecision(true)
    completionIsOn.value = true
    confirmStep.value = 'completado'
  } catch {
    confirmStep.value = 'registro'
  }
}

async function registrarNoTomada() {
  try {
    await sessionStore.setMedicationState('OFF', {
      timestamp: new Date(),
      tipoEvento: 'toma_no_realizada',
      horaProgramada: sessionStore.scheduledDoseTime,
    })
    prototypeStore.setMedicationDecision(false)
    completionIsOn.value = false
    confirmStep.value = 'completado'
  } catch {
    confirmStep.value = 'confirmar'
  }
}

function clearTappingTimer() {
  if (tappingTimer !== null) {
    window.clearInterval(tappingTimer)
    tappingTimer = null
  }
  isTappingActive.value = false
}

function iniciarTapping() {
  clearTappingTimer()
  tappingStep.value = 'ejercicio'
  taps.value = 0
  timeLeft.value = 10
  isTappingActive.value = true

  tappingTimer = window.setInterval(() => {
    if (timeLeft.value <= 1) {
      timeLeft.value = 0
      tappingStep.value = 'resultado'
      const record = prototypeStore.guardarTapping(taps.value, faseActual.value)
      void sessionStore.registrarActividad({
        tipo: 'tapping',
        fase: record.phase,
        timestamp: record.timestamp,
        taps: record.taps,
      })
      clearTappingTimer()
      return
    }

    timeLeft.value -= 1
  }, 1000)
}

function handleTap() {
  if (isTappingActive.value) {
    taps.value += 1
  }
}


function clearAccelerometerTimer() {
  if (accelerometerTimer !== null) {
    window.clearInterval(accelerometerTimer)
    accelerometerTimer = null
  }
}

async function iniciarAcelerometro() {
  clearAccelerometerTimer()
  accelerometerStep.value = 'midiendo'
  accelerometerResult.value = null
  accelerometerError.value = ''
  accelerometerTimeLeft.value = 8

  accelerometerTimer = window.setInterval(() => {
    accelerometerTimeLeft.value = Math.max(0, accelerometerTimeLeft.value - 1)
    if (accelerometerTimeLeft.value === 0) clearAccelerometerTimer()
  }, 1000)

  try {
    const result = await runAccelerometerTest(8000)
    const record = prototypeStore.guardarAcelerometro(result, faseActual.value)
    accelerometerResult.value = result
    await sessionStore.registrarActividad({
      tipo: 'acelerometro',
      fase: record.phase,
      timestamp: record.timestamp,
      metadata: {
        ...record.result,
        nota: 'Prueba rápida de acelerómetro; no reemplaza evaluación clínica.',
      },
    })
    accelerometerStep.value = 'resultado'
  } catch (error) {
    accelerometerError.value = error instanceof Error ? error.message : 'Revisa permisos de movimiento del celular'
    accelerometerStep.value = 'error'
  } finally {
    clearAccelerometerTimer()
  }
}

onMounted(async () => {
  await sessionStore.loadPatientName()
  await sessionStore.loadLocalSnapshot()
  await prototypeStore.loadPrototypeRecords()
  syncSelectedTimeWithSchedule()
})

onBeforeUnmount(() => {
  clearTappingTimer()
  clearAccelerometerTimer()
  accelerometerStep.value = 'inicio'
  accelerometerResult.value = null
  accelerometerError.value = ''
})
</script>