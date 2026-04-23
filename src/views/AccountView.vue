<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useLauncherStore } from '../stores/launcher'

const launcher = useLauncherStore()
const diagnosticsText = computed(() => launcher.diagnosticsText?.trim() || 'Диагностика пока пуста.')

const selectedFile = ref<File | null>(null)
const selectedFileUrl = ref('')
const selectedModelVariant = ref('classic')
const skinBusy = ref(false)

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

function onSelectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input?.files?.[0] || null
  selectedFile.value = file

  if (selectedFileUrl.value) {
    URL.revokeObjectURL(selectedFileUrl.value)
    selectedFileUrl.value = ''
  }

  if (file) {
    selectedFileUrl.value = URL.createObjectURL(file)
  }
}

async function uploadSkin() {
  if (!selectedFile.value || skinBusy.value) return
  skinBusy.value = true
  try {
    await launcher.uploadSkin(selectedFile.value, selectedModelVariant.value)
    selectedFile.value = null
    if (selectedFileUrl.value) {
      URL.revokeObjectURL(selectedFileUrl.value)
      selectedFileUrl.value = ''
    }
  } finally {
    skinBusy.value = false
  }
}

async function deleteSkin() {
  if (skinBusy.value) return
  skinBusy.value = true
  try {
    await launcher.deleteSkin()
  } finally {
    skinBusy.value = false
  }
}

onBeforeUnmount(() => {
  if (selectedFileUrl.value) {
    URL.revokeObjectURL(selectedFileUrl.value)
  }
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
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] uppercase tracking-[0.22em] text-violet-300/70">Скин</p>
          <h2 class="mt-1 text-lg font-semibold">Внешний вид персонажа</h2>
          <p class="mt-1 text-sm text-white/55">
            Загрузите PNG 64x64 или 64x32. Скин хранится на аккаунте и применяется при входе на сервер.
          </p>
        </div>

        <div class="text-right text-xs text-white/45">
          <p>Текущая модель: {{ launcher.skin.modelVariant || 'classic' }}</p>
          <p class="mt-1">Обновлён: {{ formatDate(launcher.skin.updatedAt) }}</p>
        </div>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
          <div class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <div class="rounded-[20px] border border-white/10 bg-[#060912] p-4">
              <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">Текущий рендер</p>

              <div class="mt-3 flex min-h-[280px] items-center justify-center rounded-[16px] border border-white/10 bg-black/20 p-4">
                <img
                  v-if="launcher.skin.bodyPreviewUrl"
                  :src="launcher.skin.bodyPreviewUrl"
                  alt="skin body preview"
                  class="max-h-[260px] object-contain"
                />
                <div v-else class="text-center text-sm text-white/45">
                  Скин ещё не загружен
                </div>
              </div>

              <div class="mt-3 flex items-center justify-center">
                <div class="h-[84px] w-[84px] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img
                    v-if="launcher.skin.headPreviewUrl"
                    :src="launcher.skin.headPreviewUrl"
                    alt="skin head preview"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-xs text-white/35">Нет</div>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div class="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                <p class="text-sm font-medium text-white">Новый PNG-файл</p>
                <input
                  class="mt-3 block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-violet-100"
                  type="file"
                  accept="image/png"
                  @change="onSelectFile"
                />

                <div class="mt-4 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                  <div class="rounded-[18px] border border-white/10 bg-[#060912] p-3">
                    <p class="text-[10px] uppercase tracking-[0.18em] text-white/35">Локальный предпросмотр</p>
                    <div class="mt-3 flex min-h-[200px] items-center justify-center rounded-[14px] border border-white/10 bg-black/20 p-3">
                      <img
                        v-if="selectedFileUrl"
                        :src="selectedFileUrl"
                        alt="selected skin"
                        class="max-h-[180px] object-contain pixelated"
                      />
                      <div v-else class="text-center text-sm text-white/45">
                        Выберите PNG-файл
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <label class="block">
                      <span class="mb-1.5 block text-xs text-white/50">Тип модели</span>
                      <select
                        v-model="selectedModelVariant"
                        class="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition focus:border-violet-400/60 focus:bg-white/10"
                      >
                        <option value="classic">Classic / Steve</option>
                        <option value="slim">Slim / Alex</option>
                      </select>
                    </label>

                    <div class="rounded-[18px] border border-white/10 bg-white/[0.03] p-3 text-sm text-white/60">
                      <p>Формат: PNG</p>
                      <p class="mt-1">Размер: 64×64 или 64×32</p>
                      <p class="mt-1">После загрузки сервер применит скин через SkinsRestorer.</p>
                    </div>

                    <div class="flex flex-wrap gap-3">
                      <button
                        class="rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!selectedFile || skinBusy"
                        @click="uploadSkin"
                      >
                        {{ skinBusy ? 'Сохраняем...' : 'Загрузить скин' }}
                      </button>

                      <button
                        class="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-2.5 text-sm text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="!launcher.skin.hasSkin || skinBusy"
                        @click="deleteSkin"
                      >
                        Удалить скин
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
                <p class="font-medium text-white/88">Текущий файл</p>
                <p class="mt-2">SHA-256: {{ launcher.skin.sha256 || '—' }}</p>
                <p class="mt-1">Размер текстуры: {{ launcher.skin.width || '—' }} × {{ launcher.skin.height || '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3">
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

            <div class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-2">
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
      </div>
    </section>
  </div>
</template>

<style scoped>
.pixelated {
  image-rendering: pixelated;
}
</style>
