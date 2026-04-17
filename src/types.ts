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
  kind: string
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
    kind: 'embedded-dotnet',
    running: false,
    baseUrl: 'http://127.0.0.1:38765',
    message: 'Локальное ядро ещё не запускалось.'
  }
}

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}