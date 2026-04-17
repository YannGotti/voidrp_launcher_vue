<script setup lang="ts">
import { computed } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0)
  return new Intl.NumberFormat('ru-RU').format(Number.isFinite(numeric) ? numeric : 0)
}

const hasNation = computed(() => Boolean(launcher.nation.title))
</script>

<template>
  <div class="grid grid-cols-12 gap-3">
    <section class="col-span-12 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 xl:col-span-7">
      <p class="text-[10px] uppercase tracking-[0.25em] text-violet-300/70">Запуск</p>

      <h2 class="mt-2 text-2xl font-semibold leading-tight">
        Всё готово для входа
      </h2>

      <p class="mt-2 max-w-[560px] text-sm leading-6 text-white/60">
        Лаунчер проверит клиент, синхронизирует файлы и запустит Minecraft с твоим аккаунтом.
      </p>

      <div class="mt-4 flex flex-wrap gap-2.5">
        <button
          class="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="launcher.isBusy"
          @click="launcher.play()"
        >
          {{ launcher.isBusy ? 'Подготовка...' : 'Играть' }}
        </button>

        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="launcher.isBusy"
          @click="launcher.repair()"
        >
          Починить клиент
        </button>
      </div>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 xl:col-span-2">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Баланс</p>
      <p class="mt-2 text-xl font-semibold">{{ formatNumber(launcher.walletBalance) }}</p>
      <p class="mt-1 text-xs text-white/55">деньги игрока</p>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 xl:col-span-3">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Государство</p>
      <template v-if="hasNation">
        <p class="mt-2 text-lg font-semibold">{{ launcher.nation.title }}</p>
        <p class="mt-1 text-xs text-white/55">{{ launcher.nation.tag ? `[${launcher.nation.tag}]` : '' }} · {{ launcher.nation.role || 'Участник' }}</p>
      </template>
      <template v-else>
        <p class="mt-2 text-lg font-semibold">Не выбрано</p>
        <p class="mt-1 text-xs text-white/55">государства нет</p>
      </template>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Казна</p>
      <p class="mt-2 text-lg font-semibold">{{ formatNumber(launcher.nationStats.treasuryBalance) }}</p>
      <p class="mt-1 text-xs text-white/55">баланс государства</p>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Территория</p>
      <p class="mt-2 text-lg font-semibold">{{ formatNumber(launcher.nationStats.territoryPoints) }}</p>
      <p class="mt-1 text-xs text-white/55">очки территории</p>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Престиж</p>
      <p class="mt-2 text-lg font-semibold">{{ formatNumber(launcher.nationStats.prestigeScore) }}</p>
      <p class="mt-1 text-xs text-white/55">сила государства</p>
    </section>

    <section class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
      <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">PvP</p>
      <p class="mt-2 text-lg font-semibold">{{ formatNumber(launcher.playerStats.pvpKills) }}</p>
      <p class="mt-1 text-xs text-white/55">личные убийства</p>
    </section>
  </div>
</template>
