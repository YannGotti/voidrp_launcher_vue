<script setup lang="ts">
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
</script>

<template>
  <div class="grid grid-cols-12 gap-4">
    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 xl:col-span-8">
      <p class="text-[11px] uppercase tracking-[0.25em] text-violet-300/70">
        Запуск
      </p>

      <h2 class="mt-2 text-3xl font-semibold leading-tight">
        Всё готово для входа в игру
      </h2>

      <p class="mt-3 max-w-[620px] text-sm leading-6 text-white/60">
        Нажмите «Играть», чтобы лаунчер проверил клиент, синхронизировал файлы
        и запустил Minecraft с вашего аккаунта.
      </p>

      <div class="mt-5 flex flex-wrap gap-3">
        <button
          class="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="launcher.isBusy"
          @click="launcher.play()"
        >
          {{ launcher.isBusy ? 'Подготовка...' : 'Играть' }}
        </button>

        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/70 transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="launcher.isBusy"
          @click="launcher.repair()"
        >
          Починить клиент
        </button>
      </div>
    </section>

    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 md:col-span-6 xl:col-span-4">
      <p class="text-[11px] uppercase tracking-[0.25em] text-white/35">
        Аккаунт
      </p>
      <p class="mt-2 text-xl font-semibold">
        {{ launcher.accountNickname }}
      </p>
      <p class="mt-1 text-sm text-white/55">
        {{ launcher.accountMeta.login }} • {{ launcher.accountMeta.email }}
      </p>
      <p class="mt-3 text-sm text-white/60">
        {{ launcher.emailVerifiedText }}
      </p>
    </section>

    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 md:col-span-6 xl:col-span-4">
      <p class="text-[11px] uppercase tracking-[0.25em] text-white/35">
        Память
      </p>
      <p class="mt-2 text-xl font-semibold">
        {{ launcher.currentMemoryText }}
      </p>
      <p class="mt-1 text-sm text-white/55">
        Текущее значение для Minecraft
      </p>
    </section>

    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 md:col-span-6 xl:col-span-4">
      <p class="text-[11px] uppercase tracking-[0.25em] text-white/35">
        Локальное ядро
      </p>
      <p class="mt-2 text-xl font-semibold">
        {{ launcher.coreStatus.running ? 'Подключено' : 'Недоступно' }}
      </p>
      <p class="mt-1 text-sm text-white/55">
        {{ launcher.coreStatus.message || launcher.coreStatus.lastError || 'Рабочее состояние ядра.' }}
      </p>
    </section>

    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 md:col-span-6 xl:col-span-4">
      <p class="text-[11px] uppercase tracking-[0.25em] text-white/35">
        Состояние
      </p>
      <p class="mt-2 text-xl font-semibold">
        {{ launcher.statusText }}
      </p>
      <p class="mt-1 text-sm text-white/55">
        Версия лаунчера: {{ launcher.launcherVersionText }}
      </p>
    </section>

    <section class="col-span-12 rounded-[24px] border border-white/10 bg-white/[0.035] p-5 md:col-span-6 xl:col-span-4">
      <p class="text-[11px] uppercase tracking-[0.25em] text-white/35">
        Быстрые действия
      </p>

      <div class="mt-4 flex flex-wrap gap-3">
        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
          @click="launcher.openPath(launcher.logsDirectory)"
        >
          Открыть логи
        </button>

        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
          @click="launcher.openPath(launcher.gameDirectory)"
        >
          Открыть папку игры
        </button>
      </div>
    </section>
  </div>
</template>