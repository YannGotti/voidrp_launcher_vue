export interface LauncherProgress {
  visible: boolean
  title: string
  details: string
  percent: number
}

export interface LauncherLinks {
  registerUrl: string
  forgotPasswordUrl: string
  verifyEmailUrl: string
}

export interface LauncherDashboardNation {
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

export interface LauncherDashboardNationStats {
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

export interface LauncherDashboardPlayerStats {
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

export interface LauncherDashboardActivity {
  eventType: string
  message: string
  createdAt: string | null
}

export interface LauncherDashboard {
  nation: LauncherDashboardNation
  nationStats: LauncherDashboardNationStats
  playerStats: LauncherDashboardPlayerStats
  recentActivity: LauncherDashboardActivity[]
  walletBalance: number
}

export interface LauncherState {
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

export interface OperationResponse {
  ok: boolean
  message: string
  pendingElectronExit: boolean
  state: LauncherState
}

export interface UpdaterStatus {
  available: boolean
  downloading: boolean
  downloaded: boolean
  progressPercent: number
  message: string
}

export interface CoreStatus {
  kind?: string
  running: boolean
  baseUrl: string
  executablePath?: string
  lastError?: string
  message?: string
}

export interface DesktopBridge {
  request<T = unknown>(method: string, path: string, body?: unknown): Promise<T>
  getCoreStatus(): Promise<CoreStatus>
  onUpdaterStatus(callback: (payload: UpdaterStatus) => void): () => void
  onCoreStatus(callback: (payload: CoreStatus) => void): () => void
  checkForShellUpdates(): Promise<{ ok: boolean; message: string }>
  downloadAndInstallShellUpdate(): Promise<{ ok: boolean; message: string }>
  openExternal(url?: string): Promise<boolean>
  openPath(targetPath?: string): Promise<string>
}

export function createDefaultUpdaterStatus(): UpdaterStatus {
  return {
    available: false,
    downloading: false,
    downloaded: false,
    progressPercent: 0,
    message: 'Проверка обновлений оболочки ещё не выполнялась.'
  }
}

export function createDefaultCoreStatus(): CoreStatus {
  return {
    running: false,
    baseUrl: 'http://127.0.0.1:38765',
    message: 'Ядро ещё не запускалось.'
  }
}

export function createDefaultDashboard(): LauncherDashboard {
  return {
    nation: {
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
      allianceTag: ''
    },
    nationStats: {
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
      prestigeScore: 0
    },
    playerStats: {
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
      lastSyncedAt: null
    },
    recentActivity: [],
    walletBalance: 0
  }
}

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}
