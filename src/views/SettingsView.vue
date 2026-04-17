<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const memoryMb = ref(launcher.currentMemoryMb)

watch(
  () => launcher.currentMemoryMb,
  (value) => {
    memoryMb.value = value
  },
  { immediate: true }
)

function increaseMemory() {
  memoryMb.value = Math.min(16384, memoryMb.value + 512)
}

function decreaseMemory() {
  memoryMb.value = Math.max(2048, memoryMb.value - 512)
}

async function saveSettings() {
  await launcher.saveMemory(memoryMb.value)
}
</script>

<template>
  <div class="max-w-[860px]">
    <p class="text-[11px] uppercase tracking-[0.25em] text-violet-300/70">
      Настройки
    </p>

    <h2 class="mt-2 text-3xl font-semibold leading-tight">
      Параметры лаунчера
    </h2>

    <p class="mt-3 text-sm leading-6 text-white/60">
      Здесь только нужное игроку: память, обновления оболочки и доступ к служебным папкам.
    </p>

    <div class="mt-5 grid gap-4">
      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-base font-medium">Память для Minecraft</p>
            <p class="mt-1 text-sm text-white/55">
              Рекомендуемый диапазон — от 4 до 8 GB.
            </p>
          </div>

          <div class="text-lg font-semibold">
            {{ (memoryMb / 1024).toFixed(1) }} GB
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            class="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 text-lg text-white/75 transition hover:bg-white/8 hover:text-white"
            @click="decreaseMemory"
          >
            −
          </button>

          <div class="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-medium">
            {{ memoryMb }} MB
          </div>

          <button
            class="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 text-lg text-white/75 transition hover:bg-white/8 hover:text-white"
            @click="increaseMemory"
          >
            +
          </button>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            @click="saveSettings"
          >
            Сохранить
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.resetMemory()"
          >
            Сбросить
          </button>
        </div>
      </section>

      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p class="text-base font-medium">Обновление оболочки</p>
        <p class="mt-1 text-sm text-white/55">
          Этот раздел отвечает за обновление самого лаунчера, а не клиентской сборки игры.
        </p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.checkShellUpdates()"
          >
            Проверить обновления
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.installShellUpdate()"
          >
            Установить обновление
          </button>
        </div>
      </section>

      <section class="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
        <p class="text-base font-medium">Служебные действия</p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.repair()"
          >
            Починить клиент
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.openPath(launcher.logsDirectory)"
          >
            Открыть логи
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.openPath(launcher.dataDirectory)"
          >
            Открыть данные
          </button>

          <button
            class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white"
            @click="launcher.openPath(launcher.gameDirectory)"
          >
            Открыть игру
          </button>
        </div>
      </section>
    </div>
  </div>
</template>