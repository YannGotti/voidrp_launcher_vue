<script setup lang="ts">
import { computed } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()

const hasNation = computed(() => Boolean(launcher.nation.title))
const nationImage = computed(() => launcher.nation.bannerUrl || launcher.nation.bannerPreviewUrl || '')
const nationIcon = computed(() => launcher.nation.iconUrl || launcher.nation.iconPreviewUrl || '')

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
    <template v-if="hasNation">
      <section class="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
        <div
          class="relative min-h-[170px] p-4"
          :style="nationImage ? { backgroundImage: `linear-gradient(180deg, rgba(4,6,11,.18), rgba(4,6,11,.78)), url(${nationImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
        >
          <div class="absolute inset-0" v-if="!nationImage"></div>
          <div class="relative flex h-full items-end justify-between gap-4">
            <div class="flex min-w-0 items-end gap-3">
              <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] border border-white/15 bg-white/8 text-lg font-bold uppercase">
                <img v-if="nationIcon" :src="nationIcon" alt="nation icon" class="h-full w-full object-cover" />
                <span v-else>{{ (launcher.nation.tag || 'ST').slice(0, 2) }}</span>
              </div>

              <div class="min-w-0">
                <p class="text-[10px] uppercase tracking-[0.24em] text-white/55">Государство</p>
                <h2 class="mt-2 truncate text-2xl font-semibold">{{ launcher.nation.title }}</h2>
                <p class="mt-1 text-sm text-white/65">
                  {{ launcher.nation.tag ? `[${launcher.nation.tag}]` : '' }} · {{ launcher.nation.role || 'Участник' }}
                </p>
                <p v-if="launcher.nation.allianceTitle" class="mt-1 text-xs text-white/55">
                  Альянс: {{ launcher.nation.allianceTitle }} {{ launcher.nation.allianceTag ? `[${launcher.nation.allianceTag}]` : '' }}
                </p>
              </div>
            </div>

            <div class="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md text-right">
              <p class="text-[10px] uppercase tracking-[0.18em] text-white/50">Казна</p>
              <p class="mt-1 text-xl font-semibold">{{ formatNumber(launcher.nationStats.treasuryBalance) }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-12 gap-3">
        <div class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
          <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Территория</p>
          <p class="mt-2 text-xl font-semibold">{{ formatNumber(launcher.nationStats.territoryPoints) }}</p>
        </div>
        <div class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
          <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Престиж</p>
          <p class="mt-2 text-xl font-semibold">{{ formatNumber(launcher.nationStats.prestigeScore) }}</p>
        </div>
        <div class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
          <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">Общий онлайн</p>
          <p class="mt-2 text-xl font-semibold">{{ formatNumber(Math.floor((launcher.nationStats.totalPlaytimeMinutes || 0) / 60)) }} ч</p>
        </div>
        <div class="col-span-6 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 md:col-span-3">
          <p class="text-[10px] uppercase tracking-[0.2em] text-white/35">События</p>
          <p class="mt-2 text-xl font-semibold">{{ formatNumber(launcher.nationStats.eventsCompleted) }}</p>
        </div>
      </section>

      <section class="grid grid-cols-12 gap-3">
        <div class="col-span-12 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 xl:col-span-7">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Личная статистика</p>
              <h3 class="mt-1 text-lg font-semibold">Твой вклад в государство</h3>
            </div>
            <div class="text-right">
              <p class="text-[10px] uppercase tracking-[0.18em] text-white/40">Баланс</p>
              <p class="mt-1 text-lg font-semibold">{{ formatNumber(launcher.walletBalance) }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p class="text-lg font-semibold">{{ formatNumber(Math.floor((launcher.playerStats.totalPlaytimeMinutes || 0) / 60)) }} ч</p>
              <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Онлайн</p>
            </div>
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
          </div>

          <div class="mt-3 grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p class="text-base font-semibold">{{ formatNumber(launcher.playerStats.blocksPlaced) }}</p>
              <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Поставлено блоков</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p class="text-base font-semibold">{{ formatNumber(launcher.playerStats.blocksBroken) }}</p>
              <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Сломано блоков</p>
            </div>
          </div>
        </div>

        <div class="col-span-12 rounded-[20px] border border-white/10 bg-white/[0.035] p-4 xl:col-span-5">
          <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Активность</p>
          <h3 class="mt-1 text-lg font-semibold">Последние события</h3>

          <div v-if="!launcher.recentActivity.length" class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/55">
            Активность ещё не загружена.
          </div>

          <div v-else class="mt-4 space-y-2.5">
            <div
              v-for="item in launcher.recentActivity"
              :key="`${item.eventType}_${item.createdAt}`"
              class="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
            >
              <p class="text-sm font-medium text-white">{{ item.message || item.eventType }}</p>
              <p class="mt-1 text-xs text-white/45">{{ formatDate(item.createdAt) }}</p>
            </div>
          </div>
        </div>
      </section>
    </template>

    <section v-else class="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
      <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Государство</p>
      <h2 class="mt-2 text-2xl font-semibold">Игрок пока не состоит в государстве</h2>
      <p class="mt-2 max-w-[560px] text-sm leading-6 text-white/60">
        Когда игрок вступит в государство, здесь появятся казна, территория, престиж, твоя роль и последняя активность.
      </p>
    </section>
  </div>
</template>
