import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useLauncherSessionStore } from './launcherSession'
import type { CoreStatus, LauncherLinks, LauncherState, OperationResponse, UpdaterStatus } from '../types'
import { createDefaultCoreStatus, createDefaultUpdaterStatus } from '../types'

type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface LauncherToast {
  id: number
  tone: ToastTone
  title: string
  message: string
}

function parseAccountSecondary(raw?: string) {
  const source = (raw || '').trim()
  const parts = source.split('•').map((part) => part.trim()).filter(Boolean)

  return {
    login: parts[0] || '',
    email: parts[1] || ''
  }
}

function getToastTitle(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return 'Готово'
    case 'warning':
      return 'Внимание'
    case 'error':
      return 'Ошибка'
    default:
      return 'Уведомление'
  }
}

export const useLauncherStore = defineStore('launcher', () => {
  const session = useLauncherSessionStore()

  const state = ref<LauncherState | null>(session.lastState)
  const shellUpdater = ref<UpdaterStatus>(session.shellUpdater ?? createDefaultUpdaterStatus())
  const coreStatus = ref<CoreStatus>(session.coreStatus ?? createDefaultCoreStatus())

  const bootstrapFailed = ref(false)
  const started = ref(false)
  const toasts = ref<LauncherToast[]>([])

  let pollTimer: number | null = null
  let detachUpdaterListener: (() => void) | null = null
  let detachCoreListener: (() => void) | null = null
  let toastIdCounter = 0

  const isAuthenticated = computed(() => state.value?.isAuthenticated === true)
  const isBusy = computed(() => state.value?.isBusy === true)

  const launcherVersionText = computed(() => state.value?.launcherVersionText || '0.0.0')
  const statusText = computed(() => state.value?.statusText || 'Подготавливаем лаунчер...')
  const progress = computed(() => state.value?.progress ?? {
    visible: false,
    title: '',
    details: '',
    percent: 0
  })

  const shouldShowProgress = computed(() => {
    if (isBusy.value) return true
    if (!progress.value.visible) return false
    if (progress.value.percent >= 100) return false
    return true
  })

  const links = computed<LauncherLinks>(() => state.value?.links ?? {
    registerUrl: '',
    forgotPasswordUrl: '',
    verifyEmailUrl: ''
  })

  const accountNickname = computed(() => state.value?.accountPrimaryText || 'Игрок')
  const accountMeta = computed(() => parseAccountSecondary(state.value?.accountSecondaryText))
  const emailVerifiedText = computed(() => state.value?.emailVerifiedText || 'Статус почты неизвестен')
  const currentMemoryMb = computed(() => state.value?.currentMemoryMb ?? 4096)
  const currentMemoryText = computed(() => state.value?.currentMemoryText || '4.0 GB')
  const logsDirectory = computed(() => state.value?.logsDirectory || '')
  const dataDirectory = computed(() => state.value?.dataDirectory || '')
  const gameDirectory = computed(() => state.value?.gameDirectory || '')
  const diagnosticsText = computed(() => state.value?.diagnosticsText || '')

  function syncSessionState() {
    session.setLastState(state.value)
    session.setShellUpdater(shellUpdater.value)
    session.setCoreStatus(coreStatus.value)
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function pushToast(message = '', tone: ToastTone = 'info', title?: string) {
    const normalized = message.trim()
    if (!normalized) return

    const toast: LauncherToast = {
      id: ++toastIdCounter,
      tone,
      title: title || getToastTitle(tone),
      message: normalized
    }

    toasts.value = [...toasts.value, toast]

    const timeoutMs = tone === 'error' ? 5200 : tone === 'warning' ? 4200 : 3200
    window.setTimeout(() => dismissToast(toast.id), timeoutMs)
  }

  async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    if (!window.desktop) throw new Error('Не найден bridge Electron.')
    return window.desktop.request<T>(method, path, body)
  }

  function applyResponse(response: OperationResponse, tone: ToastTone = 'info') {
    state.value = response.state
    bootstrapFailed.value = false
    syncSessionState()

    if (response.message) pushToast(response.message, tone)
  }

  async function refreshState() {
    try {
      state.value = await request<LauncherState>('GET', '/api/state')
      syncSessionState()
    } catch {
      // silent
    }
  }

  async function bootstrap() {
    try {
      const response = await request<OperationResponse>('GET', '/api/bootstrap')
      state.value = response.state
      bootstrapFailed.value = false
      syncSessionState()
    } catch (error) {
      bootstrapFailed.value = true
      pushToast(error instanceof Error ? error.message : 'Не удалось запустить лаунчер.', 'error', 'Ошибка запуска')
    }
  }

  function bindDesktopListeners() {
    if (!window.desktop) return

    if (!detachUpdaterListener) {
      detachUpdaterListener = window.desktop.onUpdaterStatus((status) => {
        shellUpdater.value = status
        session.setShellUpdater(status)
      })
    }

    if (!detachCoreListener) {
      detachCoreListener = window.desktop.onCoreStatus((status) => {
        coreStatus.value = status
        session.setCoreStatus(status)
      })
    }
  }

  function startPolling() {
    if (pollTimer !== null) return
    pollTimer = window.setInterval(() => void refreshState(), 1500)
  }

  function stopPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  async function initializeApp() {
    if (started.value) return
    started.value = true

    try {
      if (!window.desktop) {
        bootstrapFailed.value = true
        pushToast('Не найден bridge Electron.', 'error', 'Ошибка запуска')
        return
      }

      coreStatus.value = await window.desktop.getCoreStatus()
      session.setCoreStatus(coreStatus.value)

      bindDesktopListeners()
      await bootstrap()
      startPolling()
    } catch (error) {
      bootstrapFailed.value = true
      pushToast(error instanceof Error ? error.message : 'Не удалось инициализировать лаунчер.', 'error', 'Ошибка запуска')
    }
  }

  async function runOperation(method: string, path: string, body?: unknown, successTone: ToastTone = 'success') {
    try {
      const response = await request<OperationResponse>(method, path, body)
      applyResponse(response, response.ok ? successTone : 'error')
      return response
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Операция завершилась с ошибкой.', 'error', 'Ошибка операции')
      return null
    }
  }

  async function login(loginValue: string, password: string) {
    const trimmed = loginValue.trim()
    session.setRememberedLogin(trimmed)
    return runOperation('POST', '/api/auth/login', { login: trimmed, password }, 'success')
  }

  async function logout() {
    return runOperation('POST', '/api/auth/logout', undefined, 'success')
  }

  async function play() {
    return runOperation('POST', '/api/actions/play', undefined, 'success')
  }

  async function repair() {
    return runOperation('POST', '/api/actions/repair', undefined, 'warning')
  }

  async function saveMemory(memoryMb: number) {
    return runOperation('POST', '/api/settings', { maxRamMb: memoryMb }, 'success')
  }

  async function resetMemory() {
    return runOperation('POST', '/api/settings/reset', undefined, 'success')
  }

  async function clearDiagnostics() {
    return runOperation('POST', '/api/diagnostics/clear', undefined, 'info')
  }

  async function checkShellUpdates() {
    if (!window.desktop) {
      pushToast('Не найден bridge Electron.', 'error', 'Ошибка запуска')
      return
    }

    try {
      const result = await window.desktop.checkForShellUpdates()
      pushToast(result.message || 'Проверка обновлений завершена.', result.ok ? 'info' : 'warning', 'Обновления')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Не удалось проверить обновления оболочки.', 'error', 'Обновления')
    }
  }

  async function installShellUpdate() {
    if (!window.desktop) {
      pushToast('Не найден bridge Electron.', 'error', 'Ошибка запуска')
      return
    }

    try {
      const result = await window.desktop.downloadAndInstallShellUpdate()
      pushToast(result.message || 'Запущена установка обновления.', result.ok ? 'success' : 'warning', 'Обновления')
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Не удалось установить обновление оболочки.', 'error', 'Обновления')
    }
  }

  async function openExternal(url?: string) {
    if (!url || !window.desktop) return
    await window.desktop.openExternal(url)
  }

  async function openPath(targetPath?: string) {
    if (!targetPath || !window.desktop) return
    await window.desktop.openPath(targetPath)
  }

  function dispose() {
    stopPolling()
    detachUpdaterListener?.()
    detachCoreListener?.()
    detachUpdaterListener = null
    detachCoreListener = null
    started.value = false
  }

  return {
    state,
    shellUpdater,
    coreStatus,
    bootstrapFailed,
    toasts,
    dismissToast,
    pushToast,
    isAuthenticated,
    isBusy,
    launcherVersionText,
    statusText,
    progress,
    shouldShowProgress,
    links,
    accountNickname,
    accountMeta,
    emailVerifiedText,
    currentMemoryMb,
    currentMemoryText,
    logsDirectory,
    dataDirectory,
    gameDirectory,
    diagnosticsText,
    initializeApp,
    dispose,
    login,
    logout,
    play,
    repair,
    saveMemory,
    resetMemory,
    clearDiagnostics,
    checkShellUpdates,
    installShellUpdate,
    openExternal,
    openPath
  }
})
