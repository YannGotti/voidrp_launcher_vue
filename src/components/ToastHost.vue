<script setup lang="ts">
import { computed } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const toasts = computed(() => launcher.toasts)

function toastClasses(tone: string) {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/20 bg-emerald-500/12 text-emerald-50'
    case 'warning':
      return 'border-amber-300/20 bg-amber-400/12 text-amber-50'
    case 'error':
      return 'border-red-400/20 bg-red-500/12 text-red-50'
    default:
      return 'border-white/10 bg-white/8 text-white'
  }
}
</script>

<template>
  <div class="pointer-events-none fixed right-5 top-5 z-[999] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-3">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl shadow-black/35 backdrop-blur-xl"
        :class="toastClasses(toast.tone)"
      >
        <div class="flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">{{ toast.title }}</p>
            <p class="mt-1 text-sm leading-5 opacity-90">{{ toast.message }}</p>
          </div>

          <button
            class="rounded-xl border border-white/10 bg-black/10 px-2 py-1 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
            @click="launcher.dismissToast(toast.id)"
          >
            ✕
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.toast-move {
  transition: transform 0.22s ease;
}
</style>
