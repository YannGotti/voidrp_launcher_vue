<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const diagnosticsText = computed(() => launcher.diagnosticsText?.trim() || 'Диагностика пока пуста.')
const selectedVariant = ref<'classic' | 'slim'>('classic')
const selectedFile = ref<File | null>(null)
const localPreviewUrl = ref('')
const uploadBusy = ref(false)
const securityBusy = ref(false)

function formatNumber(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0)
  return new Intl.NumberFormat('ru-RU').format(Number.isFinite(numeric) ? numeric : 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function revokePreviewUrl() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = ''
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input?.files?.[0] ?? null
  selectedFile.value = file
  revokePreviewUrl()
  if (file) {
    localPreviewUrl.value = URL.createObjectURL(file)
  }
}

async function saveSkin() {
  if (!selectedFile.value) return
  uploadBusy.value = true
  try {
    await launcher.uploadSkin(selectedFile.value, selectedVariant.value)
    selectedFile.value = null
    revokePreviewUrl()
  } finally {
    uploadBusy.value = false
  }
}

async function removeSkin() {
  uploadBusy.value = true
  try {
    await launcher.deleteSkin()
    selectedFile.value = null
    revokePreviewUrl()
  } finally {
    uploadBusy.value = false
  }
}

async function revokeOtherSessions() {
  securityBusy.value = true
  try {
    await launcher.revokeOtherSessions()
  } finally {
    securityBusy.value = false
  }
}

onBeforeUnmount(() => {
  revokePreviewUrl()
})
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

        <div class="grid grid-cols-2 gap-3 md:min-w-[360px]">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <p class="text-lg font-semibold">{{ formatNumber(launcher.walletBalance) }}</p>
            <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Баланс</p>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
            <p class="text-lg font-semibold">{{ formatNumber(launcher.security.activeRefreshSessions) }}</p>
            <p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">Активные сессии</p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-[20px] border border-white/10 bg-white/[0.035] p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Безопасность</p>
          <h2 class="mt-1 text-lg font-semibold">Защита аккаунта</h2>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-sm font-semibold">Режим входа</p>
          <p class="mt-2 text-sm text-white/65">
            <span v-if="launcher.security.mustUseLauncher">Для этого аккаунта основной вход идёт через официальный лаунчер.</span>
            <span v-else>Для этого аккаунта доступен и легаси-вход.</span>
          </p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p class="text-sm font-semibold">Состояние legacy</p>
          <p class="mt-2 text-sm text-white/65">
            <span v-if="launcher.security.legacyReady">Legacy-авторизация настроена и готова.</span>
            <span v-else-if="launcher.security.legacyHashPresent">Legacy-хэш есть, но настройка ещё не завершена.</span>
            <span v-else>Legacy-авторизация не настроена.</span>
          </p>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2.5">
        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
          :disabled="securityBusy"
          @click="launcher.openExternal(launcher.links.verifyEmailUrl)"
        >
          Подтвердить почту
        </button>

        <button
          class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
          :disabled="securityBusy"
          @click="launcher.openExternal(launcher.links.forgotPasswordUrl)"
        >
          Сменить пароль
        </button>

        <button
          class="rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-100 transition hover:bg-amber-400/15 disabled:opacity-50"
          :disabled="securityBusy"
          @click="revokeOtherSessions"
        >
          {{ securityBusy ? 'Завершаем...' : 'Завершить другие сессии' }}
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
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Скин</p>
          <h2 class="mt-1 text-lg font-semibold">Игровой скин</h2>
        </div>
        <div class="text-xs text-white/45">
          Обновлён: {{ formatDate(launcher.skin.updatedAt) }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p class="text-sm font-semibold">Текущий head preview</p>
            <div class="mt-3 flex h-[140px] items-center justify-center rounded-2xl border border-white/8 bg-[#070b14]">
              <img
                v-if="launcher.skin.headPreviewUrl"
                :src="launcher.skin.headPreviewUrl"
                alt="Head preview"
                class="max-h-[120px] max-w-[120px] object-contain pixelated"
              />
              <span v-else class="text-sm text-white/35">Скин не загружен</span>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p class="text-sm font-semibold">Локальный preview</p>
            <div class="mt-3 flex h-[180px] items-center justify-center rounded-2xl border border-white/8 bg-[#070b14]">
              <img
                v-if="localPreviewUrl"
                :src="localPreviewUrl"
                alt="Local preview"
                class="max-h-[160px] max-w-full object-contain pixelated"
              />
              <img
                v-else-if="launcher.skin.bodyPreviewUrl"
                :src="launcher.skin.bodyPreviewUrl"
                alt="Body preview"
                class="max-h-[160px] max-w-full object-contain pixelated"
              />
              <span v-else class="text-sm text-white/35">Выбери PNG скина</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p class="text-sm font-semibold">Загрузка</p>
            <p class="mt-2 text-sm text-white/60">
              Загрузи PNG-скин 64x64. После сохранения он автоматически подхватится сервером.
            </p>

            <div class="mt-4 grid gap-3 md:grid-cols-2">
              <label class="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span class="text-[11px] uppercase tracking-[0.18em] text-white/38">Файл</span>
                <input class="mt-3 block w-full text-sm text-white/70" type="file" accept=".png,image/png" @change="onFileChange" />
              </label>

              <label class="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <span class="text-[11px] uppercase tracking-[0.18em] text-white/38">Модель</span>
                <select v-model="selectedVariant" class="mt-3 w-full rounded-xl border border-white/10 bg-[#0d1320] px-3 py-2 text-sm text-white">
                  <option value="classic">Classic</option>
                  <option value="slim">Slim</option>
                </select>
              </label>
            </div>

            <div class="mt-4 flex flex-wrap gap-2.5">
              <button
                class="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-50"
                :disabled="uploadBusy || !selectedFile"
                @click="saveSkin"
              >
                {{ uploadBusy ? 'Сохраняем...' : 'Сохранить скин' }}
              </button>

              <button
                class="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
                :disabled="uploadBusy"
                @click="launcher.refreshSkin()"
              >
                Обновить данные
              </button>

              <button
                class="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-2.5 text-sm text-red-100 transition hover:bg-red-400/15 disabled:opacity-50"
                :disabled="uploadBusy || !launcher.skin.hasSkin"
                @click="removeSkin"
              >
                Удалить скин
              </button>
            </div>
          </div>

          <div class="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div class="grid gap-3 md:grid-cols-4">
              <div>
                <p class="text-[10px] uppercase tracking-[0.18em] text-white/38">Статус</p>
                <p class="mt-2 text-sm">{{ launcher.skin.hasSkin ? 'Скин активен' : 'Скин не загружен' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.18em] text-white/38">Variant</p>
                <p class="mt-2 text-sm">{{ launcher.skin.modelVariant || 'classic' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.18em] text-white/38">Размер</p>
                <p class="mt-2 text-sm">{{ launcher.skin.width || 0 }} × {{ launcher.skin.height || 0 }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-[0.18em] text-white/38">SHA-256</p>
                <p class="mt-2 break-all text-xs text-white/55">{{ launcher.skin.sha256 || '—' }}</p>
              </div>
            </div>
          </div>
        </div>
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

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
