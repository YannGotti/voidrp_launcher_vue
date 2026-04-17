<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const route = useRoute()

const navItems = [
  { title: 'Главная', to: '/home' },
  { title: 'Государство', to: '/nation' },
  { title: 'Аккаунт', to: '/account' },
  { title: 'Настройки', to: '/settings' }
]
</script>

<template>
  <div class="mx-auto flex h-full max-w-[1180px] flex-col gap-3 p-4">
    <header class="rounded-[24px] border border-white/10 bg-[#091022]/88 px-4 py-3 backdrop-blur-xl">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="text-[10px] uppercase tracking-[0.26em] text-violet-300/75">VoidRP Launcher</p>

          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            <h1 class="truncate text-xl font-semibold">{{ launcher.accountNickname }}</h1>

            <span
              v-if="launcher.nation.title"
              class="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium text-violet-200"
            >
              {{ launcher.nation.tag ? `[${launcher.nation.tag}]` : 'Государство' }}
            </span>

            <span class="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200">
              Готов
            </span>
          </div>

          <p class="mt-1 truncate text-xs text-white/55">
            {{ launcher.accountMeta.login }} • {{ launcher.accountMeta.email }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.logout()"
          >
            Выйти
          </button>

          <button
            class="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="launcher.isBusy"
            @click="launcher.play()"
          >
            {{ launcher.isBusy ? 'Подготовка...' : 'Играть' }}
          </button>
        </div>
      </div>
    </header>

    <section
      v-if="launcher.shouldShowProgress"
      class="rounded-[20px] border border-white/10 bg-[#091022]/82 px-4 py-3 backdrop-blur-xl"
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
    </section>

    <div class="flex min-h-0 flex-1 gap-3">
      <aside class="w-[210px] shrink-0 rounded-[24px] border border-white/10 bg-[#091022]/82 p-3 backdrop-blur-xl">
        <nav class="space-y-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block rounded-2xl px-3 py-2.5 text-sm transition"
            :class="route.path === item.to ? 'bg-violet-500/15 text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'"
          >
            {{ item.title }}
          </RouterLink>
        </nav>

        <div class="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">Лаунчер</p>
          <p class="mt-2 text-sm font-medium text-white/90">Версия {{ launcher.launcherVersionText }}</p>
          <p class="mt-1 text-xs leading-5 text-white/50">{{ launcher.statusText }}</p>
        </div>
      </aside>

      <main class="min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[#091022]/82 backdrop-blur-xl">
        <div class="h-full overflow-auto p-4">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
