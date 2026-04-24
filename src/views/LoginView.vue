<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLauncherStore } from '../stores/launcher'
import { useLauncherSessionStore } from '../stores/launcherSession'

const launcher = useLauncherStore()
const session = useLauncherSessionStore()

const login = ref(session.rememberedLogin)
const password = ref('')

watch(login, (value) => {
  session.setRememberedLogin(value)
})

const canSubmit = computed(() => {
  if (launcher.isBusy) return false
  if (!login.value.trim()) return false
  if (!password.value.trim()) return false
  return true
})

async function submit() {
  const result = await launcher.login(login.value, password.value)
  if (result?.ok) {
    password.value = ''
  }
}
</script>

<template>
  <div class="flex h-full items-center justify-center p-6">
    <div class="w-full max-w-[430px] rounded-[30px] border border-white/10 bg-[#091022]/92 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div class="mb-7 flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] uppercase tracking-[0.28em] text-violet-300/75">VoidRP Launcher</p>
          <h1 class="mt-3 text-[38px] font-semibold leading-none">Вход</h1>
          <p class="mt-3 text-sm leading-6 text-white/60">
            Войдите в аккаунт, чтобы открыть лаунчер и перейти к запуску игры.
          </p>
        </div>

        <div
          class="rounded-2xl border px-3 py-2 text-xs font-medium"
          :class="(launcher.coreStatus?.running || launcher.initialized)
          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
          : 'border-white/10 bg-white/5 text-white/55'"
        >
          {{ (launcher.coreStatus?.running || launcher.initialized) ? 'Ядро онлайн' : 'Проверка ядра...' }}
        </div>
      </div>

      <form class="space-y-3" @submit.prevent="submit">
        <label class="block">
          <span class="mb-1.5 block text-xs text-white/50">Логин или почта</span>
          <input
            v-model="login"
            type="text"
            autocomplete="username"
            placeholder="Введите логин"
            class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:bg-white/10"
          />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs text-white/50">Пароль</span>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Введите пароль"
            class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition placeholder:text-white/25 focus:border-violet-400/60 focus:bg-white/10"
          />
        </label>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="mt-2 h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ launcher.isBusy ? 'Выполняем вход...' : 'Войти' }}
        </button>
      </form>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
          @click="launcher.openExternal(launcher.links.registerUrl)"
        >
          Регистрация
        </button>

        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
          @click="launcher.openExternal(launcher.links.forgotPasswordUrl)"
        >
          Забыли пароль
        </button>

        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/8 hover:text-white"
          @click="launcher.openExternal(launcher.links.verifyEmailUrl)"
        >
          Подтвердить почту
        </button>
      </div>

      <div
        v-if="launcher.shouldShowProgress"
        class="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-white/90">{{ launcher.progress.title || 'Подготовка' }}</p>
            <p class="mt-1 text-xs leading-5 text-white/55">{{ launcher.progress.details || launcher.statusText }}</p>
          </div>
          <span class="text-xs text-white/55">{{ Math.round(launcher.progress.percent) }}%</span>
        </div>

        <div class="mt-3 h-2 rounded-full bg-white/8">
          <div
            class="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-300"
            :style="{ width: `${launcher.progress.percent}%` }"
          ></div>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-between text-[11px] text-white/35">
        <span>Версия {{ launcher.launcherVersionText }}</span>
        <span>{{ launcher.statusText }}</span>
      </div>
    </div>
  </div>
</template>
