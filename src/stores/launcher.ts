import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'

type ToastTone = 'success' | 'warning' | 'error' | 'info'

interface LauncherProgress {
  visible: boolean
  title: string
  details: string
  percent: number
}

interface LauncherLinks {
  registerUrl: string
  forgotPasswordUrl: string
  verifyEmailUrl: string
}

interface LauncherAccountSecurity {
  activeRefreshSessions: number
  mustUseLauncher: boolean
  legacyHashPresent: boolean
  legacyReady: boolean
}

interface LauncherNation {
  id: string
  slug: string
  title: string
  tag: string
  accentColor: string
  role: string
  iconUrl: string
  iconPreviewUrl: string
  bannerUrl: string
  bannerPreviewUrl: string
  backgroundUrl: string
  backgroundPreviewUrl: string
  allianceTitle: string
  allianceTag: string
}

interface LauncherNationStats {
  treasuryBalance: number
  territoryPoints: number
  totalPlaytimeMinutes: number
  pvpKills: number
  mobKills: number
  bossKills: number
  deaths: number
  blocksPlaced: number
  blocksBroken: number
  eventsCompleted: number
  prestigeScore: number
}

interface LauncherPlayerStats {
  minecraftNickname: string
  totalPlaytimeMinutes: number
  pvpKills: number
  mobKills: number
  deaths: number
  blocksPlaced: number
  blocksBroken: number
  currentBalance: number
  source: string
  lastSeenAt: string | null
  lastSyncedAt: string | null
}

interface LauncherDashboard {
  nation: LauncherNation
  nationStats: LauncherNationStats
  playerStats: LauncherPlayerStats
  recentActivity: Array<{ eventType: string; message: string; createdAt: string | null }>
  walletBalance: number
}

interface LauncherState {
  initialized: boolean
  isBusy: boolean
  isAuthenticated: boolean
  statusText: string
  launcherVersionText: string
  accountPrimaryText: string
  accountSecondaryText: string
  emailVerifiedText: string
  currentMemoryMb: number
  currentMemoryText: string
  logsDirectory: string
  dataDirectory: string
  gameDirectory: string
  diagnosticsText: string
  progress: LauncherProgress
  links: LauncherLinks
  security: LauncherAccountSecurity
  dashboard: LauncherDashboard
}

interface OperationResponse {
  ok: boolean
  message: string
  pendingElectronExit?: boolean
  state: LauncherState
}

interface SkinState {
  hasSkin: boolean
  modelVariant: string
  skinUrl: string
  headPreviewUrl: string
  bodyPreviewUrl: string
  sha256: string
  width: number
  height: number
  updatedAt: string | null
}

interface SkinOpResponse {
  ok: boolean
  message: string
  skin: SkinState
}

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  message: string
}

const API_BASE = 'http://127.0.0.1:38765'

function defaultProgress(): LauncherProgress {
  return { visible: false, title: '', details: '', percent: 0 }
}
function defaultLinks(): LauncherLinks {
  return { registerUrl: '', forgotPasswordUrl: '', verifyEmailUrl: '' }
}
function defaultSecurity(): LauncherAccountSecurity {
  return { activeRefreshSessions: 0, mustUseLauncher: false, legacyHashPresent: false, legacyReady: false }
}
function defaultNation(): LauncherNation {
  return {
    id: '', slug: '', title: '', tag: '', accentColor: '', role: '',
    iconUrl: '', iconPreviewUrl: '', bannerUrl: '', bannerPreviewUrl: '',
    backgroundUrl: '', backgroundPreviewUrl: '', allianceTitle: '', allianceTag: '',
  }
}
function defaultNationStats(): LauncherNationStats {
  return {
    treasuryBalance: 0, territoryPoints: 0, totalPlaytimeMinutes: 0, pvpKills: 0, mobKills: 0,
    bossKills: 0, deaths: 0, blocksPlaced: 0, blocksBroken: 0, eventsCompleted: 0, prestigeScore: 0,
  }
}
function defaultPlayerStats(): LauncherPlayerStats {
  return {
    minecraftNickname: '', totalPlaytimeMinutes: 0, pvpKills: 0, mobKills: 0, deaths: 0,
    blocksPlaced: 0, blocksBroken: 0, currentBalance: 0, source: '', lastSeenAt: null, lastSyncedAt: null,
  }
}
function defaultDashboard(): LauncherDashboard {
  return { nation: defaultNation(), nationStats: defaultNationStats(), playerStats: defaultPlayerStats(), recentActivity: [], walletBalance: 0 }
}
function defaultState(): LauncherState {
  return {
    initialized: false,
    isBusy: false,
    isAuthenticated: false,
    statusText: 'Инициализация лаунчера...',
    launcherVersionText: '0.0.0',
    accountPrimaryText: 'Гость',
    accountSecondaryText: 'Войдите, чтобы запустить игру',
    emailVerifiedText: 'Требуется вход',
    currentMemoryMb: 4096,
    currentMemoryText: '4.0 GB',
    logsDirectory: '',
    dataDirectory: '',
    gameDirectory: '',
    diagnosticsText: '',
    progress: defaultProgress(),
    links: defaultLinks(),
    security: defaultSecurity(),
    dashboard: defaultDashboard(),
  }
}
function defaultSkin(): SkinState {
  return {
    hasSkin: false, modelVariant: 'classic', skinUrl: '', headPreviewUrl: '',
    bodyPreviewUrl: '', sha256: '', width: 0, height: 0, updatedAt: null,
  }
}
function toastId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...(init || {}) })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

export const useLauncherStore = defineStore('launcher', () => {
  const state = reactive<LauncherState>(defaultState())
  const skin = reactive<SkinState>(defaultSkin())
  const toasts = reactive<ToastItem[]>([])
  let pollHandle: number | null = null
  let bootstrapPromise: Promise<void> | null = null

  function pushToast(tone: ToastTone, title: string, message: string) {
    const safe = String(message || '').trim()
    if (!safe) return
    const id = toastId()
    toasts.push({ id, tone, title, message: safe })
    window.setTimeout(() => dismissToast(id), tone === 'error' ? 6500 : 4200)
  }

  function dismissToast(id: string) {
    const index = toasts.findIndex((item) => item.id === id)
    if (index >= 0) toasts.splice(index, 1)
  }

  function applyState(next: Partial<LauncherState> | null | undefined) {
    if (!next) return
    state.initialized = Boolean(next.initialized)
    state.isBusy = Boolean(next.isBusy)
    state.isAuthenticated = Boolean(next.isAuthenticated)
    state.statusText = String(next.statusText ?? state.statusText)
    state.launcherVersionText = String(next.launcherVersionText ?? state.launcherVersionText)
    state.accountPrimaryText = String(next.accountPrimaryText ?? state.accountPrimaryText)
    state.accountSecondaryText = String(next.accountSecondaryText ?? state.accountSecondaryText)
    state.emailVerifiedText = String(next.emailVerifiedText ?? state.emailVerifiedText)
    state.currentMemoryMb = Number(next.currentMemoryMb ?? state.currentMemoryMb)
    state.currentMemoryText = String(next.currentMemoryText ?? state.currentMemoryText)
    state.logsDirectory = String(next.logsDirectory ?? '')
    state.dataDirectory = String(next.dataDirectory ?? '')
    state.gameDirectory = String(next.gameDirectory ?? '')
    state.diagnosticsText = String(next.diagnosticsText ?? '')
    state.progress = { ...defaultProgress(), ...(next.progress ?? {}) }
    state.links = { ...defaultLinks(), ...(next.links ?? {}) }
    state.security = { ...defaultSecurity(), ...(next.security ?? {}) }
    state.dashboard = {
      nation: { ...defaultNation(), ...((next.dashboard?.nation as any) ?? {}) },
      nationStats: { ...defaultNationStats(), ...((next.dashboard?.nationStats as any) ?? {}) },
      playerStats: { ...defaultPlayerStats(), ...((next.dashboard?.playerStats as any) ?? {}) },
      recentActivity: Array.isArray(next.dashboard?.recentActivity) ? (next.dashboard?.recentActivity as any) : [],
      walletBalance: Number(next.dashboard?.walletBalance ?? 0),
    }
  }

  function applySkin(next: Partial<SkinState> | null | undefined) {
    const value = { ...defaultSkin(), ...(next ?? {}) }
    skin.hasSkin = Boolean(value.hasSkin)
    skin.modelVariant = String(value.modelVariant || 'classic')
    skin.skinUrl = String(value.skinUrl || '')
    skin.headPreviewUrl = String(value.headPreviewUrl || '')
    skin.bodyPreviewUrl = String(value.bodyPreviewUrl || '')
    skin.sha256 = String(value.sha256 || '')
    skin.width = Number(value.width || 0)
    skin.height = Number(value.height || 0)
    skin.updatedAt = value.updatedAt ? String(value.updatedAt) : null
  }

  async function pollStateOnce() {
    try {
      const next = await readJson<LauncherState>('/api/state')
      applyState(next)
    } catch (error) {
      // keep old state, do not spam user
    }
  }

  function startPolling() {
    stopPolling()
    pollHandle = window.setInterval(() => {
      void pollStateOnce()
    }, 1200)
  }

  function stopPolling() {
    if (pollHandle != null) {
      window.clearInterval(pollHandle)
      pollHandle = null
    }
  }

  async function initializeApp() {
    if (bootstrapPromise) return bootstrapPromise
    bootstrapPromise = (async () => {
      try {
        const response = await readJson<OperationResponse>('/api/bootstrap')
        applyState(response.state)
        if (response.state?.isAuthenticated) {
          try {
            applySkin(await readJson<SkinState>('/api/skin'))
          } catch {
            applySkin(defaultSkin())
          }
        } else {
          applySkin(defaultSkin())
        }
        startPolling()
      } catch (error: any) {
        pushToast('error', 'Ядро лаунчера недоступно', error?.message || 'Не удалось связаться с локальным ядром.')
      }
    })()
    try {
      await bootstrapPromise
    } finally {
      bootstrapPromise = null
    }
  }

  function dispose() {
    stopPolling()
  }

  async function login(login: string, password: string) {
    try {
      const response = await readJson<OperationResponse>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      applyState(response.state)
      pushToast(response.ok ? 'success' : 'error', response.ok ? 'Вход выполнен' : 'Ошибка входа', response.message || '')
      if (response.ok) {
        try {
          applySkin(await readJson<SkinState>('/api/skin'))
        } catch {
          applySkin(defaultSkin())
        }
      }
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка входа', error?.message || 'Не удалось войти.')
      return null
    }
  }

  async function logout() {
    try {
      const response = await readJson<OperationResponse>('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      applyState(response.state)
      applySkin(defaultSkin())
      pushToast('success', 'Сессия завершена', response.message || 'Вы вышли из аккаунта.')
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка выхода', error?.message || 'Не удалось выйти.')
      return null
    }
  }

  async function revokeOtherSessions() {
    try {
      const response = await readJson<OperationResponse>('/api/auth/revoke-other-sessions', { method: 'POST' })
      applyState(response.state)
      pushToast(response.ok ? 'success' : 'error', response.ok ? 'Сессии очищены' : 'Не удалось завершить другие сессии', response.message || '')
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка безопасности', error?.message || 'Не удалось завершить другие сессии.')
      return null
    }
  }

  async function play() {
    try {
      const response = await readJson<OperationResponse>('/api/actions/play', { method: 'POST' })
      applyState(response.state)
      if (!response.ok) {
        pushToast('error', 'Запуск не выполнен', response.message || 'Не удалось запустить Minecraft.')
      }
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка запуска', error?.message || 'Не удалось запустить Minecraft.')
      return null
    }
  }

  async function repair() {
    try {
      const response = await readJson<OperationResponse>('/api/actions/repair', { method: 'POST' })
      applyState(response.state)
      pushToast(response.ok ? 'success' : 'error', response.ok ? 'Клиент восстановлен' : 'Ремонт не выполнен', response.message || '')
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка ремонта', error?.message || 'Не удалось починить клиент.')
      return null
    }
  }

  async function clearDiagnostics() {
    try {
      const response = await readJson<OperationResponse>('/api/diagnostics/clear', { method: 'POST' })
      applyState(response.state)
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка диагностики', error?.message || 'Не удалось очистить диагностику.')
      return null
    }
  }

  async function uploadSkin(file: File, modelVariant: string) {
    const form = new FormData()
    form.append('file', file)
    form.append('model_variant', modelVariant)
    try {
      const response = await readJson<SkinOpResponse>('/api/skin', { method: 'POST', body: form })
      applySkin(response.skin)
      pushToast(response.ok ? 'success' : 'error', response.ok ? 'Скин сохранён' : 'Скин не сохранён', response.message || '')
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка скина', error?.message || 'Не удалось загрузить скин.')
      return null
    }
  }

  async function refreshSkin() {
    try {
      const response = await readJson<SkinState>('/api/skin')
      applySkin(response)
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка скина', error?.message || 'Не удалось загрузить данные скина.')
      return null
    }
  }

  async function deleteSkin() {
    try {
      const response = await readJson<SkinOpResponse>('/api/skin', { method: 'DELETE' })
      applySkin(response.skin)
      pushToast(response.ok ? 'success' : 'error', response.ok ? 'Скин удалён' : 'Не удалось удалить скин', response.message || '')
      return response
    } catch (error: any) {
      pushToast('error', 'Ошибка скина', error?.message || 'Не удалось удалить скин.')
      return null
    }
  }

  function openExternal(url: string) {
    const target = String(url || '').trim()
    if (!target) return
    const electronApi = (window as any)?.electronAPI
    if (electronApi?.openExternal) {
      electronApi.openExternal(target)
      return
    }
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  const accountNickname = computed(() => state.accountPrimaryText || 'Гость')
  const accountMeta = computed(() => {
    const raw = String(state.accountSecondaryText || '')
    const [login, email] = raw.split(' • ')
    return { login: login || '', email: email || '' }
  })

  return {
    initialized: computed(() => state.initialized),
    isBusy: computed(() => state.isBusy),
    isAuthenticated: computed(() => state.isAuthenticated),
    statusText: computed(() => state.statusText),
    launcherVersionText: computed(() => state.launcherVersionText),
    accountPrimaryText: computed(() => state.accountPrimaryText),
    accountSecondaryText: computed(() => state.accountSecondaryText),
    emailVerifiedText: computed(() => state.emailVerifiedText),
    currentMemoryMb: computed(() => state.currentMemoryMb),
    currentMemoryText: computed(() => state.currentMemoryText),
    logsDirectory: computed(() => state.logsDirectory),
    dataDirectory: computed(() => state.dataDirectory),
    gameDirectory: computed(() => state.gameDirectory),
    diagnosticsText: computed(() => state.diagnosticsText),
    progress: computed(() => state.progress),
    links: computed(() => state.links),
    security: computed(() => state.security),
    dashboard: computed(() => state.dashboard),
    nation: computed(() => state.dashboard.nation),
    nationStats: computed(() => state.dashboard.nationStats),
    playerStats: computed(() => state.dashboard.playerStats),
    recentActivity: computed(() => state.dashboard.recentActivity),
    walletBalance: computed(() => state.dashboard.walletBalance),
    skin: computed(() => skin),
    toasts: computed(() => toasts),
    accountNickname,
    accountMeta,
    initializeApp,
    dispose,
    login,
    logout,
    revokeOtherSessions,
    play,
    repair,
    clearDiagnostics,
    uploadSkin,
    refreshSkin,
    deleteSkin,
    dismissToast,
    openExternal,
  }
})
