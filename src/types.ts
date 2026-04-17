export type LauncherSection = 'play' | 'account' | 'service';

export interface LauncherProgress {
  visible: boolean;
  title: string;
  details: string;
  percent: number;
}

export interface LauncherLinks {
  registerUrl: string;
  forgotPasswordUrl: string;
  verifyEmailUrl: string;
}

export interface LauncherState {
  initialized: boolean;
  isBusy: boolean;
  isAuthenticated: boolean;
  statusText: string;
  launcherVersionText: string;
  accountPrimaryText: string;
  accountSecondaryText: string;
  emailVerifiedText: string;
  currentMemoryMb: number;
  currentMemoryText: string;
  logsDirectory: string;
  dataDirectory: string;
  gameDirectory: string;
  diagnosticsText: string;
  progress: LauncherProgress;
  links: LauncherLinks;
}

export interface OperationResponse {
  ok: boolean;
  message: string;
  pendingElectronExit: boolean;
  state: LauncherState;
}

export interface UpdaterStatus {
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progressPercent: number;
  message: string;
  error?: string;
}

export interface CoreStatus {
  kind: string;
  running: boolean;
  baseUrl: string;
  pid?: number;
  message?: string;
}

export interface DesktopApi {
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
  openExternal(url: string): Promise<{ ok: true }>;
  openPath(path: string): Promise<{ ok: true }>;
  checkForShellUpdates(): Promise<{ ok: boolean; message: string }>;
  downloadAndInstallShellUpdate(): Promise<{ ok: boolean; message: string }>;
  getUpdaterStatus(): Promise<UpdaterStatus>;
  getCoreStatus(): Promise<CoreStatus>;
  onUpdaterStatus(callback: (status: UpdaterStatus) => void): () => void;
  onCoreStatus(callback: (status: CoreStatus) => void): () => void;
}

export function createDefaultLauncherProgress(): LauncherProgress {
  return {
    visible: false,
    title: '',
    details: '',
    percent: 0
  };
}

export function createDefaultLauncherLinks(): LauncherLinks {
  return {
    registerUrl: '',
    forgotPasswordUrl: '',
    verifyEmailUrl: ''
  };
}

export function createDefaultLauncherState(): LauncherState {
  return {
    initialized: false,
    isBusy: false,
    isAuthenticated: false,
    statusText: 'Инициализация лаунчера...',
    launcherVersionText: '—',
    accountPrimaryText: '',
    accountSecondaryText: '',
    emailVerifiedText: '',
    currentMemoryMb: 4096,
    currentMemoryText: '4.0 GB',
    logsDirectory: '',
    dataDirectory: '',
    gameDirectory: '',
    diagnosticsText: '',
    progress: createDefaultLauncherProgress(),
    links: createDefaultLauncherLinks()
  };
}

export function createDefaultUpdaterStatus(): UpdaterStatus {
  return {
    available: false,
    downloading: false,
    downloaded: false,
    progressPercent: 0,
    message: 'Обновления оболочки не проверялись.'
  };
}

export function createDefaultCoreStatus(): CoreStatus {
  return {
    kind: 'embedded-dotnet',
    running: false,
    baseUrl: 'http://127.0.0.1:38765',
    message: 'Ядро ещё не запускалось.'
  };
}
