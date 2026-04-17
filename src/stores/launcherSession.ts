import { defineStore } from 'pinia';
import {
  createDefaultCoreStatus,
  createDefaultUpdaterStatus,
  type CoreStatus,
  type LauncherSection,
  type LauncherState,
  type UpdaterStatus
} from '../types';

interface LauncherSessionState {
  rememberedLogin: string;
  lastState: LauncherState | null;
  shellUpdater: UpdaterStatus;
  coreStatus: CoreStatus;
  activeSection: LauncherSection;
}

const STORAGE_KEY = 'voidrp.launcher.session.v4';

function sanitizeSection(value: unknown): LauncherSection {
  return value === 'account' || value === 'service' ? value : 'launch';
}

function createDefaultState(): LauncherSessionState {
  return {
    rememberedLogin: '',
    lastState: null,
    shellUpdater: createDefaultUpdaterStatus(),
    coreStatus: createDefaultCoreStatus(),
    activeSection: 'launch'
  };
}

function loadState(): LauncherSessionState {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultState();
    }

    const parsed = JSON.parse(raw) as Partial<LauncherSessionState>;
    return {
      rememberedLogin: typeof parsed.rememberedLogin === 'string' ? parsed.rememberedLogin : '',
      lastState: parsed.lastState ?? null,
      shellUpdater: parsed.shellUpdater ?? createDefaultUpdaterStatus(),
      coreStatus: parsed.coreStatus ?? createDefaultCoreStatus(),
      activeSection: sanitizeSection(parsed.activeSection)
    };
  } catch {
    return createDefaultState();
  }
}

function persistState(state: LauncherSessionState) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useLauncherSessionStore = defineStore('launcherSession', {
  state: (): LauncherSessionState => loadState(),
  actions: {
    setRememberedLogin(value: string) {
      this.rememberedLogin = value;
      persistState(this.$state);
    },
    setLastState(value: LauncherState | null) {
      this.lastState = value;
      persistState(this.$state);
    },
    setShellUpdater(value: UpdaterStatus) {
      this.shellUpdater = value;
      persistState(this.$state);
    },
    setCoreStatus(value: CoreStatus) {
      this.coreStatus = value;
      persistState(this.$state);
    },
    setActiveSection(value: LauncherSection) {
      this.activeSection = value;
      persistState(this.$state);
    }
  }
});
