<script setup lang="ts">
import { computed } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const diagnosticsText = computed(() => launcher.diagnosticsText?.trim() || 'Диагностика пока пуста.')

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0)
  return new Intl.NumberFormat('ru-RU').format(Number.isFinite(numeric) ? numeric : 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
</script>

<template>
  <div class="space-y-3">
    <section class="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Профиль</p>
          <p class="mt-2 text-2xl font-semibold">{{ launcher.accountNickname }}</p>
          <p class="mt-1 text-sm text-white/55">{{ launcher.accountMeta.login }}</p>
          <p class="mt-1 text-sm text-white/55">{{ launcher.accountMeta.email }}</p>
          <p class="mt-2 text-xs text-white/50">{{ launcher.emailVerifiedText }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3 md:min-w-[340px]">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <p class="text-lg font-semibold">{{ formatNumber(launcher.walletBalance) }}</p>
            <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Баланс</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <p class="text-lg font-semibold">{{ formatNumber(Math.floor((launcher.playerStats.totalPlaytimeMinutes || 0) / 60)) }} ч</p>
            <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Онлайн</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Личная статистика</p>
          <h2 class="mt-1 text-lg font-semibold">Игровые показатели</h2>
        </div>
        <div class="text-right text-xs text-white/45">
          <p>Последний онлайн: {{ formatDate(launcher.playerStats.lastSeenAt) }}</p>
          <p class="mt-1">Синхронизация: {{ formatDate(launcher.playerStats.lastSyncedAt) }}</p>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-lg font-semibold">{{ formatNumber(launcher.playerStats.pvpKills) }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">PvP</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-lg font-semibold">{{ formatNumber(launcher.playerStats.mobKills) }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Мобы</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-lg font-semibold">{{ formatNumber(launcher.playerStats.deaths) }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Смерти</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-lg font-semibold">{{ launcher.playerStats.source || '—' }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Источник</p>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-2 gap-3">
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-base font-semibold">{{ formatNumber(launcher.playerStats.blocksPlaced) }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Поставлено</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-base font-semibold">{{ formatNumber(launcher.playerStats.blocksBroken) }}</p>
          <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Сломано</p>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Аккаунт</p>

      <div class="mt-4 flex flex-wrap gap-2.5">
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

    <section class="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <p class="text-sm text-white/45">Диагностика</p>

        <button
          class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65 transition hover:bg-white/8 hover:text-white"
          @click="launcher.clearDiagnostics()"
        >
          Очистить
        </button>
      </div>

      <pre class="max-h-[250px] overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-white/8 bg-[#060912] p-4 text-xs leading-5 text-white/65">{{ diagnosticsText }}</pre>
    </section>
  </div>
</template>
