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

interface LauncherRecentActivityItem {
  eventType: string
  message: string
  createdAt: string | null
}

interface LauncherDashboard {
  nation: LauncherNation
  nationStats: LauncherNationStats
  playerStats: LauncherPlayerStats
  recentActivity: LauncherRecentActivityItem[]
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
  dashboard: LauncherDashboard
}

interface OperationResponse {
  ok: boolean
  message: string
  pendingElectronExit?: boolean
  state: LauncherState
}

interface PlayerSkinState {
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

interface PlayerSkinOperationResponse {
  ok: boolean
  message: string
  skin: PlayerSkinState
}

interface CoreStatus {
  running: boolean
  lastOkAt: number | null
  lastError: string
}

interface ToastItem {
  id: string
  tone: ToastTone
  title: string
  message: string
}

const API_BASE = 'http://127.0.0.1:38765'

function createDefaultProgress(): LauncherProgress {
  return {
    visible: false,
    title: '',
    details: '',
    percent: 0,
  }
}

function createDefaultLinks(): LauncherLinks {
  return {
    registerUrl: '',
    forgotPasswordUrl: '',
    verifyEmailUrl: '',
  }
}

function createDefaultNation(): LauncherNation {
  return {
    id: '',
    slug: '',
    title: '',
    tag: '',
    accentColor: '',
    role: '',
    iconUrl: '',
    iconPreviewUrl: '',
    bannerUrl: '',
    bannerPreviewUrl: '',
    backgroundUrl: '',
    backgroundPreviewUrl: '',
    allianceTitle: '',
    allianceTag: '',
  }
}

function createDefaultNationStats(): LauncherNationStats {
  return {
    treasuryBalance: 0,
    territoryPoints: 0,
    totalPlaytimeMinutes: 0,
    pvpKills: 0,
    mobKills: 0,
    bossKills: 0,
    deaths: 0,
    blocksPlaced: 0,
    blocksBroken: 0,
    eventsCompleted: 0,
    prestigeScore: 0,
  }
}

function createDefaultPlayerStats(): LauncherPlayerStats {
  return {
    minecraftNickname: '',
    totalPlaytimeMinutes: 0,
    pvpKills: 0,
    mobKills: 0,
    deaths: 0,
    blocksPlaced: 0,
    blocksBroken: 0,
    currentBalance: 0,
    source: '',
    lastSeenAt: null,
    lastSyncedAt: null,
  }
}

function createDefaultDashboard(): LauncherDashboard {
  return {
    nation: createDefaultNation(),
    nationStats: createDefaultNationStats(),
    playerStats: createDefaultPlayerStats(),
    recentActivity: [],
    walletBalance: 0,
  }
}

function createDefaultState(): LauncherState {
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
    progress: createDefaultProgress(),
    links: createDefaultLinks(),
    dashboard: createDefaultDashboard(),
  }
}

function createDefaultSkin(): PlayerSkinState {
  return {
    hasSkin: false,
    modelVariant: 'classic',
    skinUrl: '',
    headPreviewUrl: '',
    bodyPreviewUrl: '',
    sha256: '',
    width: 0,
    height: 0,
    updatedAt: null,
  }
}

function createDefaultCoreStatus(): CoreStatus {
  return {
    running: false,
    lastOkAt: null,
    lastError: '',
  }
}

function createToastId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    cache: 'no-store',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return (await response.json()) as T
}

export const useLauncherStore = defineStore('launcher', () => {
  const state = reactive<LauncherState>(createDefaultState())
  const skin = reactive<PlayerSkinState>(createDefaultSkin())
  const coreStatus = reactive<CoreStatus>(createDefaultCoreStatus())
  const toasts = reactive<ToastItem[]>([])

  let bootstrapPromise: Promise<void> | null = null
  let statePollTimer: number | null = null
  let disposed = false
  let bootstrapping = false

  function pushToast(tone: ToastTone, title: string, message: string) {
    if (!message?.trim()) return

    const id = createToastId()
    toasts.push({ id, tone, title, message })

    window.setTimeout(() => {
      dismissToast(id)
    }, tone === 'error' ? 6500 : 4200)
  }

  function dismissToast(id: string) {
    const index = toasts.findIndex((item) => item.id === id)
    if (index >= 0) {
      toasts.splice(index, 1)
    }
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

    const nextProgress = next.progress ?? createDefaultProgress()
    state.progress = {
      visible: Boolean(nextProgress.visible),
      title: String(nextProgress.title ?? ''),
      details: String(nextProgress.details ?? ''),
      percent: Number(nextProgress.percent ?? 0),
    }

    const nextLinks = next.links ?? createDefaultLinks()
    state.links = {
      registerUrl: String(nextLinks.registerUrl ?? ''),
      forgotPasswordUrl: String(nextLinks.forgotPasswordUrl ?? ''),
      verifyEmailUrl: String(nextLinks.verifyEmailUrl ?? ''),
    }

    const nextDashboard = next.dashboard ?? createDefaultDashboard()
    state.dashboard = {
      nation: {
        ...createDefaultNation(),
        ...(nextDashboard.nation ?? {}),
      },
      nationStats: {
        ...createDefaultNationStats(),
        ...(nextDashboard.nationStats ?? {}),
      },
      playerStats: {
        ...createDefaultPlayerStats(),
        ...(nextDashboard.playerStats ?? {}),
      },
      recentActivity: Array.isArray(nextDashboard.recentActivity)
        ? nextDashboard.recentActivity.map((item) => ({
            eventType: String(item?.eventType ?? ''),
            message: String(item?.message ?? ''),
            createdAt: item?.createdAt ? String(item.createdAt) : null,
          }))
        : [],
      walletBalance: Number(nextDashboard.walletBalance ?? 0),
    }
  }

  function applySkin(next: Partial<PlayerSkinState> | null | undefined) {
    const safe = next ?? createDefaultSkin()
    skin.hasSkin = Boolean(safe.hasSkin)
    skin.modelVariant = String(safe.modelVariant ?? 'classic')
    skin.skinUrl = String(safe.skinUrl ?? '')
    skin.headPreviewUrl = String(safe.headPreviewUrl ?? '')
    skin.bodyPreviewUrl = String(safe.bodyPreviewUrl ?? '')
    skin.sha256 = String(safe.sha256 ?? '')
    skin.width = Number(safe.width ?? 0)
    skin.height = Number(safe.height ?? 0)
    skin.updatedAt = safe.updatedAt ? String(safe.updatedAt) : null
  }

  async function pollStateOnce() {
    try {
      const nextState = await apiGet<LauncherState>('/api/state')
      applyState(nextState)
      coreStatus.running = true
      coreStatus.lastOkAt = Date.now()
      coreStatus.lastError = ''
    } catch (error) {
      coreStatus.running = false
      coreStatus.lastError = error instanceof Error ? error.message : 'Core is unavailable'
    }
  }

  function startPolling() {
    stopPolling()
    statePollTimer = window.setInterval(() => {
      void pollStateOnce()
    }, 1000)
  }

  function stopPolling() {
    if (statePollTimer != null) {
      window.clearInterval(statePollTimer)
      statePollTimer = null
    }
  }

  async function initializeApp() {
    if (bootstrapPromise) {
      return bootstrapPromise
    }

    bootstrapping = true

    bootstrapPromise = (async () => {
      try {
        const response = await apiGet<OperationResponse>('/api/bootstrap')
        if (response?.state) {
          applyState(response.state)
        } else {
          await pollStateOnce()
        }

        coreStatus.running = true
        coreStatus.lastOkAt = Date.now()
        coreStatus.lastError = ''

        if (state.isAuthenticated) {
          try {
            const currentSkin = await apiGet<PlayerSkinState>('/api/skin')
            applySkin(currentSkin)
          } catch {
            applySkin(createDefaultSkin())
          }
        } else {
          applySkin(createDefaultSkin())
        }

        startPolling()
      } catch (error) {
        coreStatus.running = false
        coreStatus.lastError = error instanceof Error ? error.message : 'Core bootstrap failed'
        pushToast('error', 'Ядро лаунчера недоступно', 'Не удалось связаться с локальным ядром лаунчера.')
      } finally {
        bootstrapping = false
      }
    })()

    try {
      await bootstrapPromise
    } finally {
      bootstrapPromise = null
    }
  }

  function dispose() {
    disposed = true
    stopPolling()
  }

  async function login(login: string, password: string) {
    try {
      const response = await apiPostJson<OperationResponse>('/api/auth/login', {
        login,
        password,
      })

      applyState(response.state)
      coreStatus.running = true
      coreStatus.lastOkAt = Date.now()
      coreStatus.lastError = ''

      if (response.ok) {
        pushToast('success', 'Вход выполнен', response.message || 'Аккаунт готов к игре.')
        try {
          const currentSkin = await apiGet<PlayerSkinState>('/api/skin')
          applySkin(currentSkin)
        } catch {
          applySkin(createDefaultSkin())
        }
      } else {
        pushToast('error', 'Ошибка входа', response.message || 'Не удалось войти.')
      }

      return response
    } catch (error) {
      pushToast('error', 'Ошибка входа', error instanceof Error ? error.message : 'Не удалось войти.')
      return null
    }
  }

  async function logout() {
    try {
      const response = await apiPostJson<OperationResponse>('/api/auth/logout', {})
      applyState(response.state)
      applySkin(createDefaultSkin())
      pushToast('success', 'Сессия завершена', response.message || 'Вы вышли из аккаунта.')
      return response
    } catch (error) {
      pushToast('error', 'Ошибка выхода', error instanceof Error ? error.message : 'Не удалось выйти.')
      return null
    }
  }

  async function play() {
    try {
      const response = await apiPostJson<OperationResponse>('/api/actions/play', {})
      applyState(response.state)
      if (!response.ok) {
        pushToast('error', 'Запуск не выполнен', response.message || 'Не удалось запустить Minecraft.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка запуска', error instanceof Error ? error.message : 'Не удалось запустить Minecraft.')
      return null
    }
  }

  async function repair() {
    try {
      const response = await apiPostJson<OperationResponse>('/api/actions/repair', {})
      applyState(response.state)
      if (response.ok) {
        pushToast('success', 'Ремонт завершён', response.message || 'Клиент очищен и готов к пересинхронизации.')
      } else {
        pushToast('error', 'Ремонт не выполнен', response.message || 'Не удалось выполнить ремонт клиента.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка ремонта', error instanceof Error ? error.message : 'Не удалось выполнить ремонт клиента.')
      return null
    }
  }

  async function saveMemory(maxRamMb: number) {
    try {
      const response = await apiPostJson<OperationResponse>('/api/settings', {
        maxRamMb,
      })
      applyState(response.state)
      if (response.ok) {
        pushToast('success', 'Настройки сохранены', response.message || 'Память обновлена.')
      } else {
        pushToast('error', 'Не удалось сохранить', response.message || 'Параметры не сохранены.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка сохранения', error instanceof Error ? error.message : 'Не удалось сохранить настройки.')
      return null
    }
  }

  async function resetSettings() {
    try {
      const response = await apiPostJson<OperationResponse>('/api/settings/reset', {})
      applyState(response.state)
      if (response.ok) {
        pushToast('success', 'Настройки сброшены', response.message || 'Параметры возвращены к значениям по умолчанию.')
      } else {
        pushToast('error', 'Не удалось сбросить', response.message || 'Сброс параметров не выполнен.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка сброса', error instanceof Error ? error.message : 'Не удалось сбросить настройки.')
      return null
    }
  }

  async function clearDiagnostics() {
    try {
      const response = await apiPostJson<OperationResponse>('/api/diagnostics/clear', {})
      applyState(response.state)
      return response
    } catch (error) {
      pushToast('error', 'Ошибка диагностики', error instanceof Error ? error.message : 'Не удалось очистить диагностику.')
      return null
    }
  }

  async function refreshSkin() {
    try {
      const currentSkin = await apiGet<PlayerSkinState>('/api/skin')
      applySkin(currentSkin)
      return currentSkin
    } catch (error) {
      pushToast('error', 'Ошибка загрузки скина', error instanceof Error ? error.message : 'Не удалось загрузить данные скина.')
      return null
    }
  }

  async function uploadSkin(file: File, modelVariant: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model_variant', modelVariant)

    try {
      const response = await apiPostForm<PlayerSkinOperationResponse>('/api/skin', formData)
      applySkin(response.skin)
      if (response.ok) {
        pushToast('success', 'Скин сохранён', response.message || 'Новый скин успешно загружен.')
      } else {
        pushToast('error', 'Не удалось загрузить скин', response.message || 'Скин не был сохранён.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка загрузки скина', error instanceof Error ? error.message : 'Не удалось отправить файл скина.')
      return null
    }
  }

  async function deleteSkin() {
    try {
      const response = await apiDelete<PlayerSkinOperationResponse>('/api/skin')
      applySkin(response.skin)
      if (response.ok) {
        pushToast('success', 'Скин удалён', response.message || 'Скин удалён.')
      } else {
        pushToast('error', 'Не удалось удалить скин', response.message || 'Скин не был удалён.')
      }
      return response
    } catch (error) {
      pushToast('error', 'Ошибка удаления скина', error instanceof Error ? error.message : 'Не удалось удалить скин.')
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

  const shouldShowProgress = computed(() => {
    return Boolean(state.progress.visible || state.isBusy || bootstrapping)
  })

  const accountNickname = computed(() => state.accountPrimaryText || 'Гость')

  const accountMeta = computed(() => {
    const raw = String(state.accountSecondaryText || '')
    const [login, email] = raw.split(' • ')
    return {
      login: login || '',
      email: email || '',
    }
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
    dashboard: computed(() => state.dashboard),

    nation: computed(() => state.dashboard.nation),
    nationStats: computed(() => state.dashboard.nationStats),
    playerStats: computed(() => state.dashboard.playerStats),
    recentActivity: computed(() => state.dashboard.recentActivity),
    walletBalance: computed(() => state.dashboard.walletBalance),

    skin: computed(() => skin),
    coreStatus: computed(() => coreStatus),
    toasts: computed(() => toasts),
    shouldShowProgress,
    accountNickname,
    accountMeta,

    initializeApp,
    dispose,
    login,
    logout,
    play,
    repair,
    saveMemory,
    resetSettings,
    clearDiagnostics,
    refreshSkin,
    uploadSkin,
    deleteSkin,
    dismissToast,
    openExternal,
  }
})