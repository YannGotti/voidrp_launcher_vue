<script setup lang="ts">
import { computed } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()

const diagnosticsText = computed(() => {
  return launcher.diagnosticsText?.trim() || 'Диагностика пока пуста.'
})
</script>

<template>
  <div class="max-w-[920px]">
    <p class="text-[11px] uppercase tracking-[0.25em] text-violet-300/70">
      Аккаунт
    </p>

    <h2 class="mt-2 text-3xl font-semibold leading-tight">
      Профиль игрока
    </h2>

    <div class="mt-5 grid gap-4">
      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p class="text-sm text-white/45">Игровой ник</p>
        <p class="mt-2 text-2xl font-semibold">
          {{ launcher.accountNickname }}
        </p>
      </section>

      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p class="text-sm text-white/45">Аккаунт</p>
        <p class="mt-2 text-base font-medium">
          {{ launcher.accountMeta.login }}
        </p>
        <p class="mt-1 text-sm text-white/60">
          {{ launcher.accountMeta.email }}
        </p>
        <p class="mt-3 text-sm text-white/55">
          {{ launcher.emailVerifiedText }}
        </p>
      </section>

      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p class="text-sm text-white/45">Полезные ссылки</p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.openExternal(launcher.links.verifyEmailUrl)"
          >
            Подтвердить почту
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.openExternal(launcher.links.forgotPasswordUrl)"
          >
            Сменить пароль
          </button>

          <button
            class="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-2.5 text-sm text-red-100 transition hover:bg-red-400/15"
            @click="launcher.logout()"
          >
            Выйти из аккаунта
          </button>
        </div>
      </section>

      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-sm text-white/45">Диагностика</p>

          <button
            class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65 transition hover:bg-white/8 hover:text-white"
            @click="launcher.clearDiagnostics()"
          >
            Очистить
          </button>
        </div>

        <pre class="max-h-[260px] overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-white/8 bg-[#060912] p-4 text-xs leading-5 text-white/65">{{ diagnosticsText }}</pre>
      </section>
    </div>
  </div>
</template>