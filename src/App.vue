<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useLauncherSessionStore } from './stores/launcherSession';
import type { CoreStatus, LauncherState, OperationResponse, UpdaterStatus } from './types';

const session = useLauncherSessionStore();
const state = ref<LauncherState | null>(session.lastState);
const activeTab = ref<'home' | 'account' | 'settings'>('home');

const login = reactive({
  value: session.rememberedLogin,
  password: ''
});

const infoMessage = ref('');
const bootstrapFailed = ref(false);
const shellUpdater = ref<UpdaterStatus>(session.shellUpdater);
const coreStatus = ref<CoreStatus>(session.coreStatus);

let pollTimer: number | null = null;
let detachUpdaterListener: (() => void) | null = null;
let detachCoreListener: (() => void) | null = null;

// --- Computed ---
const isAuthenticated = computed(() => state.value?.isAuthenticated === true);
const isBusy = computed(() => state.value?.isBusy === true);
const isReady = computed(() => state.value !== null && !bootstrapFailed.value);
const isEmailVerified = computed(() => (state.value?.emailVerifiedText || '').toLowerCase().includes('подтвержд'));
const accountPrimary = computed(() => state.value?.accountPrimaryText || 'Гость');
const accountMeta = computed(() => parseAccountMeta(state.value?.accountSecondaryText));
const currentMemoryMb = computed(() => state.value?.currentMemoryMb ?? 4096);
const currentMemoryGb = computed(() => (currentMemoryMb.value / 1024).toFixed(1));
const progressPercent = computed(() => Math.max(0, Math.min(100, state.value?.progress?.percent ?? 0)));

const statusBadgeText = computed(() => {
  if (bootstrapFailed.value) return 'Ошибка';
  if (isBusy.value) return state.value?.progress?.title || 'В процессе...';
  if (isAuthenticated.value) return 'Готов';
  return 'Ожидание';
});

// --- Methods ---
function parseAccountMeta(raw?: string) {
  const value = raw?.trim() || '';
  if (!value) return { siteLogin: '', email: '' };
  const parts = value.split('•').map((item) => item.trim()).filter(Boolean);
  return { siteLogin: parts[0] || '', email: parts.slice(1).join(' • ') };
}

async function request<T>(method: string, path: string, body?: unknown) {
  if (!window.desktop) throw new Error('Bridge Electron не подключён.');
  return window.desktop.request<T>(method, path, body);
}

function applyResponse(response: OperationResponse) {
  state.value = response.state;
  bootstrapFailed.value = false;
  if (response.message) infoMessage.value = response.message;
}

async function bootstrap() {
  try {
    infoMessage.value = '';
    const response = await request<OperationResponse>('GET', '/api/bootstrap');
    applyResponse(response);
  } catch (error) {
    bootstrapFailed.value = true;
    infoMessage.value = error instanceof Error ? error.message : String(error);
  }
}

async function refreshState() {
  try {
    state.value = await request<LauncherState>('GET', '/api/state');
    bootstrapFailed.value = false;
  } catch { /* silent */ }
}

async function runAction(method: string, path: string, body?: unknown) {
  infoMessage.value = '';
  try {
    const response = await request<OperationResponse>(method, path, body);
    applyResponse(response);
  } catch (error) {
    infoMessage.value = error instanceof Error ? error.message : String(error);
  }
}

// --- Actions ---
const onLogin = async () => await runAction('POST', '/api/auth/login', { login: login.value.trim(), password: login.password });
const onLogout = async () => await runAction('POST', '/api/auth/logout');
const onPlay = async () => await runAction('POST', '/api/actions/play');
const onRepair = async () => await runAction('POST', '/api/actions/repair');
const onSaveSettings = async () => { if (state.value) await runAction('POST', '/api/settings', { maxRamMb: state.value.currentMemoryMb }); };
const onResetSettings = async () => await runAction('POST', '/api/settings/reset');
const onClearDiagnostics = async () => await runAction('POST', '/api/diagnostics/clear');

const onCheckShellUpdates = async () => {
  if (window.desktop) infoMessage.value = (await window.desktop.checkForShellUpdates()).message;
};
const onInstallShellUpdate = async () => {
  if (window.desktop) infoMessage.value = (await window.desktop.downloadAndInstallShellUpdate()).message;
};

const openExternal = async (url?: string) => { if (url && window.desktop) await window.desktop.openExternal(url); };
const openPath = async (path?: string) => { if (path && window.desktop) await window.desktop.openPath(path); };

const increaseMemory = () => {
  if (!state.value) return;
  state.value.currentMemoryMb = Math.min(16384, state.value.currentMemoryMb + 512);
  state.value.currentMemoryText = `${(state.value.currentMemoryMb / 1024).toFixed(1)} GB`;
};

const decreaseMemory = () => {
  if (!state.value) return;
  state.value.currentMemoryMb = Math.max(2048, state.value.currentMemoryMb - 512);
  state.value.currentMemoryText = `${(state.value.currentMemoryMb / 1024).toFixed(1)} GB`;
};

// --- Lifecycle ---
onMounted(async () => {
  try {
    if (!window.desktop) {
      infoMessage.value = 'Bridge Electron не найден.';
      bootstrapFailed.value = true;
      return;
    }
    coreStatus.value = await window.desktop.getCoreStatus();
    detachUpdaterListener = window.desktop.onUpdaterStatus((s) => (shellUpdater.value = s));
    detachCoreListener = window.desktop.onCoreStatus((s) => (coreStatus.value = s));
    
    await bootstrap();
    pollTimer = window.setInterval(refreshState, 1500);
  } catch (error) {
    bootstrapFailed.value = true;
    infoMessage.value = error instanceof Error ? error.message : 'Не удалось инициализировать оболочку.';
  }
});

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer);
  detachUpdaterListener?.();
  detachCoreListener?.();
});

watch(() => login.value, (v) => session.setRememberedLogin(v));
watch(state, (v) => session.setLastState(v), { deep: true });
</script>

<template>
  <div class="launcher-root flex h-screen w-full text-base-content overflow-hidden relative" data-theme="voidrp-dark">
    <!-- Background Elements -->
    <div class="bg-noise"></div>
    <div class="bg-gradient-orbs"></div>

    <!-- Loading / Bootstrap Screen -->
    <div v-if="!isReady && !bootstrapFailed" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050608]">
      <div class="relative mb-8">
        <div class="absolute inset-0 animate-ping rounded-full bg-primary opacity-20 blur-xl"></div>
        <div class="relative flex h-24 w-24 items-center justify-center rounded-2xl glass-panel">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </div>
      <h1 class="text-3xl font-bold tracking-wider">VOID RP</h1>
      <p class="mt-2 text-sm text-white/40">Инициализация ядра...</p>
    </div>

    <!-- Error Screen -->
    <div v-if="bootstrapFailed" class="absolute inset-0 z-50 flex items-center justify-center bg-[#050608] p-8">
      <div class="glass-panel max-w-md w-full p-8 rounded-3xl text-center">
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/20 text-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 class="text-2xl font-bold text-white">Ошибка запуска</h2>
        <p class="mt-2 text-white/60">{{ infoMessage || 'Не удалось подключиться к серверу.' }}</p>
        <button class="btn btn-primary mt-6 w-full btn-neon" @click="bootstrap">Повторить</button>
      </div>
    </div>

    <!-- Main Interface -->
    <template v-if="isReady">
      <!-- Sidebar -->
      <aside class="relative z-20 flex w-20 flex-col items-center py-6 border-r border-white/5 bg-[#0a0b10]/80 backdrop-blur-xl">
        <div class="mb-8 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary font-black text-black shadow-lg shadow-primary/20" title="VoidRP">V</div>
        
        <nav class="flex flex-1 flex-col gap-4">
          <button 
            class="group flex h-10 w-10 items-center justify-center rounded-xl transition-all"
            :class="activeTab === 'home' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/40 hover:bg-white/5 hover:text-white'"
            @click="activeTab = 'home'" title="Главная">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </button>
          <button 
            class="group flex h-10 w-10 items-center justify-center rounded-xl transition-all"
            :class="activeTab === 'account' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/40 hover:bg-white/5 hover:text-white'"
            @click="activeTab = 'account'" title="Аккаунт">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </button>
          <button 
            class="group flex h-10 w-10 items-center justify-center rounded-xl transition-all"
            :class="activeTab === 'settings' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/40 hover:bg-white/5 hover:text-white'"
            @click="activeTab = 'settings'" title="Настройки">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </nav>

        <div class="mt-auto flex flex-col items-center gap-4">
          <div class="h-2 w-2 rounded-full" :class="isAuthenticated ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-warning'"></div>
          <div class="text-[10px] font-bold text-white/30">V {{ state?.launcherVersionText }}</div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="relative z-10 flex flex-1 flex-col overflow-hidden">
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-white/5 px-8 py-4 glass-panel">
          <div>
            <h2 class="text-lg font-bold tracking-wide text-white">
              {{ activeTab === 'home' ? 'Панель управления' : activeTab === 'account' ? 'Профиль игрока' : 'Настройки клиента' }}
            </h2>
            <p class="text-xs text-white/40">{{ state?.statusText || 'Система активна' }}</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5">
              <span class="h-2 w-2 rounded-full animate-pulse" :class="isBusy ? 'bg-warning' : 'bg-success'"></span>
              <span class="text-xs font-bold text-white/60">{{ statusBadgeText }}</span>
            </div>
            <div v-if="isAuthenticated" class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-sm font-bold text-white">{{ accountPrimary }}</div>
                <div class="text-[10px] text-white/40">{{ accountMeta.email || 'Аккаунт активен' }}</div>
              </div>
              <div class="h-10 w-10 overflow-hidden rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg font-bold text-white">
                {{ accountPrimary.charAt(0).toUpperCase() }}
              </div>
            </div>
          </div>
        </header>

        <!-- Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-8">
          
          <!-- HOME TAB -->
          <div v-if="activeTab === 'home'" class="mx-auto max-w-6xl space-y-8">
            <!-- Hero Play Section -->
            <div class="relative overflow-hidden rounded-3xl glass-panel p-10 min-h-[400px] flex flex-col justify-between group">
              <!-- Decorative Background -->
              <div class="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px] group-hover:bg-primary/30 transition-all duration-700"></div>
              
              <div class="relative z-10">
                <div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 border border-primary/20 text-xs font-bold text-primary mb-6">
                  <span class="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                  СЕРВЕР ОНЛАЙН
                </div>
                <h1 class="text-5xl font-black leading-tight text-white mb-4">
                  Готов к <span class="text-gradient">приключению?</span>
                </h1>
                <p class="max-w-xl text-lg text-white/50">
                  Клиент синхронизирован. Java Runtime готов. Нажми кнопку ниже, чтобы погрузиться в мир VoidRP.
                </p>
              </div>

              <div class="relative z-10 mt-8 flex items-center gap-6">
                <button
                  class="btn btn-neon btn-primary btn-lg min-w-[240px] text-xl font-black border-0 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_50px_rgba(99,102,241,0.6)] hover:scale-105"
                  :disabled="!isAuthenticated || isBusy"
                  @click="onPlay"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ИГРАТЬ
                </button>
                
                <div v-if="isBusy" class="flex flex-col gap-2">
                  <span class="text-sm font-bold text-white/80">{{ state?.progress?.title }}</span>
                  <div class="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300" :style="{ width: `${progressPercent}%` }"></div>
                  </div>
                  <span class="text-xs text-white/40">{{ Math.round(progressPercent) }}%</span>
                </div>
              </div>
            </div>

            <!-- Quick Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group" @click="openPath(state?.gameDirectory)">
                <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                </div>
                <div class="text-sm font-bold text-white/40">ИГРОВАЯ ПАПКА</div>
                <div class="mt-1 truncate text-sm text-white/80">{{ state?.gameDirectory || '...' }}</div>
              </div>

              <div class="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group" @click="openPath(state?.logsDirectory)">
                <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div class="text-sm font-bold text-white/40">ЛОГИ</div>
                <div class="mt-1 truncate text-sm text-white/80">{{ state?.logsDirectory || '...' }}</div>
              </div>

              <div class="glass-panel p-6 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group" @click="activeTab = 'settings'">
                <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div class="text-sm font-bold text-white/40">ПАМЯТЬ</div>
                <div class="mt-1 text-sm text-white/80">{{ currentMemoryGb }} GB RAM</div>
              </div>
            </div>
          </div>

          <!-- ACCOUNT TAB -->
          <div v-if="activeTab === 'account'" class="mx-auto max-w-3xl space-y-8">
            <div v-if="!isAuthenticated" class="glass-panel p-8 rounded-3xl text-center">
              <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m0 0h4m-4 8v4m4-4v4" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 class="text-2xl font-bold text-white">Вход в аккаунт</h2>
              <p class="mt-2 text-sm text-white/50">Введите свои учетные данные для доступа к серверу.</p>
              
              <div class="mt-8 space-y-4 text-left">
                <div class="space-y-2">
                  <label class="text-xs font-bold text-white/40">ЛОГИН / EMAIL</label>
                  <input v-model="login.value" class="input-modern input-lg w-full rounded-xl px-4" type="text" placeholder="username" />
                </div>
                <div class="space-y-2">
                  <label class="text-xs font-bold text-white/40">ПАРОЛЬ</label>
                  <input v-model="login.password" class="input-modern input-lg w-full rounded-xl px-4" type="password" placeholder="••••••••" @keydown.enter="onLogin" />
                </div>
              </div>

              <div class="mt-8 grid grid-cols-2 gap-4">
                <button class="btn btn-primary btn-lg btn-neon rounded-xl col-span-2" :disabled="isBusy || !login.value || !login.password" @click="onLogin">Войти</button>
                <button class="btn btn-outline btn-ghost btn-sm rounded-xl" @click="openExternal(state?.links?.registerUrl)">Регистрация</button>
                <button class="btn btn-outline btn-ghost btn-sm rounded-xl" @click="openExternal(state?.links?.forgotPasswordUrl)">Забыли пароль?</button>
              </div>
            </div>

            <div v-else class="glass-panel p-8 rounded-3xl">
              <div class="flex items-center gap-6 mb-8">
                <div class="h-24 w-24 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary border-4 border-white/5 flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                  {{ accountPrimary.charAt(0).toUpperCase() }}
                </div>
                <div>
                  <div class="text-sm font-bold text-primary">ИГРОВОЙ ПРОФИЛЬ</div>
                  <div class="text-3xl font-black text-white">{{ accountPrimary }}</div>
                  <div class="mt-2 flex items-center gap-3">
                    <span class="badge badge-sm badge-outline border-white/10 text-white/60">{{ isEmailVerified ? 'Email подтвержден' : 'Email не подтвержден' }}</span>
                    <span class="badge badge-sm badge-outline border-white/10 text-white/60">{{ state?.currentMemoryText }} RAM</span>
                  </div>
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <button class="btn btn-outline border-white/10 btn-ghost rounded-xl hover:bg-white/5 hover:text-white" @click="openExternal(state?.links?.verifyEmailUrl)">Подтвердить Email</button>
                <button class="btn btn-outline border-error/20 text-error/80 btn-ghost rounded-xl hover:bg-error/10 hover:text-error hover:border-error" @click="onLogout">Выйти из аккаунта</button>
              </div>
            </div>
          </div>

          <!-- SETTINGS TAB -->
          <div v-if="activeTab === 'settings'" class="mx-auto max-w-4xl space-y-8">
            <!-- RAM Slider -->
            <div class="glass-panel p-8 rounded-3xl">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-xl font-bold text-white">Выделение памяти</h3>
                  <p class="text-sm text-white/40">Рекомендуется 4-8 GB для стабильной игры</p>
                </div>
                <div class="text-3xl font-black text-primary">{{ currentMemoryGb }} <span class="text-lg text-white/30">GB</span></div>
              </div>
              
              <div class="mb-6 flex items-center gap-4">
                <button class="btn btn-sm btn-outline rounded-lg border-white/10" @click="decreaseMemory">-</button>
                <input type="range" min="2048" max="16384" step="512" :value="currentMemoryMb" class="range range-primary range-lg" @input="state && (state.currentMemoryMb = Number(($event.target as HTMLInputElement).value))" />
                <button class="btn btn-sm btn-outline rounded-lg border-white/10" @click="increaseMemory">+</button>
              </div>

              <div class="flex gap-3">
                <button class="btn btn-primary btn-sm btn-neon rounded-lg" @click="onSaveSettings">Сохранить</button>
                <button class="btn btn-ghost btn-sm rounded-lg" @click="onResetSettings">Сбросить (4GB)</button>
              </div>
            </div>

            <!-- Maintenance -->
            <div class="glass-panel p-8 rounded-3xl">
              <h3 class="text-xl font-bold text-white mb-4">Обслуживание</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button class="btn btn-outline border-white/10 rounded-xl h-auto p-4 flex-col items-start hover:bg-white/5 hover:border-primary/30" @click="onRepair">
                  <div class="flex w-full items-center justify-between">
                    <span class="font-bold text-white">Починить клиент</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  </div>
                  <span class="text-xs text-white/40 mt-2 text-left">Удалить поврежденные файлы и переустановить их</span>
                </button>
                
                <button class="btn btn-outline border-white/10 rounded-xl h-auto p-4 flex-col items-start hover:bg-white/5 hover:border-warning/30" @click="onClearDiagnostics">
                  <div class="flex w-full items-center justify-between">
                    <span class="font-bold text-white">Очистить логи</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </div>
                  <span class="text-xs text-white/40 mt-2 text-left">Очистить консоль отладки ядра</span>
                </button>
              </div>

              <!-- Diagnostics Log -->
              <details class="collapse collapse-arrow mt-6 border border-white/5 bg-black/20 rounded-xl">
                <summary class="collapse-title text-sm font-bold text-white/60">Технический лог</summary>
                <div class="collapse-content">
                  <pre class="h-48 overflow-auto rounded-lg bg-black/40 p-4 text-xs text-emerald-500/80 font-mono leading-relaxed">{{ state?.diagnosticsText || 'Логи пусты.' }}</pre>
                </div>
              </details>
            </div>
          </div>

        </div>
        
        <!-- Footer -->
        <footer class="flex items-center justify-between border-t border-white/5 px-8 py-3 text-xs text-white/20">
          <span>© 2024 VoidRP Launcher v2.0.0</span>
          <span>Core: {{ coreStatus.running ? 'Running' : 'Stopped' }}</span>
        </footer>
      </main>
    </template>
  </div>
</template>