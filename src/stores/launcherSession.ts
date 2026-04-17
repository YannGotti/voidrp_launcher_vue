import { defineStore } from 'pinia'
import type { CoreStatus, LauncherState, UpdaterStatus } from '../types'
import { createDefaultCoreStatus, createDefaultUpdaterStatus } from '../types'

const STORAGE_KEY = 'voidrp.launcher.session.v5'

type PersistedState = {
  rememberedLogin: string
  lastState: LauncherState | null
  shellUpdater: UpdaterStatus
  coreStatus: CoreStatus
}

function createDefaults(): PersistedState {
  return {
    rememberedLogin: '',
    lastState: null,
    shellUpdater: createDefaultUpdaterStatus(),
    coreStatus: createDefaultCoreStatus()
  }
}

function loadState(): PersistedState {
  if (typeof window === 'undefined') {
    return createDefaults()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createDefaults()
    }

    const parsed = JSON.parse(raw)

    return {
      rememberedLogin: typeof parsed.rememberedLogin === 'string' ? parsed.rememberedLogin : '',
      lastState: parsed.lastState ?? null,
      shellUpdater: parsed.shellUpdater ?? createDefaultUpdaterStatus(),
      coreStatus: parsed.coreStatus ?? createDefaultCoreStatus()
    }
  } catch {
    return createDefaults()
  }
}

function persistState(state: PersistedState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useLauncherSessionStore = defineStore('launcherSession', {
  state: (): PersistedState => loadState(),
  actions: {
    setRememberedLogin(value: string) {
      this.rememberedLogin = value
      persistState(this.$state)
    },
    setLastState(value: LauncherState | null) {
      this.lastState = value
      persistState(this.$state)
    },
    setShellUpdater(value: UpdaterStatus) {
      this.shellUpdater = value
      persistState(this.$state)
    },
    setCoreStatus(value: CoreStatus) {
      this.coreStatus = value
      persistState(this.$state)
    }
  }
})